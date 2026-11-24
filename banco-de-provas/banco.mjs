#!/usr/bin/env node
// Banco de provas do ux-review: casos com resposta conhecida.
//
//   node banco-de-provas/banco.mjs servir [--porta 4173]
//       Serve as páginas dos casos em http://localhost:<porta>/<caso>/
//   node banco-de-provas/banco.mjs pedido <caso> [--porta 4173]
//       Mostra o pedido para colar no Claude Code (e copia o diff do caso de PR
//       para uma pasta temporária, longe do gabarito).
//   node banco-de-provas/banco.mjs avaliar --caso <caso> --achados <achados.json> [--caso ... --achados ...] [--saida resultado.json]
//       Compara os achados do agente com o gabarito: acertos, falsos positivos e falsos negativos.
//   node banco-de-provas/banco.mjs calibrar [caso ...]
//       Roda só os scripts de medição (sem o agente) e mostra o que eles detectam sozinhos.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, stat, mkdir, copyFile, writeFile } from 'node:fs/promises';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CASOS = path.join(AQUI, 'casos');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function argumentos(argv) {
  const pos = [];
  const a = { caso: [], achados: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { pos.push(k); continue; }
    const nome = k.slice(2);
    const valor = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (Array.isArray(a[nome])) a[nome].push(valor); else a[nome] = valor;
  }
  return { pos, a };
}

async function listarCasos() {
  return (await readdir(CASOS)).filter((n) => !n.startsWith('.')).sort();
}

function resolverCaso(nome) {
  const base = path.basename(String(nome).replace(/[\\/]+$/, ''));
  return { nome: base, pasta: path.join(CASOS, base) };
}

async function lerEsperado(caso) {
  return JSON.parse(await readFile(path.join(resolverCaso(caso).pasta, 'esperado.json'), 'utf8'));
}

// ---------- servidor estático (só GET, só a pasta pagina/ de cada caso) ----------

export function criarServidor() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      const url = new URL(req.url, 'http://localhost');
      const partes = decodeURIComponent(url.pathname).split('/').filter(Boolean);
      if (!partes.length) {
        const lista = (await listarCasos()).map((c) => `<li><a href="/${c}/">${c}</a></li>`).join('');
        res.writeHead(200, { 'content-type': TIPOS['.html'] });
        return res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Banco de provas</title><h1>Casos</h1><ul>${lista}</ul></html>`);
      }
      const [caso, ...resto] = partes;
      if (resto.some((p) => p === '..')) { res.writeHead(400); return res.end(); }
      const raiz = path.join(CASOS, path.basename(caso), 'pagina');
      let arquivo = path.join(raiz, ...resto);
      if (!arquivo.startsWith(raiz)) { res.writeHead(400); return res.end(); }
      const info = await stat(arquivo).catch(() => null);
      if (info && info.isDirectory()) arquivo = path.join(arquivo, 'index.html');
      const corpo = await readFile(arquivo);
      res.writeHead(200, { 'content-type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : corpo);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('não encontrado');
    }
  });
}

function ouvir(servidor, porta) {
  return new Promise((ok) => servidor.listen(porta, '127.0.0.1', () => ok(servidor.address().port)));
}

// ---------- pedido ----------

async function pedido(caso, porta) {
  const esp = await lerEsperado(caso);
  const { nome, pasta } = resolverCaso(caso);
  if (esp.arquivoDiff) {
    const destino = path.join(os.tmpdir(), 'ux-review-banco', nome);
    await mkdir(destino, { recursive: true });
    const diff = path.join(destino, esp.arquivoDiff);
    await copyFile(path.join(pasta, esp.arquivoDiff), diff);
    return `Use o subagente ux-review no modo 3 (revisão de PR). Em vez do gh, leia o diff local ${diff}. ${esp.contexto || ''}`.trim();
  }
  const url = `http://localhost:${porta}${esp.caminho}`;
  const extra = esp.pedido ? ` ${esp.pedido}` : '';
  return `Use o subagente ux-review no modo 2 (auditoria WCAG 2.2 AA) em ${url}. Ambiente local. Larguras ${esp.larguras.join(' e ')}.${extra}`;
}

// ---------- avaliação ----------

function criteriosDoAchado(achado) {
  const lista = Array.isArray(achado.criterios) ? achado.criterios : achado.criterio ? [achado.criterio] : [];
  return lista.map((c) => (/nn\/?g/i.test(c.fonte || '') ? 'NN/g' : String(c.numero || '').trim())).filter(Boolean);
}

