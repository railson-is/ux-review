// Biblioteca de medição do ux-review. Usada por auditar.mjs e pelos scripts
// que o agente escreve em cada revisão (veja modelo-revisao.mjs).
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const UTILITARIOS = path.join(AQUI, 'no-navegador.js');
const AXE = require.resolve('axe-core/axe.min.js');

export const LARGURAS_PADRAO = [320, 390, 768, 1280];
export const ALTURA_PADRAO = 800;
export const TAGS_WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Ações que, em produção, podem pagar, confirmar, enviar ou finalizar algo.
export const PALAVRAS_DE_RISCO = /\b(pag(ar|ue|amento)|compr(ar|e|a)|finaliz(ar|e|a)|conclu(ir|a|i)|confirm(ar|e|a)|assin(ar|e|a)|contrat(ar|e|a)|envi(ar|e|a)|public(ar|ue|a)|exclu(ir|a|i)|apag(ar|ue|a)|delet(ar|e|a)|remov(er|a|e)|cancel(ar|e|a)|transfer(ir|a|e)|sac(ar|ue)|agend(ar|e|a)|reserv(ar|e|a)|checkout|pay|buy|purchase|order|confirm|submit|send|delete|remove|subscribe|book)\b/i;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Decide o ambiente. Sem declaração explícita, só localhost e .test/.localhost
// contam como local; o resto é tratado como produção.
export function tipoDeAmbiente(url, declarado) {
  if (declarado) return declarado;
  const host = new URL(url).hostname;
  if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(host) || host.endsWith('.localhost') || host.endsWith('.test')) return 'local';
  return 'producao';
}

export function credencial(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Defina a variável de ambiente ${nome} antes de rodar o script. O valor nunca é gravado.`);
  return valor;
}

export async function salvarJson(arquivo, dados) {
  await mkdir(path.dirname(arquivo), { recursive: true });
  await writeFile(arquivo, JSON.stringify(dados, null, 2) + '\n', 'utf8');
}

// Abre o Chromium do Playwright. Em produção, bloqueia toda requisição que
// não seja GET, HEAD ou OPTIONS, exceto as liberadas em permitirEscrita
// (lista de RegExp, por exemplo a URL de login).
export async function abrirNavegador({ ambiente = 'producao', permitirEscrita = [], visivel = !!process.env.UXR_VISIVEL } = {}) {
  const browser = await chromium.launch({ headless: !visivel });
  const bloqueadas = [];

  async function novaPagina({ largura = 1280, altura = ALTURA_PADRAO, estado } = {}) {
    const context = await browser.newContext({
      viewport: { width: largura, height: altura },
      bypassCSP: true,
      locale: 'pt-BR',
      storageState: estado,
      serviceWorkers: ambiente === 'producao' ? 'block' : 'allow',
    });
    await context.addInitScript({ path: UTILITARIOS });
    if (ambiente === 'producao') {
      await context.route('**/*', (rota) => {
        const req = rota.request();
        const metodo = req.method();
        if (['GET', 'HEAD', 'OPTIONS'].includes(metodo) || permitirEscrita.some((re) => re.test(req.url()))) return rota.continue();
        bloqueadas.push({ metodo, url: req.url().split('?')[0] });
        return rota.abort('blockedbyclient');
      });
    }
    const page = await context.newPage();
    page.on('pageerror', (e) => (page.__errosJs ||= []).push(String(e.message).slice(0, 300)));
    return page;
  }

  return {
    browser,
    ambiente,
    novaPagina,
    bloqueadas,
    fechar: () => browser.close(),
  };
}

export async function irPara(page, url, { esperaExtra = 500 } = {}) {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* páginas com conexão contínua */ }
  await pausa(esperaExtra);
  await garantirUtilitarios(page);
}

export async function garantirUtilitarios(page) {
  const tem = await page.evaluate(() => !!window.__uxr);
  if (!tem) await page.addScriptTag({ path: UTILITARIOS });
}

export async function versoes(navegador) {
  return {
    playwright: require('playwright/package.json').version,
    axe: require('axe-core/package.json').version,
    navegador: `chromium ${navegador.browser.version()}`,
  };
}

// ---------- axe-core ----------

export async function rodarAxe(page, { tags = TAGS_WCAG_AA, escopo } = {}) {
  await garantirUtilitarios(page);
  const tem = await page.evaluate(() => !!window.axe);
  if (!tem) await page.addScriptTag({ path: AXE });
  return page.evaluate(async ({ tags, escopo }) => {
    const alvo = escopo ? document.querySelector(escopo) : document;
    const r = await window.axe.run(alvo, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
    const limpar = (html) => html.replace(/\svalue="[^"]*"/gi, ' value="[omitido]"').slice(0, 300);
    const enxuto = (lista) => lista.map((v) => ({
      regra: v.id,
      impacto: v.impact,
      descricao: v.help,
      ajuda: v.helpUrl,
      criterios: v.tags.filter((t) => /^wcag\d{3,4}$/.test(t)).map((t) => t.replace(/^wcag(\d)(\d)(\d+)$/, '$1.$2.$3')),
      nos: v.nodes.slice(0, 20).map((n) => ({
        alvo: n.target.map((t) => (Array.isArray(t) ? t.join(' >>> ') : t)).join(' '),
        html: limpar(n.html),
        resumo: n.failureSummary,
      })),
      totalDeNos: v.nodes.length,
    }));
    return { versao: window.axe.version, violacoes: enxuto(r.violations), incompletos: enxuto(r.incomplete) };
  }, { tags, escopo });
}

// ---------- medições manuais ----------

export async function medirContraste(page, { escopo, todos = false } = {}) {
  await garantirUtilitarios(page);
  return page.evaluate((o) => window.__uxr.contraste(o), { escopo, todos });
}

// Clicáveis fora da ordem do Tab. "confirmados" têm ouvinte de clique no
// próprio elemento (lido pelo CDP). "possiveis" só parecem clicáveis; com
// delegação de eventos (comum em frameworks) o ouvinte fica num ancestral e é
// preciso testar com clique e teclado antes de relatar.
export async function clicaveisSemTeclado(page) {
  await garantirUtilitarios(page);
  const candidatos = await page.evaluate(() => window.__uxr.candidatosClicaveis());
  const cdp = await page.context().newCDPSession(page);
  const confirmados = [];
  const possiveis = [];
  const tiposDeClique = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
  try {
    for (const c of candidatos) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(c.seletor)})`, objectGroup: 'uxr' });
      if (!result.objectId) continue;
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      const eventos = [...new Set(listeners.map((l) => l.type))].filter((t) => tiposDeClique.includes(t));
      if (eventos.length || c.onclickAtributo) confirmados.push({ ...c, eventos });
      else possiveis.push(c);
    }
  } finally {
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'uxr' }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
  return { confirmados, possiveis };
}

