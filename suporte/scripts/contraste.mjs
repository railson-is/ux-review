#!/usr/bin/env node
// Razão de contraste entre duas cores, pela fórmula da WCAG 2.2.
// Para os modos que não têm navegador (PR e Figma).
//   node contraste.mjs <cor-da-frente> <cor-do-fundo> [--px 16] [--negrito]
// Cores: #rgb, #rrggbb, #rrggbbaa, rgb(r, g, b), rgba(r, g, b, a).
// Uma frente com transparência é composta sobre o fundo; o fundo precisa ser opaco.

export function lerCor(s) {
  const t = String(s).trim().toLowerCase();
  let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(t);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(t);
  if (m) {
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[5] === '%') a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  throw new Error(`Cor não reconhecida: ${s}`);
}

const canal = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminancia = ({ r, g, b }) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

export function razao(frente, fundo) {
  const f = frente.a < 1 ? { r: frente.r * frente.a + fundo.r * (1 - frente.a), g: frente.g * frente.a + fundo.g * (1 - frente.a), b: frente.b * frente.a + fundo.b * (1 - frente.a) } : frente;
  const l1 = luminancia(f);
  const l2 = luminancia(fundo);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const ehPrincipal = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (ehPrincipal) {
  const args = process.argv.slice(2);
  const cores = args.filter((x) => !x.startsWith('--') && !/^\d+(\.\d+)?$/.test(x));
  const iPx = args.indexOf('--px');
  const px = iPx >= 0 ? parseFloat(args[iPx + 1]) : null;
  const negrito = args.includes('--negrito');
  if (cores.length !== 2) {
    console.error('Uso: node contraste.mjs <cor-da-frente> <cor-do-fundo> [--px 16] [--negrito]');
    process.exit(2);
  }
  const frente = lerCor(cores[0]);
  const fundo = lerCor(cores[1]);
  if (fundo.a < 1) {
    console.error('O fundo precisa ser opaco. Componha o fundo com a camada de baixo antes.');
    process.exit(2);
  }
  const v = razao(frente, fundo);
  const exibir = Math.floor(v * 100) / 100;
  console.log(`Razão: ${exibir}:1 (${cores[0]} sobre ${cores[1]})`);
  if (px !== null) {
    const grande = px >= 23.99 || (px >= 18.66 && negrito);
    const minimo = grande ? 3 : 4.5;
    console.log(`1.4.3 Contrast (Minimum), texto ${grande ? 'grande' : 'normal'} (${px}px${negrito ? ' negrito' : ''}): mínimo ${minimo}:1, ${v >= minimo ? 'passa' : 'falha'}`);
  } else {
    console.log(`1.4.3 texto normal (4.5:1): ${v >= 4.5 ? 'passa' : 'falha'} | 1.4.3 texto grande (3:1): ${v >= 3 ? 'passa' : 'falha'} | 1.4.11 não textual (3:1): ${v >= 3 ? 'passa' : 'falha'}`);
  }
}