function seletoresDoAchado(achado) {
  const l = achado.local || {};
  return [l.seletor, ...(l.seletores || [])].filter(Boolean);
}

async function idsPorSeletor(page, seletores) {
  return page.evaluate((lista) => {
    const ids = new Set();
    let resolvidos = 0;
    for (const s of lista) {
      let els = [];
      try { els = [...document.querySelectorAll(s)]; } catch { continue; }
      if (els.length) resolvidos++;
      for (const el of els) {
        const perto = el.closest('[data-bp]');
        if (perto) ids.add(perto.getAttribute('data-bp'));
        const dentro = el.querySelectorAll('[data-bp]');
        if (!perto && dentro.length === 1) ids.add(dentro[0].getAttribute('data-bp'));
      }
    }
    return { ids: [...ids], resolvidos };
  }, seletores);
}

function casaCodigo(achado, item) {
  const l = achado.local || {};
  const arquivo = String(l.arquivo || '').replace(/\\/g, '/');
  const linha = Number(l.linha);
  if (!arquivo || !linha) return false;
  return arquivo.endsWith(item.arquivo) && linha >= item.linhas[0] && linha <= item.linhas[1];
}

async function avaliarCaso(caso, arquivoAchados, ctx) {
  const esp = await lerEsperado(caso);
  const achados = JSON.parse(await readFile(arquivoAchados, 'utf8'));
  const defeitos = achados.defeitos || [];
  const suspeitas = achados.suspeitas || [];
  const ehCodigo = !!esp.arquivoDiff;

  async function alvosDe(achado) {
    if (ehCodigo) return null;
    const seletores = seletoresDoAchado(achado);
    if (!seletores.length) return { ids: [], resolvidos: 0 };
    const largura = Number(achado.local?.largura) || esp.larguras[esp.larguras.length - 1];
    const page = await ctx.pagina(largura, `${ctx.base}${esp.caminho}`);
    return idsPorSeletor(page, seletores);
  }

  function corresponde(achado, alvos, item, comCriterio) {
    const criterios = criteriosDoAchado(achado);
    const okLocal = ehCodigo ? casaCodigo(achado, item) : (item.alvos || [item.id]).some((id) => alvos.ids.includes(id));
    if (!comCriterio) return okLocal;
    return okLocal && item.criterios.some((c) => criterios.includes(c));
  }

  const acertos = new Map();
  const falsosPositivos = [];
  const duplicados = [];
  for (const d of defeitos) {
    const alvos = await alvosDe(d);
    const casados = esp.defeitos.filter((e) => corresponde(d, alvos, e, true));
    if (casados.length) {
      for (const e of casados) {
        if (acertos.has(e.id)) duplicados.push({ achado: d.id, esperado: e.id });
        else acertos.set(e.id, d.id);
      }
      continue;
    }
    const armadilha = (esp.armadilhas || []).find((t) => corresponde(d, alvos, t, false));
    const mesmoLugar = esp.defeitos.find((e) => corresponde(d, alvos, e, false));
    let motivo = 'sem correspondência no gabarito';
    if (armadilha) motivo = `caiu na armadilha ${armadilha.id}: ${armadilha.nota}`;
    else if (mesmoLugar) motivo = `lugar certo (${mesmoLugar.id}), critério errado: ${criteriosDoAchado(d).join(', ') || 'nenhum'} (esperado ${mesmoLugar.criterios.join(' ou ')})`;
    else if (alvos && alvos.resolvidos === 0) motivo = 'seletor não encontrado na página';
    falsosPositivos.push({ achado: d.id, titulo: d.titulo, motivo });
  }
  const falsosNegativos = esp.defeitos.filter((e) => !acertos.has(e.id)).map((e) => ({ esperado: e.id, nota: e.nota }));
  const suspeitasQueEramDefeito = [];
  for (const s of suspeitas) {
    const alvos = await alvosDe(s);
    for (const e of esp.defeitos) {
      if (!acertos.has(e.id) && corresponde(s, alvos, e, false)) suspeitasQueEramDefeito.push({ suspeita: s.id, esperado: e.id });
    }
  }
  const vp = acertos.size;
  return {
    caso: esp.caso,
    verdadeirosPositivos: vp,
    falsosPositivos,
    falsosNegativos,
    duplicados,
    suspeitas: suspeitas.length,
    suspeitasQueEramDefeito,
  };
}

