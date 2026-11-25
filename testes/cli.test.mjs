import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(RAIZ, 'bin', 'ux-review.mjs');
const VERSAO = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

function cli(args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { codigo: r.status, saida: r.stdout + r.stderr };
}

function comDestino(fn) {
  const destino = mkdtempSync(path.join(os.tmpdir(), 'uxr-cli-'));
  try { return fn(destino); } finally { rmSync(destino, { recursive: true, force: true }); }
}

test('versao e ajuda', () => {
  assert.equal(cli(['versao']).saida.trim(), VERSAO);
  assert.match(cli(['ajuda']).saida, /instalar/);
  assert.equal(cli(['nao-existe']).codigo, 2);
});

test('instalar sem dependências preenche o caminho e grava a versão', () => comDestino((destino) => {
  const r = cli(['instalar', '--destino', destino, '--sem-dependencias']);
  assert.equal(r.codigo, 0, r.saida);
  const agente = readFileSync(path.join(destino, 'agents', 'ux-review.md'), 'utf8');
  assert.ok(!agente.includes('{{UX_REVIEW_DIR}}'));
  assert.ok(agente.includes(path.join(destino, 'ux-review').replace(/\\/g, '/')));
  assert.equal(JSON.parse(readFileSync(path.join(destino, 'ux-review', '.versao'), 'utf8')).versao, VERSAO);
  assert.ok(existsSync(path.join(destino, 'ux-review', '.npmrc')));
  assert.ok(existsSync(path.join(destino, 'ux-review', 'guardas', 'somente-leitura.mjs')));
}));

test('reinstalar remove arquivo velho e mantém node_modules', () => comDestino((destino) => {
  cli(['instalar', '--destino', destino, '--sem-dependencias']);
  const apoio = path.join(destino, 'ux-review');
  writeFileSync(path.join(apoio, 'modos', 'velho.md'), 'x');
  mkdirSync(path.join(apoio, 'node_modules', 'marca'), { recursive: true });
  cli(['instalar', '--destino', destino, '--sem-dependencias']);
  assert.ok(!existsSync(path.join(apoio, 'modos', 'velho.md')));
  assert.ok(existsSync(path.join(apoio, 'node_modules', 'marca')));
}));

test('verificar acusa falha sem as dependências', () => comDestino((destino) => {
  cli(['instalar', '--destino', destino, '--sem-dependencias']);
  const r = cli(['verificar', '--destino', destino, '--json']);
  assert.equal(r.codigo, 1);
  const itens = JSON.parse(r.saida).itens;
  assert.ok(itens.some((i) => i.estado === 'falha' && /playwright/i.test(i.item)));
  assert.ok(itens.some((i) => i.item === 'Agente' && i.estado === 'ok'));
}));

test('desinstalar só remove com --confirmar e preserva a memória', () => comDestino((destino) => {
  cli(['instalar', '--destino', destino, '--sem-dependencias']);
  const memoria = path.join(destino, 'agent-memory', 'ux-review');
  mkdirSync(memoria, { recursive: true });
  writeFileSync(path.join(memoria, 'MEMORY.md'), '- nota');

  const previa = cli(['desinstalar', '--destino', destino]);
  assert.match(previa.saida, /Seria removido/);
  assert.ok(existsSync(path.join(destino, 'agents', 'ux-review.md')));

  assert.equal(cli(['desinstalar', '--destino', destino, '--confirmar']).codigo, 0);
  assert.ok(!existsSync(path.join(destino, 'agents', 'ux-review.md')));
  assert.ok(!existsSync(path.join(destino, 'ux-review')));
  assert.ok(existsSync(path.join(memoria, 'MEMORY.md')));
}));

test('desinstalar recusa pasta ux-review que não é do pacote', () => comDestino((destino) => {
  mkdirSync(path.join(destino, 'ux-review'), { recursive: true });
  writeFileSync(path.join(destino, 'ux-review', 'meu-arquivo.txt'), 'x');
  const r = cli(['desinstalar', '--destino', destino, '--confirmar']);
  assert.equal(r.codigo, 1);
  assert.ok(existsSync(path.join(destino, 'ux-review', 'meu-arquivo.txt')));
}));

// Pelo npx, o pacote fica dentro de um node_modules. A instalação precisa
// copiar tudo mesmo assim (regressão encontrada testando o pacote empacotado).
test('instala a partir do pacote empacotado, como o npx faz', () => comDestino((destino) => {
  // Monta o pacote com exatamente os arquivos que o npm pack incluiria.
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: RAIZ, encoding: 'utf8', shell: process.platform === 'win32' });
  assert.equal(pack.status, 0, pack.stderr);
  const arquivos = JSON.parse(pack.stdout)[0].files.map((f) => f.path);
  assert.ok(!arquivos.some((f) => f.startsWith('banco-de-provas/') || f.startsWith('testes/')), 'pacote leva arquivos de desenvolvimento');
  const dentro = path.join(destino, 'cache', 'node_modules', '@railson-is', 'ux-review');
  for (const f of arquivos) {
    mkdirSync(path.dirname(path.join(dentro, f)), { recursive: true });
    copyFileSync(path.join(RAIZ, f), path.join(dentro, f));
  }
  const alvo = path.join(destino, 'claude');
  const r = spawnSync(process.execPath, [path.join(dentro, 'bin', 'ux-review.mjs'), 'instalar', '--destino', alvo, '--sem-dependencias'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of ['package.json', 'package-lock.json', '.npmrc', 'scripts/verificar.mjs', 'scripts/medidas.mjs', 'guardas/somente-leitura.mjs']) {
    assert.ok(existsSync(path.join(alvo, 'ux-review', f)), `faltou ${f}`);
  }
}));

test('config mostra credencial só como definida', () => {
  const r = cli(['config'], { UXR_SENHA: 'segredo-de-teste', UXR_LARGURAS: '360,1440' });
  assert.equal(r.codigo, 0, r.saida);
  assert.ok(!r.saida.includes('segredo-de-teste'));
  assert.match(r.saida, /UXR_SENHA\s+definida/);
  assert.match(r.saida, /UXR_LARGURAS\s+360,1440/);
});
