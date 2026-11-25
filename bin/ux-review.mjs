#!/usr/bin/env node
// CLI do ux-review. Os processos de administração (instalar, verificar,
// desinstalar, ver a configuração) moram no mesmo código e na mesma versão
// do agente (fator XII dos 12 fatores).
//
//   npx github:railson-is/ux-review instalar [--destino <pasta>] [--sem-dependencias]
//   npx github:railson-is/ux-review verificar [--destino <pasta>] [--json]
//   npx github:railson-is/ux-review desinstalar [--destino <pasta>] [--apagar-memoria] [--confirmar]
//   npx github:railson-is/ux-review config
//   npx github:railson-is/ux-review versao
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACOTE = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
const NODE_MINIMO = 22;

const AJUDA = `ux-review ${PACOTE.version}

Uso: ux-review <comando> [opções]

Comandos:
  instalar      Copia o agente e a pasta de apoio para o Claude Code e instala axe-core, Playwright e Chromium.
  verificar     Diagnostica a instalação (Node, dependências, Chromium, agente, configuração, gh).
  desinstalar   Remove o agente e a pasta de apoio. A memória do agente fica, a menos que use --apagar-memoria.
  config        Mostra a configuração lida do ambiente (variáveis UXR_*), sem valores de credencial.
  versao        Mostra a versão.
  ajuda         Mostra esta ajuda.

Opções:
  --destino <pasta>     Pasta de configuração do Claude Code. Padrão: CLAUDE_CONFIG_DIR ou ~/.claude
  --sem-dependencias    (instalar) Não roda npm ci nem baixa o Chromium.
  --json                (verificar) Saída em JSON.
  --apagar-memoria      (desinstalar) Também apaga agent-memory/ux-review.
  --confirmar           (desinstalar) Sem ela, só mostra o que seria removido.`;

function argumentos(argv) {
  const pos = [];
  const op = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const [chave, valorInline] = a.slice(2).split('=');
    if (valorInline !== undefined) op[chave] = valorInline;
    else if (chave === 'destino') op.destino = argv[++i];
    else op[chave] = true;
  }
  return { pos, op };
}

function destinos(op) {
  const base = path.resolve(op.destino || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
  return {
    base,
    apoio: path.join(base, 'ux-review'),
    agente: path.join(base, 'agents', 'ux-review.md'),
    memoria: path.join(base, 'agent-memory', 'ux-review'),
  };
}

function exigirNode() {
  const maior = Number(process.versions.node.split('.')[0]);
  if (maior < NODE_MINIMO) {
    console.error(`Node.js ${process.versions.node} encontrado; o ux-review precisa de ${NODE_MINIMO} ou mais novo.`);
    process.exit(1);
  }
}

// O registro vem do .npmrc da pasta de apoio. Uma variável npm_config_registry
// herdada (do npx ou do ambiente) passaria por cima dele, então sai do ambiente filho.
function ambienteNpm() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^npm_config_registry$/i.test(k)) delete env[k];
  return env;
}

function rodar(comando, args, cwd, usarShell = false) {
  const r = spawnSync(comando, args, { cwd, stdio: 'inherit', env: ambienteNpm(), shell: usarShell });
  if (r.status !== 0) {
    console.error(`Falhou: ${comando} ${args.join(' ')} (código ${r.status ?? r.error?.code})`);
    process.exit(1);
  }
}

