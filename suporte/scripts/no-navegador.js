// Utilitários que o ux-review injeta na página (window.__uxr).
// Só leem o DOM. As exceções são borrar/desborrar e aplicar/remover o
// espaçamento de texto, que mudam apenas a cópia aberta no navegador de teste.
(() => {
  if (window.__uxr) return;

  // ---------- cores e contraste (WCAG 2.2, definição de luminância relativa) ----------

  let ctx = null;
  const cacheCor = new Map();

  function rgba(cor) {
    if (cacheCor.has(cor)) return cacheCor.get(cor);
    let res = null;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i.exec(cor);
    if (m) {
      let a = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (m[5] === '%') a /= 100;
      res = { r: +m[1], g: +m[2], b: +m[3], a };
    } else {
      // Outras sintaxes (oklch, lab, color(), color-mix): o canvas converte para sRGB.
      if (!ctx) {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        ctx = c.getContext('2d', { willReadFrequently: true });
      }
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      res = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    cacheCor.set(cor, res);
    return res;
  }

  function canal(v) {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }

  function luminancia({ r, g, b }) {
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  }

  function razao(c1, c2) {
    const l1 = luminancia(c1);
    const l2 = luminancia(c2);
    const [claro, escuro] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (claro + 0.05) / (escuro + 0.05);
  }

  function sobre(cima, baixo) {
    const a = cima.a;
    return {
      r: cima.r * a + baixo.r * (1 - a),
      g: cima.g * a + baixo.g * (1 - a),
      b: cima.b * a + baixo.b * (1 - a),
      a: 1,
    };
  }

  function hex({ r, g, b, a }) {
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    const base = `#${h(r)}${h(g)}${h(b)}`;
    return a !== undefined && a < 1 ? `${base} (alfa ${+a.toFixed(3)})` : base;
  }

  // Arredonda para baixo, para nunca mostrar 4.50 quando o valor real é 4.499.
  function arred(v, casas = 2) {
    const f = 10 ** casas;
    return Math.floor(v * f) / f;
  }

  // Fundo efetivo: compõe as cores de fundo do elemento e dos ancestrais até a
  // primeira camada opaca, sobre branco. Avisa quando a medida não é confiável.
  function fundo(el) {
    const camadas = [];
    const avisos = new Set();
    let opacidade = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') avisos.add('imagem-ou-gradiente-no-fundo');
      const op = parseFloat(cs.opacity);
      if (op < 1) { avisos.add('opacidade'); opacidade *= op; }
      if (cs.filter !== 'none' || cs.mixBlendMode !== 'normal' || cs.backdropFilter && cs.backdropFilter !== 'none') avisos.add('filtro-ou-mistura');
      const c = rgba(cs.backgroundColor);
      if (c.a > 0) camadas.push(c);
      if (c.a >= 1) break;
      if (cs.position === 'absolute' || cs.position === 'fixed') avisos.add('posicionado-sobre-outro-conteudo');
    }
    let res = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = camadas.length - 1; i >= 0; i--) res = sobre(camadas[i], res);
    return { cor: res, avisos: [...avisos], opacidade };
  }

  // ---------- visibilidade e seletores ----------

  function recortado(el) {
    const r = el.getBoundingClientRect();
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const p = n.getBoundingClientRect();
        if (cs.overflowX !== 'visible') { x1 = Math.max(x1, p.left); x2 = Math.min(x2, p.right); }
        if (cs.overflowY !== 'visible') { y1 = Math.max(y1, p.top); y2 = Math.min(y2, p.bottom); }
        if (x2 - x1 < 1 || y2 - y1 < 1) return true;
      }
      if (cs.position === 'fixed') break;
    }
    return false;
  }

  function visivel(el) {
    if (!el || el.nodeType !== 1 || !el.isConnected) return false;
    if (el.closest('[inert]')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility !== 'visible' || cs.contentVisibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.right + window.scrollX <= 0 || r.bottom + window.scrollY <= 0) return false;
    if (/rect\(0(px)?,?\s*0(px)?,?\s*0(px)?,?\s*0(px)?\)/.test(cs.clip)) return false;
    if (/inset\(\s*50%/.test(cs.clipPath)) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (getComputedStyle(n).opacity === '0') return false;
    }
    return !recortado(el);
  }

  function seletor(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
    if (el.id && document.querySelectorAll(`#${esc(el.id)}`).length === 1) return `#${esc(el.id)}`;
    const partes = [];
    let n = el;
    while (n && n.nodeType === 1 && n !== document.body && n !== document.documentElement) {
      if (n.id && document.querySelectorAll(`#${esc(n.id)}`).length === 1) {
        partes.unshift(`#${esc(n.id)}`);
        break;
      }
      let parte = n.tagName.toLowerCase();
      const pai = n.parentElement;
      if (pai) {
        const iguais = [...pai.children].filter((c) => c.tagName === n.tagName);
        if (iguais.length > 1) parte += `:nth-of-type(${iguais.indexOf(n) + 1})`;
      }
      partes.unshift(parte);
      n = pai;
    }
    if (partes[0] && !partes[0].startsWith('#')) partes.unshift('body');
    return partes.join(' > ');
  }

  function caixa(el) {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), largura: +r.width.toFixed(1), altura: +r.height.toFixed(1) };
  }

  function nomeAproximado(el) {
    const rotulo = el.getAttribute('aria-label');
    if (rotulo && rotulo.trim()) return rotulo.trim();
    const ids = el.getAttribute('aria-labelledby');
    if (ids) {
      const t = ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    if (el.labels && el.labels.length) return [...el.labels].map((l) => l.textContent.trim()).join(' ');
    const texto = (el.innerText || '').trim();
    if (texto) return texto.slice(0, 80);
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    return (el.getAttribute('title') || el.getAttribute('placeholder') || el.value || '').toString().trim().slice(0, 80);
  }

  // ---------- 1.4.3 contraste de texto ----------

  function ehGrande(px, peso) {
    // 18 pt = 24 px; 14 pt = 18,67 px (definição de "large scale" da WCAG 2.2)
    return px >= 23.99 || (px >= 18.66 && peso >= 700);
  }

  function medirTexto(el, cor, pseudo) {
    const cs = getComputedStyle(el, pseudo || null);
    const f = fundo(el);
    let c = rgba(cor);
    if (f.opacidade < 1) c = { ...c, a: c.a * f.opacidade };
    const corTexto = c.a < 1 ? sobre(c, f.cor) : c;
    const px = parseFloat(cs.fontSize);
    const peso = parseInt(cs.fontWeight, 10) || 400;
    const grande = ehGrande(px, peso);
    const minimo = grande ? 3 : 4.5;
    const valor = razao(corTexto, f.cor);
    const avisos = [...f.avisos];
    if (cs.textShadow && cs.textShadow !== 'none') avisos.push('sombra-no-texto');
    return {
      razao: arred(valor, valor < minimo && valor > minimo - 0.01 ? 3 : 2),
      minimo,
      passa: valor >= minimo,
      grande,
      fontePx: px,
      peso,
      cor: hex(rgba(cor)),
      corEfetiva: hex(corTexto),
      fundo: hex(f.cor),
      confianca: avisos.length ? 'baixa' : 'alta',
      avisos,
    };
  }

  function contraste(opcoes = {}) {
    const raiz = (opcoes.escopo && document.querySelector(opcoes.escopo)) || document.body;
    const vistos = new Set();
    const itens = [];
    const ignorar = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'TITLE']);
    const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (andar.nextNode()) {
      const t = andar.currentNode;
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (!el || vistos.has(el) || ignorar.has(el.tagName)) continue;
      vistos.add(el);
      if (!visivel(el)) continue;
      const m = medirTexto(el, getComputedStyle(el).color);
      const inativo = !!el.closest(':disabled, [aria-disabled="true"]');
      itens.push({ seletor: seletor(el), texto: t.textContent.trim().slice(0, 60), tipo: 'texto', isento: inativo ? 'componente-inativo' : null, ...m });
    }
    for (const el of raiz.querySelectorAll('input, textarea')) {
      if (!visivel(el) || ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(el.type)) continue;
      const inativo = el.disabled || el.getAttribute('aria-disabled') === 'true';
      if (el.value) {
        const m = medirTexto(el, getComputedStyle(el).color);
        itens.push({ seletor: seletor(el), texto: '[valor do campo]', tipo: 'valor-de-campo', isento: inativo ? 'componente-inativo' : null, ...m });
      } else if (el.placeholder) {
        const m = medirTexto(el, getComputedStyle(el, '::placeholder').color, '::placeholder');
        itens.push({ seletor: seletor(el), texto: el.placeholder.slice(0, 60), tipo: 'placeholder', isento: inativo ? 'componente-inativo' : null, ...m });
      }
    }
    return opcoes.todos ? itens : itens.filter((i) => !i.passa || i.confianca === 'baixa');
  }

  // ---------- foco ----------

  const SEL_FOCAVEL = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, summary, [tabindex], [contenteditable=""], [contenteditable="true"], audio[controls], video[controls]';
  const PROPS_FOCO = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'borderBottomWidth', 'backgroundColor', 'color', 'textDecorationLine', 'transform', 'opacity'];
  const base = new WeakMap();

  function estilo(el, pseudo) {
    const cs = getComputedStyle(el, pseudo || null);
    const o = {};
    for (const p of PROPS_FOCO) o[p] = cs[p];
    if (pseudo) o.content = cs.content;
    return o;
  }

  function retrato(el) {
    return {
      elemento: estilo(el),
      '::before': estilo(el, '::before'),
      '::after': estilo(el, '::after'),
      pai: el.parentElement ? estilo(el.parentElement) : null,
    };
  }

  function focaveis() {
    return [...document.querySelectorAll(SEL_FOCAVEL)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getAttribute('tabindex') !== '-1');
  }

  function capturarBase() {
    let n = 0;
    for (const el of focaveis()) { base.set(el, retrato(el)); n++; }
    return n;
  }

  function ativoProfundo() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  function mudancas(el) {
    const antes = base.get(el);
    if (!antes) return null;
    const agora = retrato(el);
    const lista = [];
    for (const onde of Object.keys(antes)) {
      if (!antes[onde] || !agora[onde]) continue;
      for (const p of Object.keys(antes[onde])) {
        if (antes[onde][p] !== agora[onde][p]) lista.push({ onde, propriedade: p, antes: antes[onde][p], depois: agora[onde][p] });
      }
    }
    return lista;
  }

  function encobrimento(el) {
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return { estado: 'fora-da-tela', cobertoPor: null };
    const pontos = [];
    const xs = [r.left + 2, r.left + r.width / 2, r.right - 2];
    const ys = [r.top + 2, r.top + r.height / 2, r.bottom - 2];
    for (const x of xs) for (const y of ys) {
      if (x >= 0 && x < vw && y >= 0 && y < vh) pontos.push([x, y]);
    }
    let livres = 0;
    let cobertoPor = null;
    for (const [x, y] of pontos) {
      const topo = document.elementFromPoint(x, y);
      if (!topo || topo === el || el.contains(topo) || topo.contains(el)) livres++;
      else if (!cobertoPor) cobertoPor = seletor(topo);
    }
    if (livres === 0) return { estado: 'total', cobertoPor };
    if (livres < pontos.length) return { estado: 'parcial', cobertoPor };
    return { estado: 'nao', cobertoPor: null };
  }

  function estadoFoco() {
    const el = ativoProfundo();
    if (!el || el === document.body || el === document.documentElement) return { seletor: null };
    const papel = el.getAttribute('role') || el.tagName.toLowerCase();
    const enc = encobrimento(el);
    return {
      seletor: seletor(el),
      papel,
      tabindex: el.getAttribute('tabindex'),
      nome: nomeAproximado(el),
      caixa: caixa(el),
      encoberto: enc.estado,
      cobertoPor: enc.cobertoPor,
      mudancasDeEstilo: mudancas(el),
    };
  }

  function desfocarAtivo() {
    const el = ativoProfundo();
    if (el && el.blur) el.blur();
  }

  // Elementos que parecem clicáveis (cursor de mão, onclick ou papel interativo)
  // mas não entram na ordem do Tab. A confirmação dos ouvintes de clique é
  // feita pelo lado do Node, via CDP (medidas.mjs, clicaveisSemTeclado).
  function candidatosClicaveis() {
    const res = [];
    const interativo = `${SEL_FOCAVEL}, label`;
    for (const el of document.body.querySelectorAll('*')) {
      if (el.matches(SEL_FOCAVEL) && el.tabIndex >= 0) continue;
      if (el.parentElement && el.parentElement.closest(interativo)) continue;
      const cs = getComputedStyle(el);
      const papel = el.getAttribute('role');
      const papelInterativo = papel && /^(button|link|checkbox|radio|switch|tab|menuitem|option)$/.test(papel);
      const mao = cs.cursor === 'pointer' && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer');
      if (!mao && !el.hasAttribute('onclick') && !papelInterativo) continue;
      if (!visivel(el)) continue;
      res.push({ seletor: seletor(el), nome: nomeAproximado(el), papel: papel || null, onclickAtributo: el.hasAttribute('onclick'), cursorMao: cs.cursor === 'pointer' });
      if (res.length >= 200) break;
    }
    return res;
  }

  // ---------- 2.5.8 tamanho do alvo ----------

  const SEL_ALVO = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [onclick], [tabindex]:not([tabindex="-1"])';

  function emFrase(el) {
    if (getComputedStyle(el).display !== 'inline') return false;
    const bloco = el.parentElement;
    if (!bloco) return false;
    let textoFora = '';
    for (const n of bloco.childNodes) {
      if (n === el) continue;
      textoFora += n.nodeType === 3 ? n.textContent : (n.contains && n.contains(el) ? '' : n.textContent || '');
    }
    return textoFora.trim().length > 0;
  }

  function alvos() {
    const lista = [...document.querySelectorAll(SEL_ALVO)]
      .filter((el) => visivel(el) && !el.disabled)
      .map((el) => ({ el, r: el.getBoundingClientRect() }));
    const pequeno = (r) => r.width < 23.995 || r.height < 23.995;
    const centro = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const distRet = (c, r) => {
      const dx = Math.max(r.left - c.x, 0, c.x - r.right);
      const dy = Math.max(r.top - c.y, 0, c.y - r.bottom);
      return Math.hypot(dx, dy);
    };
    const parentes = (a, b) => a.contains(b) || b.contains(a);
    const res = [];
    for (const a of lista) {
      if (!pequeno(a.r)) continue;
      const ca = centro(a.r);
      const conflitos = [];
      for (const b of lista) {
        if (b === a || parentes(a.el, b.el)) continue;
        if (b.r.width === 0 || b.r.height === 0) continue;
        if (pequeno(b.r)) {
          const cb = centro(b.r);
          if (Math.hypot(ca.x - cb.x, ca.y - cb.y) < 24) conflitos.push(seletor(b.el));
        } else if (distRet(ca, b.r) < 12) {
          conflitos.push(seletor(b.el));
        }
      }
      let excecao = null;
      if (!conflitos.length) excecao = 'espacamento';
      else if (emFrase(a.el)) excecao = 'inline';
      else if (a.el.matches('input[type="checkbox"], input[type="radio"]') && getComputedStyle(a.el).appearance !== 'none') excecao = 'possivel-controle-do-navegador-ou-rotulo-associado';
      res.push({
        seletor: seletor(a.el),
        nome: nomeAproximado(a.el),
        largura: +a.r.width.toFixed(1),
        altura: +a.r.height.toFixed(1),
        excecao,
        conflitos: conflitos.slice(0, 5),
      });
    }
    return res;
  }

  // ---------- 1.4.10 reflow ----------

  function rolagemPermitida(el) {
    for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return seletor(n);
    }
    return null;
  }

  function transbordo() {
    const vw = document.documentElement.clientWidth;
    const larguraDocumento = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
    const marcados = new Set();
    const culpados = [];
    const emRolagemPropria = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.parentElement && marcados.has(el.parentElement)) { marcados.add(el); continue; }
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (r.left >= vw || r.right <= 0) continue; // inteiro fora da tela: menu fora da tela, carrossel etc.
      if (!visivel(el)) continue;
      const rolagem = rolagemPermitida(el);
      const item = { seletor: seletor(el), esquerda: Math.round(r.left), direita: Math.round(r.right), largura: Math.round(r.width) };
      marcados.add(el);
      if (rolagem) emRolagemPropria.push({ ...item, dentroDe: rolagem });
      else culpados.push(item);
    }
    const csHtml = getComputedStyle(document.documentElement);
    const csBody = getComputedStyle(document.body);
    const cortaNoCorpo = [csHtml.overflowX, csBody.overflowX].some((o) => o === 'hidden' || o === 'clip');
    return {
      larguraViewport: vw,
      larguraDocumento,
      rolagemHorizontal: larguraDocumento > vw + 1,
      conteudoCortadoPeloCorpo: cortaNoCorpo && culpados.length > 0,
      culpados: culpados.slice(0, 30),
      emRolagemPropria: emRolagemPropria.slice(0, 30),
    };
  }

  // ---------- 1.4.12 espaçamento de texto ----------

  const CSS_ESPACAMENTO = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

  function cortes() {
    const lista = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.textContent.trim() || !visivel(el)) continue;
      const cs = getComputedStyle(el);
      const escondeX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      const escondeY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
      const sobraX = el.scrollWidth - el.clientWidth;
      const sobraY = el.scrollHeight - el.clientHeight;
      const corta = (escondeX && sobraX > 1) || (escondeY && sobraY > 1) || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp !== undefined && sobraY > 1;
      const vaza = !escondeY && cs.height !== 'auto' && /px$/.test(cs.height) && sobraY > 1 && cs.overflowY === 'visible' && el.children.length === 0;
      if (corta || vaza) {
        lista.push({ seletor: seletor(el), tipo: corta ? 'texto-cortado' : 'texto-vaza-da-caixa', sobraX, sobraY, texto: el.textContent.trim().slice(0, 60) });
      }
    }
    return lista;
  }

  function aplicarEspacamento() {
    if (document.getElementById('__uxr_espacamento')) return;
    const s = document.createElement('style');
    s.id = '__uxr_espacamento';
    s.textContent = CSS_ESPACAMENTO;
    document.head.appendChild(s);
  }

  function removerEspacamento() {
    document.getElementById('__uxr_espacamento')?.remove();
  }

  // ---------- sobreposição (revisão de tela) ----------

  function sobreposicoes() {
    const candidatos = [...document.body.querySelectorAll('*')].filter((el) => {
      if (!visivel(el)) return false;
      const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      return temTexto || el.matches(SEL_ALVO);
    }).slice(0, 1500);
    const caixas = candidatos.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const res = [];
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i], b = caixas[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const x1 = Math.max(a.r.left, b.r.left), x2 = Math.min(a.r.right, b.r.right);
        const y1 = Math.max(a.r.top, b.r.top), y2 = Math.min(a.r.bottom, b.r.bottom);
        if (x2 - x1 < 2 || y2 - y1 < 2) continue;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const topo = document.elementFromPoint(cx, cy);
        const emCima = topo && (a.el === topo || a.el.contains(topo)) ? a.el : topo && (b.el === topo || b.el.contains(topo)) ? b.el : null;
        res.push({
          a: seletor(a.el),
          b: seletor(b.el),
          area: Math.round((x2 - x1) * (y2 - y1)),
          emCima: emCima ? seletor(emCima) : null,
          interseccao: { x: Math.round(x1), y: Math.round(y1), largura: Math.round(x2 - x1), altura: Math.round(y2 - y1) },
        });
        if (res.length >= 50) return res;
      }
    }
    return res;
  }

  // ---------- dados pessoais nos prints ----------

  const PADROES_PESSOAIS = [
    /[\w.+-]+@[\w-]+\.[\w.-]+/, // e-mail
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
    /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, // CNPJ
    /\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/, // telefone
    /\b(?:\d[ -]?){13,19}\b/, // cartão
  ];

  function borrar(extras = []) {
    if (!document.getElementById('__uxr_borrar')) {
      const s = document.createElement('style');
      s.id = '__uxr_borrar';
      s.textContent = '.__uxr-borrado { filter: blur(8px) !important; }';
      document.head.appendChild(s);
    }
    const alvosBorrar = new Set();
    for (const el of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, select, [contenteditable="true"], [contenteditable=""]')) {
      if (el.value || el.textContent.trim()) alvosBorrar.add(el);
    }
    for (const sel of extras) {
      try { document.querySelectorAll(sel).forEach((el) => alvosBorrar.add(el)); } catch (e) { /* seletor inválido */ }
    }
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (andar.nextNode()) {
      const t = andar.currentNode;
      if (t.parentElement && PADROES_PESSOAIS.some((re) => re.test(t.textContent))) alvosBorrar.add(t.parentElement);
    }
    alvosBorrar.forEach((el) => el.classList.add('__uxr-borrado'));
    return alvosBorrar.size;
  }

  function desborrar() {
    document.querySelectorAll('.__uxr-borrado').forEach((el) => el.classList.remove('__uxr-borrado'));
  }

  window.__uxr = {
    rgba, luminancia, razao, hex, fundo, visivel, seletor, caixa, nomeAproximado,
    contraste, focaveis, capturarBase, estadoFoco, desfocarAtivo,
    candidatosClicaveis, alvos, transbordo, cortes, aplicarEspacamento, removerEspacamento, sobreposicoes,
    borrar, desborrar,
  };
})();