async function avaliar(a) {
  if (!a.caso.length || a.caso.length !== a.achados.length) {
    console.error('Uso: banco.mjs avaliar --caso <caso> --achados <achados.json> [--caso ... --achados ...]');
    process.exit(2);
  }
  const { chromium } = await import('playwright');
  const servidor = criarServidor();
  const porta = await ouvir(servidor, 0);
  const browser = await chromium.launch();
  const paginas = new Map();
  const ctx = {
    base: `http://127.0.0.1:${porta}`,
    async pagina(largura, url) {
      const chave = `${largura}|${url}`;
      if (!paginas.has(chave)) {
        const page = await browser.newPage({ viewport: { width: largura, height: 800 } });
        await page.goto(url);
        paginas.set(chave, page);
      }
      return paginas.get(chave);
    },
  };
  const resultados = [];
  try {
    for (let i = 0; i < a.caso.length; i++) resultados.push(await avaliarCaso(a.caso[i], a.achados[i], ctx));
  } finally {
    await browser.close();
    servidor.close();
  }
  let vp = 0, fp = 0, fn = 0;
  for (const r of resultados) {
    vp += r.verdadeirosPositivos; fp += r.falsosPositivos.length; fn += r.falsosNegativos.length;
    console.log(`\n${r.caso}: ${r.verdadeirosPositivos} acertos, ${r.falsosPositivos.length} falsos positivos, ${r.falsosNegativos.length} falsos negativos, ${r.suspeitas} suspeitas`);
    for (const x of r.falsosPositivos) console.log(`  FP ${x.achado} (${x.titulo || 'sem título'}): ${x.motivo}`);
    for (const x of r.falsosNegativos) console.log(`  FN ${x.esperado}: ${x.nota}`);
    for (const x of r.duplicados) console.log(`  duplicado: ${x.achado} repete ${x.esperado}`);
    for (const x of r.suspeitasQueEramDefeito) console.log(`  suspeita ${x.suspeita} aponta para o defeito ${x.esperado} (faltou prova)`);
  }
  const precisao = vp + fp ? vp / (vp + fp) : 1;
  const revocacao = vp + fn ? vp / (vp + fn) : 1;
  console.log(`\nTotal: ${vp} acertos, ${fp} falsos positivos, ${fn} falsos negativos. Precisão ${(precisao * 100).toFixed(0)}%, revocação ${(revocacao * 100).toFixed(0)}%.`);
  if (a.saida) await writeFile(a.saida, JSON.stringify({ data: new Date().toISOString(), precisao, revocacao, resultados }, null, 2) + '\n', 'utf8');
}

// ---------- calibração dos scripts ----------

