import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerConfig, descreverConfig } from '../suporte/scripts/config.mjs';

test('padrões sem nenhuma variável', () => {
  const c = lerConfig({});
  assert.deepEqual(c.larguras, [320, 390, 768, 1280]);
  assert.equal(c.altura, 800);
  assert.equal(c.tempoLimiteMs, 60000);
  assert.equal(c.visivel, false);
  assert.deepEqual(c.permitirEscrita, []);
  assert.deepEqual(c.palavrasDeRiscoExtras, []);
});

test('valores do ambiente', () => {
  const c = lerConfig({ UXR_LARGURAS: '360, 1440', UXR_ALTURA: '900', UXR_VISIVEL: 'sim', UXR_PERMITIR_ESCRITA: '/entrar$', UXR_PALAVRAS_DE_RISCO: 'resgatar,doar' });
  assert.deepEqual(c.larguras, [360, 1440]);
  assert.equal(c.altura, 900);
  assert.equal(c.visivel, true);
  assert.ok(c.permitirEscrita[0].test('https://exemplo.com/entrar'));
  assert.deepEqual(c.palavrasDeRiscoExtras, ['resgatar', 'doar']);
});

test('valor inválido interrompe com a variável no erro', () => {
  assert.throws(() => lerConfig({ UXR_LARGURAS: '320,abc' }), /UXR_LARGURAS/);
  assert.throws(() => lerConfig({ UXR_LARGURAS: '50' }), /UXR_LARGURAS/);
  assert.throws(() => lerConfig({ UXR_ALTURA: '10' }), /UXR_ALTURA/);
  assert.throws(() => lerConfig({ UXR_PERMITIR_ESCRITA: '(' }), /UXR_PERMITIR_ESCRITA/);
  assert.throws(() => lerConfig({ UXR_PALAVRAS_DE_RISCO: 'a|b' }), /UXR_PALAVRAS_DE_RISCO/);
});

test('descrição nunca mostra segredo', () => {
  const linhas = descreverConfig({ UXR_USUARIO: 'pessoa@exemplo.com', UXR_SENHA: 'x' });
  const texto = JSON.stringify(linhas);
  assert.ok(!texto.includes('pessoa@exemplo.com'));
  assert.equal(linhas.find((l) => l.variavel === 'UXR_SENHA').valor, 'definida');
});
