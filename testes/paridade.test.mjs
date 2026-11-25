// Fator X: o que roda nos testes é o que roda na instalação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(path.join(RAIZ, p), 'utf8'));

test('raiz e suporte têm a mesma versão', () => {
  assert.equal(ler('package.json').version, ler('suporte/package.json').version);
});

test('raiz e suporte declaram as mesmas dependências, em versão exata', () => {
  const dev = ler('package.json').devDependencies;
  const execucao = ler('suporte/package.json').dependencies;
  assert.deepEqual(dev, execucao);
  for (const v of Object.values(execucao)) assert.match(v, /^\d+\.\d+\.\d+$/, `versão não exata: ${v}`);
});

test('lockfiles resolvem só no registro público', () => {
  for (const p of ['package-lock.json', 'suporte/package-lock.json']) {
    const resolvidos = Object.values(ler(p).packages).map((x) => x.resolved).filter(Boolean);
    assert.ok(resolvidos.length > 0);
    for (const r of resolvidos) assert.match(r, /^https:\/\/registry\.npmjs\.org\//, `${p}: ${r}`);
  }
});

test('mesma exigência de Node em todo lugar', () => {
  assert.equal(ler('package.json').engines.node, ler('suporte/package.json').engines.node);
  const cli = readFileSync(path.join(RAIZ, 'bin', 'ux-review.mjs'), 'utf8');
  const minimo = ler('package.json').engines.node.match(/\d+/)[0];
  assert.match(cli, new RegExp(`NODE_MINIMO = ${minimo};`));
});