function instalar(op) {
  exigirNode();
  const d = destinos(op);
  mkdirSync(path.dirname(d.agente), { recursive: true });
  mkdirSync(d.apoio, { recursive: true });

  // Atualiza a pasta de apoio sem apagar node_modules (o npm ci decide se reinstala).
  for (const nome of readdirSync(d.apoio)) {
    if (nome !== 'node_modules') rmSync(path.join(d.apoio, nome), { recursive: true, force: true });
  }
  // O filtro olha o caminho relativo: rodando pelo npx, o próprio pacote mora
  // dentro de um node_modules, e o caminho absoluto sempre conteria esse nome.
  const origemApoio = path.join(RAIZ, 'suporte');
  cpSync(origemApoio, d.apoio, {
    recursive: true,
    filter: (origem) => !path.relative(origemApoio, origem).split(path.sep).includes('node_modules'),
  });

  // O npm nunca inclui .npmrc no pacote publicado ou baixado pelo npx, então
  // ele é gerado aqui. Fixa o registro público para a instalação das dependências.
  writeFileSync(path.join(d.apoio, '.npmrc'), 'registry=https://registry.npmjs.org/\n', 'utf8');

  const caminho = d.apoio.replace(/\\/g, '/');
  const agente = readFileSync(path.join(RAIZ, 'agents', 'ux-review.md'), 'utf8').replaceAll('{{UX_REVIEW_DIR}}', caminho);
  writeFileSync(d.agente, agente, 'utf8');
  writeFileSync(path.join(d.apoio, '.versao'), JSON.stringify({ versao: PACOTE.version, instaladoEm: new Date().toISOString() }, null, 2) + '\n', 'utf8');

  console.log(`Agente: ${d.agente}`);
  console.log(`Apoio:  ${d.apoio}`);
  console.log(`Versão: ${PACOTE.version}`);

  if (op['sem-dependencias']) {
    console.log(`Dependências não instaladas (--sem-dependencias). Depois rode: cd "${d.apoio}" && npm ci && node node_modules/playwright/cli.js install chromium`);
  } else {
    console.log('Instalando axe-core e Playwright pelo npm...');
    rodar('npm', ['ci', '--no-audit', '--no-fund'], d.apoio, process.platform === 'win32');
    console.log('Instalando o Chromium do Playwright...');
    rodar(process.execPath, [path.join(d.apoio, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium'], d.apoio);
  }
  console.log('\nPronto. Confira com "ux-review verificar" e abra uma nova sessão do Claude Code para o agente aparecer.');
}

function verificar(op) {
  const d = destinos(op);
  const script = path.join(d.apoio, 'scripts', 'verificar.mjs');
  if (!existsSync(script)) {
    console.error(`ux-review não está instalado em ${d.base}. Rode "ux-review instalar".`);
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [script, ...(op.json ? ['--json'] : [])], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

function desinstalar(op) {
  const d = destinos(op);
  const alvos = [];
  if (existsSync(d.agente)) alvos.push(d.agente);
  if (existsSync(d.apoio)) {
    const pacoteApoio = path.join(d.apoio, 'package.json');
    const ehNosso = existsSync(pacoteApoio) && JSON.parse(readFileSync(pacoteApoio, 'utf8')).name === 'ux-review-suporte';
    if (!ehNosso) {
      console.error(`${d.apoio} existe mas não parece ser a pasta de apoio do ux-review. Nada foi removido.`);
      process.exit(1);
    }
    alvos.push(d.apoio);
  }
  if (op['apagar-memoria'] && existsSync(d.memoria)) alvos.push(d.memoria);
  if (!alvos.length) {
    console.log(`Nada do ux-review encontrado em ${d.base}.`);
    return;
  }
  if (!op.confirmar) {
    console.log('Seria removido:');
    for (const a of alvos) console.log(`  ${a}`);
    if (!op['apagar-memoria'] && existsSync(d.memoria)) console.log(`Fica: ${d.memoria} (use --apagar-memoria para remover)`);
    console.log('Rode de novo com --confirmar para remover.');
    return;
  }
  for (const a of alvos) rmSync(a, { recursive: true, force: true });
  console.log('Removido:');
  for (const a of alvos) console.log(`  ${a}`);
}

function config() {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'suporte', 'scripts', 'config.mjs')], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const { pos, op } = argumentos(process.argv.slice(2));
const comando = pos[0] || (op.version ? 'versao' : 'ajuda');
switch (comando) {
  case 'instalar': instalar(op); break;
  case 'verificar': verificar(op); break;
  case 'desinstalar': desinstalar(op); break;
  case 'config': config(); break;
  case 'versao': console.log(PACOTE.version); break;
  case 'ajuda': console.log(AJUDA); break;
  default:
    console.error(`Comando desconhecido: ${comando}\n\n${AJUDA}`);
    process.exit(2);
}