async function calibrar(casos) {
  const m = await import('../suporte/scripts/medidas.mjs');
  const servidor = criarServidor();
  const porta = await ouvir(servidor, 0);
  const nav = await m.abrirNavegador({ ambiente: 'local' });
  let totalEsperado = 0, totalDetectado = 0, totalArmadilhas = 0;
  try {
    for (const caso of casos) {
      const esp = await lerEsperado(caso);
      if (esp.arquivoDiff) { console.log(`\n${esp.caso}: caso de código, fora da calibração dos scripts.`); continue; }
      const marcas = []; // { id, criterio, fonte }
      for (const largura of esp.larguras) {
        const page = await nav.novaPagina({ largura });
        await m.irPara(page, `http://127.0.0.1:${porta}${esp.caminho}`);
        const marcar = async (seletores, criterio, fonte) => {
          const { ids } = await idsPorSeletor(page, seletores);
          if (!ids.length) marcas.push({ id: null, seletor: seletores.join(', '), criterio, fonte: `${fonte} @${largura}` });
          for (const id of ids) marcas.push({ id, criterio, fonte: `${fonte} @${largura}` });
        };
        const axe = await m.rodarAxe(page);
        for (const v of axe.violacoes) for (const n of v.nos) for (const c of v.criterios) await marcar([n.alvo], c, `axe ${v.regra}`);
        for (const c of await m.medirContraste(page)) if (!c.passa && !c.isento) await marcar([c.seletor], '1.4.3', `contraste ${c.razao}:1`);
        for (const x of await m.medirAlvos(page)) if (!x.excecao) await marcar([x.seletor], '2.5.8', `alvo ${x.largura}x${x.altura}`);
        const cl = await m.clicaveisSemTeclado(page);
        for (const x of cl.confirmados) await marcar([x.seletor], '2.1.1', `clicável sem teclado (${x.eventos.join(',') || 'onclick'})`);
        const rf = await m.medirReflow(page);
        for (const x of rf.culpados) await marcar([x.seletor], '1.4.10', `transborda até ${x.direita}px`);
        const es = await m.medirEspacamento(page);
        for (const x of es.novosCortes) await marcar([x.seletor], '1.4.12', `${x.tipo} sobra ${x.sobraY}px`);
        const tab = await m.trilhaDeTab(page, { maxPassos: 40 });
        for (const p of tab.passos) {
          if (p.mudancaVisual === false) await marcar([p.seletor], '2.4.7', 'foco sem mudança visual');
          if (p.encoberto === 'total') await marcar([p.seletor], '2.4.11', `foco encoberto por ${p.cobertoPor}`);
          if (Number(p.tabindex) > 0) await marcar([p.seletor], '2.4.3', `tabindex=${p.tabindex}`);
        }
        await page.context().close();
      }
      const detectados = esp.defeitos.filter((e) => marcas.some((mk) => (e.alvos || [e.id]).includes(mk.id) && e.criterios.includes(mk.criterio)));
      const armadilhas = (esp.armadilhas || []).filter((t) => marcas.some((mk) => mk.id === t.id));
      totalEsperado += esp.defeitos.length; totalDetectado += detectados.length; totalArmadilhas += armadilhas.length;
      console.log(`\n${esp.caso}: scripts detectam ${detectados.length} de ${esp.defeitos.length} defeitos; ${armadilhas.length} armadilhas marcadas.`);
      for (const e of esp.defeitos) {
        const ms = marcas.filter((mk) => (e.alvos || [e.id]).includes(mk.id) && e.criterios.includes(mk.criterio));
        console.log(`  ${ms.length ? 'detectado    ' : 'não detectado'} ${e.id} (${e.criterios.join('/')}): ${ms.length ? [...new Set(ms.map((x) => x.fonte))].slice(0, 3).join('; ') : e.nota}`);
      }
      for (const t of armadilhas) {
        const ms = marcas.filter((mk) => mk.id === t.id);
        console.log(`  ARMADILHA MARCADA ${t.id}: ${[...new Set(ms.map((x) => `${x.criterio} ${x.fonte}`))].join('; ')}`);
      }
      // Marcas que não batem com nenhum defeito esperado: ou o gabarito está
      // incompleto (defeito não planejado na página) ou o script errou.
      const foraDoGabarito = marcas.filter((mk) => !esp.defeitos.some((e) => (e.alvos || [e.id]).includes(mk.id) && e.criterios.includes(mk.criterio)) && !(esp.armadilhas || []).some((t) => t.id === mk.id));
      for (const mk of foraDoGabarito) console.log(`  FORA DO GABARITO: ${mk.id || mk.seletor} ${mk.criterio} ${mk.fonte}`);
      totalArmadilhas += foraDoGabarito.length;
    }
  } finally {
    await nav.fechar();
    servidor.close();
  }
  console.log(`\nScripts sozinhos: ${totalDetectado} de ${totalEsperado} defeitos detectados, ${totalArmadilhas} marcações indevidas (armadilhas ou fora do gabarito). O resto depende do roteiro e do julgamento do agente.`);
}

// ---------- entrada ----------

const { pos, a } = argumentos(process.argv.slice(2));
const comando = pos.shift();
const porta = Number(a.porta || 4173);

if (comando === 'servir') {
  const servidor = criarServidor();
  const p = await ouvir(servidor, porta);
  console.log(`Banco de provas em http://localhost:${p}/ (Ctrl+C para parar)`);
  for (const c of await listarCasos()) {
    const esp = await lerEsperado(c);
    if (esp.caminho) console.log(`  http://localhost:${p}${esp.caminho}`);
  }
} else if (comando === 'pedido') {
  if (!pos[0]) { console.error('Uso: banco.mjs pedido <caso>'); process.exit(2); }
  console.log(await pedido(pos[0], porta));
} else if (comando === 'avaliar') {
  await avaliar(a);
} else if (comando === 'calibrar') {
  await calibrar(pos.length ? pos : await listarCasos());
} else {
  console.log('Comandos: servir | pedido <caso> | avaliar --caso <caso> --achados <arquivo> | calibrar [caso ...]');
  process.exit(comando ? 2 : 0);
}
