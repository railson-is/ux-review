import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCor, razao } from '../suporte/scripts/contraste.mjs';

const r = (a, b) => Math.floor(razao(lerCor(a), lerCor(b)) * 100) / 100;

test('valores de referência', () => {
  assert.equal(r('#000', '#fff'), 21);
  assert.equal(r('#767676', '#ffffff'), 4.54);
  assert.equal(r('#777777', '#ffffff'), 4.47);
  assert.equal(r('#999999', '#ffffff'), 2.84);
  assert.equal(r('#ff6b6b', '#ffffff'), 2.77);
});

test('frente com transparência é composta sobre o fundo', () => {
  // 255 x 0,25 = 63,75 em cada canal
  assert.equal(r('rgba(0, 0, 0, 0.75)', '#ffffff'), r('rgb(63.75, 63.75, 63.75)', '#ffffff'));
});

test('formatos de cor', () => {
  assert.deepEqual(lerCor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(lerCor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.throws(() => lerCor('azul'));
});