export async function medirAlvos(page) {
  await garantirUtilitarios(page);
  return page.evaluate(() => window.__uxr.alvos());
}

export async function medirReflow(page) {
  await garantirUtilitarios(page);
  return page.evaluate(() => window.__uxr.transbordo());
}

export async function medirSobreposicao(page) {
  await garantirUtilitarios(page);
  return page.evaluate(() => window.__uxr.sobreposicoes());
}

// Aplica os valores de 1.4.12 e lista o que passou a ser cortado ou a vazar.
export async function medirEspacamento(page, { printAntes, printDepois } = {}) {
  await garantirUtilitarios(page);
  const antes = await page.evaluate(() => window.__uxr.cortes());
  if (printAntes) await printar(page, printAntes);
  await page.evaluate(() => window.__uxr.aplicarEspacamento());
  await pausa(150);
  const depois = await page.evaluate(() => window.__uxr.cortes());
  if (printDepois) await printar(page, printDepois);
  await page.evaluate(() => window.__uxr.removerEspacamento());
  const chave = (c) => `${c.seletor}|${c.tipo}`;
  const mapaAntes = new Map(antes.map((c) => [chave(c), c]));
  const novos = depois.filter((c) => {
    const a = mapaAntes.get(chave(c));
    return !a || c.sobraY > a.sobraY + 1 || c.sobraX > a.sobraX + 1;
  });
  return { novosCortes: novos, jaCortadosAntes: antes.length };
}

