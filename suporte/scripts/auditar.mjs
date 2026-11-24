#!/usr/bin/env node
// Coleta automática de medidas de uma URL em várias larguras.
// Uso:
//   node auditar.mjs --url https://exemplo.com --saida revisoes/2026-01-15-exemplo
//     [--larguras 320,390,768,1280] [--altura 800] [--ambiente local|homologacao|producao]
//     [--permitir-escrita "regex"] [--estado arquivo.json] [--escopo main]
//     [--tab-larguras 320,1280] [--max-tab 80] [--borrar ".nome,.endereco"] [--sem-axe]
// Grava <saida>/medidas.json e prints em <saida>/prints/. Não clica em nada:
// só navega (GET) e pressiona Tab.
import path from 'node:path';
import {
  LARGURAS_PADRAO, ALTURA_PADRAO, abrirNavegador, irPara, rodarAxe, medirContraste, medirAlvos, clicaveisSemTeclado,
  medirReflow, medirEspacamento, medirSobreposicao, trilhaDeTab, printar, salvarJson, tipoDeAmbiente, versoes,
} from './medidas.mjs';

function argumentos(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const nome = k.slice(2);
    const prox = argv[i + 1];
    if (prox === undefined || prox.startsWith('--')) a[nome] = true;
    else { a[nome] = prox; i++; }
  }
  return a;
}

const lista = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);

const a = argumentos(process.argv.slice(2));
if (!a.url || !a.saida) {
  console.error('Uso: node auditar.mjs --url <url> --saida <pasta> [--larguras 320,390,768,1280] [--ambiente producao]');
  process.exit(2);
}

const larguras = a.larguras ? lista(a.larguras).map(Number) : LARGURAS_PADRAO;
const altura = a.altura ? Number(a.altura) : ALTURA_PADRAO;
const ambiente = tipoDeAmbiente(a.url, a.ambiente);
const tabLarguras = a['tab-larguras'] ? lista(a['tab-larguras']).map(Number) : [Math.min(...larguras), Math.max(...larguras)];
const borrar = a.borrar ? lista(a.borrar) : [];
const prints = path.join(a.saida, 'prints');

const nav = await abrirNavegador({ ambiente, permitirEscrita: a['permitir-escrita'] ? [new RegExp(a['permitir-escrita'])] : [] });
const resultado = {
  url: a.url,
  data: new Date().toISOString(),
  ambiente,
  versoes: await versoes(nav),
  altura,
  larguras: {},
};

try {
  for (const largura of larguras) {
    const page = await nav.novaPagina({ largura, altura, estado: a.estado });
    await irPara(page, a.url);
    const r = {};
    r.titulo = await page.title();
    r.urlFinal = page.url();
    if (!a['sem-axe']) r.axe = await rodarAxe(page, { escopo: a.escopo });
    r.contraste = await medirContraste(page, { escopo: a.escopo });
    r.alvos = await medirAlvos(page);
    r.clicaveisSemTeclado = await clicaveisSemTeclado(page);
    r.reflow = await medirReflow(page);
    r.sobreposicao = await medirSobreposicao(page);
    r.espacamento = await medirEspacamento(page, {
      printDepois: path.join(prints, `espacamento-${largura}.png`),
    });
    r.print = (await printar(page, path.join(prints, `pagina-${largura}.png`), { borrar })).arquivo;
    if (tabLarguras.includes(largura)) {
      r.teclado = await trilhaDeTab(page, { maxPassos: Number(a['max-tab'] || 80), pastaPrints: path.join(prints, `foco-${largura}`) });
    }
    r.errosJs = page.__errosJs || [];
    resultado.larguras[largura] = r;
    await page.context().close();
  }
} finally {
  resultado.requisicoesBloqueadas = nav.bloqueadas;
  await nav.fechar();
}

await salvarJson(path.join(a.saida, 'medidas.json'), resultado);

// Resumo curto no terminal. Os detalhes ficam em medidas.json.
for (const [largura, r] of Object.entries(resultado.larguras)) {
  const axe = r.axe ? `${r.axe.violacoes.length} regras violadas, ${r.axe.incompletos.length} a conferir` : 'axe desligado';
  const contraste = r.contraste.filter((c) => !c.passa && !c.isento).length;
  const alvos = r.alvos.filter((x) => !x.excecao).length;
  const semFoco = r.teclado ? r.teclado.passos.filter((p) => p.mudancaVisual === false).length : '-';
  const encobertos = r.teclado ? r.teclado.passos.filter((p) => p.encoberto === 'total').length : '-';
  console.log(`[${largura}px] axe: ${axe} | contraste abaixo: ${contraste} | alvos < 24px sem exceção: ${alvos} | rolagem horizontal: ${r.reflow.rolagemHorizontal ? 'sim' : 'não'} | cortes com espaçamento: ${r.espacamento.novosCortes.length} | foco sem mudança visual: ${semFoco} | foco encoberto: ${encobertos}`);
}
if (resultado.requisicoesBloqueadas.length) console.log(`Requisições de escrita bloqueadas (produção): ${resultado.requisicoesBloqueadas.length}`);
console.log(`Medidas em ${path.join(a.saida, 'medidas.json')}`);
