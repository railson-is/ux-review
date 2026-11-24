import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALIDADOR = path.join(RAIZ, 'suporte', 'scripts', 'validar-achados.mjs');
const EXEMPLO = path.join(RAIZ, 'suporte', 'formato', 'exemplo');

function validar(mudar) {
  const pasta = mkdtempSync(path.join(os.tmpdir(), 'uxr-validar-'));
  try {
    copyFileSync(path.join(EXEMPLO, 'relatorio.md'), path.join(pasta, 'relatorio.md'));
    const dados = JSON.parse(readFileSync(path.join(EXEMPLO, 'achados.json'), 'utf8'));
    mudar(dados);
    writeFileSync(path.join(pasta, 'achados.json'), JSON.stringify(dados));
    const r = spawnSync(process.execPath, [VALIDADOR, pasta], { encoding: 'utf8' });
    return { codigo: r.status, saida: r.stdout };
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

test('o exemplo passa', () => {
  assert.equal(validar(() => {}).codigo, 0);
});

test('defeito sem prova medida não passa', () => {
  const r = validar((d) => { d.defeitos[0].prova.valores = {}; });
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /sem valores medidos/);
});

test('critério obsoleto e fonte proibida não passam', () => {
  const r = validar((d) => {
    d.defeitos[0].criterios[0].numero = '4.1.1';
    d.defeitos[1].criterios.push({ fonte: 'Baymard', url: 'https://baymard.com/x' });
  });
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /4\.1\.1 Parsing é obsoleto/);
  assert.match(r.saida, /baymard\.com não pode ser usado/);
});

test('citação da NN/g com mais de uma frase não passa', () => {
  const r = validar((d) => {
    d.defeitos[1].criterios.push({ fonte: 'NN/g', autor: 'Jakob Nielsen', titulo: 'X', url: 'https://www.nngroup.com/articles/x/', citacao: 'Primeira frase. Segunda frase.' });
  });
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /passa de uma frase/);
});

test('suspeita sem o que falta não passa', () => {
  const r = validar((d) => { d.suspeitas[0].falta = ''; });
  assert.equal(r.codigo, 1);
});

test('travessão gera aviso', () => {
  const r = validar((d) => { d.defeitos[0].impacto = 'Quem usa teclado \u2014 não avança.'; });
  assert.equal(r.codigo, 0);
  assert.match(r.saida, /travessão/);
});