// Percorre a página com Tab (ou Shift+Tab) e registra cada parada.
// inicio: 'pagina' recarrega a página para começar do início real da ordem
// (inclui tabindex positivo); 'atual' parte do foco atual (use com janela
// aberta ou outro estado montado pelo script).
// compararVisual: tira um recorte com o elemento focado e outro sem foco;
// recortes idênticos provam que o foco não muda nada na tela.
export async function trilhaDeTab(page, { maxPassos = 80, reverso = false, inicio = 'pagina', compararVisual = true, pastaPrints } = {}) {
  if (inicio === 'pagina') {
    await page.reload({ waitUntil: 'load' });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* segue */ }
    await pausa(300);
  }
  await garantirUtilitarios(page);
  await page.mouse.move(0, 0);
  if (inicio === 'pagina') await page.evaluate(() => window.scrollTo(0, 0));
  const totalFocaveis = await page.evaluate(() => window.__uxr.capturarBase());
  const passos = [];
  const tecla = reverso ? 'Shift+Tab' : 'Tab';
  let saiuDaPagina = false;
  let completouCiclo = false;
  for (let i = 1; i <= maxPassos; i++) {
    await page.keyboard.press(tecla);
    await pausa(120);
    const estado = await page.evaluate(() => window.__uxr.estadoFoco());
    if (!estado.seletor) { saiuDaPagina = true; break; }
    if (passos.length && estado.seletor === passos[0].seletor) { completouCiclo = true; break; }
    const passo = { passo: i, ...estado, mudancaVisual: null };
    // Com o elemento encoberto ou fora da tela, a comparação visual não diz nada sobre 2.4.7.
    if (compararVisual && estado.encoberto !== 'fora-da-tela' && estado.encoberto !== 'total') {
      passo.mudancaVisual = await compararFoco(page, estado, pastaPrints ? path.join(pastaPrints, `foco-${String(i).padStart(2, '0')}`) : null);
    }
    passos.push(passo);
  }
  // Ciclo curto: o foco gira entre poucos elementos (modal ou armadilha).
  let cicloCurto = null;
  const ultimos = passos.slice(-12).map((p) => p.seletor);
  const distintos = [...new Set(ultimos)];
  if (ultimos.length >= 12 && distintos.length <= 4 && distintos.length < totalFocaveis) cicloCurto = distintos;
  return { totalFocaveis, passos, saiuDaPagina, completouCiclo, cicloCurto, atingiuLimite: passos.length >= maxPassos };
}

async function compararFoco(page, estado, prefixo) {
  const vp = page.viewportSize();
  const c = estado.caixa;
  const x = Math.max(0, c.x - 6);
  const y = Math.max(0, c.y - 6);
  const largura = Math.min(vp.width - x, c.largura + 12);
  const altura = Math.min(vp.height - y, c.altura + 12);
  if (largura < 2 || altura < 2) return null;
  const clip = { x, y, width: largura, height: altura };
  const comFoco = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  await page.evaluate(() => window.__uxr.desfocarAtivo());
  await pausa(80);
  const semFoco = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  const mudou = !comFoco.equals(semFoco);
  if (prefixo && !mudou) {
    await mkdir(path.dirname(prefixo), { recursive: true });
    await writeFile(`${prefixo}-com-foco.png`, comFoco);
    await writeFile(`${prefixo}-sem-foco.png`, semFoco);
  }
  // O desfoque deixa o ponto de partida no elemento; o próximo Tab segue a ordem.
  return mudou;
}

// ---------- prints e cliques ----------

export async function printar(page, arquivo, { paginaInteira = true, borrar = [] } = {}) {
  await garantirUtilitarios(page);
  await mkdir(path.dirname(arquivo), { recursive: true });
  const borrados = await page.evaluate((extras) => window.__uxr.borrar(extras), borrar);
  await page.screenshot({ path: arquivo, fullPage: paginaInteira, animations: 'disabled', caret: 'hide' });
  await page.evaluate(() => window.__uxr.desborrar());
  return { arquivo, borrados };
}

// Clica só se for seguro. Em produção recusa botões de envio e textos de risco.
export async function cliqueSeguro(page, alvo, { ambiente = 'producao' } = {}) {
  const loc = (typeof alvo === 'string' ? page.locator(alvo) : alvo).first();
  if (ambiente === 'producao') {
    const info = await loc.evaluate((el) => ({
      texto: [el.innerText, el.getAttribute('aria-label'), el.value, el.title].filter(Boolean).join(' ').trim(),
      envia: el.type === 'submit' || (el.tagName === 'BUTTON' && !el.getAttribute('type') && !!el.form) || el.type === 'image',
    }));
    if (info.envia || PALAVRAS_DE_RISCO.test(info.texto)) {
      throw new Error(`Clique recusado em produção: "${info.texto.slice(0, 60)}" pode pagar, confirmar, enviar ou finalizar algo.`);
    }
  }
  await loc.click();
}

// Tempo entre a ação (primeiro pointerdown, keydown ou click) e a primeira
// mudança no DOM. Serve de prova para "a ação não dá retorno".
export async function tempoAteResposta(page, acao, { limite = 5000 } = {}) {
  await page.evaluate(() => {
    window.__uxrMudou = null;
    window.__uxrInicio = null;
    const marca = () => { if (window.__uxrInicio === null) window.__uxrInicio = performance.now(); };
    for (const t of ['pointerdown', 'keydown', 'click']) document.addEventListener(t, marca, { capture: true, once: true });
    const obs = new MutationObserver(() => {
      if (window.__uxrInicio !== null && window.__uxrMudou === null) {
        window.__uxrMudou = performance.now() - window.__uxrInicio;
        obs.disconnect();
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  });
  await acao();
  const fim = Date.now() + limite;
  while (Date.now() < fim) {
    const ms = await page.evaluate(() => window.__uxrMudou);
    if (ms !== null) return Math.round(ms);
    await pausa(50);
  }
  return null;
}
