#!/usr/bin/env node
// Confere uma pasta de revisão antes da entrega.
//   node validar-achados.mjs revisoes/AAAA-MM-DD-<alvo>
// Erros impedem a entrega; avisos pedem uma olhada. Sai com código 1 se houver erro.
// O formato está descrito em formato/achados.md.
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const MODOS = ['1-revisao-de-tela', '2-auditoria-wcag', '3-revisao-de-pr', '4-fluxo-no-figma', '5-reteste'];
const AMBIENTES = ['local', 'homologacao', 'producao', 'nao-se-aplica'];
const GRAVIDADES = ['alta', 'media', 'baixa'];
const STATUS = ['continua', 'piorou'];
const PROVAS = ['medida', 'codigo', 'figma'];

const alvo = process.argv[2];
if (!alvo) {
  console.error('Uso: node validar-achados.mjs <pasta-da-revisao | achados.json>');
  process.exit(2);
}
const arquivo = alvo.endsWith('.json') ? alvo : path.join(alvo, 'achados.json');
const pasta = path.dirname(arquivo);
const erros = [];
const avisos = [];
const erro = (onde, msg) => erros.push(`${onde}: ${msg}`);
const aviso = (onde, msg) => avisos.push(`${onde}: ${msg}`);
const texto = (v) => typeof v === 'string' && v.trim().length > 0;
const existe = (p) => access(p).then(() => true, () => false);

let dados;
try {
  dados = JSON.parse(await readFile(arquivo, 'utf8'));
} catch (e) {
  console.error(`ERRO ${arquivo}: não consegui ler o JSON (${e.message})`);
  process.exit(1);
}

function conferirCriterio(onde, c, modo) {
  if (!c || typeof c !== 'object') return erro(onde, 'critério vazio');
  if (/^wcag/i.test(c.fonte || '')) {
    if (!/^[1-4]\.\d{1,2}\.\d{1,2}$/.test(c.numero || '')) erro(onde, `número WCAG inválido: "${c.numero}"`);
    if (c.numero === '4.1.1') erro(onde, '4.1.1 Parsing é obsoleto e foi removido na WCAG 2.2');
    if (!['A', 'AA', 'AAA'].includes(c.nivel)) erro(onde, `nível inválido: "${c.nivel}"`);
    if (c.nivel === 'AAA' && modo === '2-auditoria-wcag') aviso(onde, `${c.numero} é AAA, fora do escopo de uma auditoria AA`);
    if (!texto(c.nome)) erro(onde, 'falta o nome do critério');
    if (!/^https:\/\/www\.w3\.org\//.test(c.url || '')) erro(onde, 'o link do critério precisa ser da W3C (https://www.w3.org/...)');
  } else if (/nn\/?g/i.test(c.fonte || '')) {
    if (!texto(c.autor)) erro(onde, 'artigo da NN/g sem autor');
    if (!texto(c.titulo)) erro(onde, 'artigo da NN/g sem título');
    if (!/^https:\/\/www\.nngroup\.com\/articles\//.test(c.url || '')) erro(onde, 'link da NN/g precisa ser https://www.nngroup.com/articles/...');
    if (c.citacao) {
      const frases = c.citacao.trim().split(/(?<=[.!?])\s+(?=\S)/).filter(Boolean);
      if (frases.length > 1 || c.citacao.length > 300) erro(onde, 'citação da NN/g passa de uma frase');
    }
  } else {
    erro(onde, `fonte "${c.fonte}" não aceita: use WCAG 2.2 ou NN/g`);
  }
}

async function conferirProva(onde, item) {
  const p = item.prova;
  const l = item.local || {};
  if (!p || !PROVAS.includes(p.tipo)) return erro(onde, `prova ausente ou tipo inválido (use ${PROVAS.join(', ')})`);
  if (!texto(p.descricao)) erro(onde, 'prova sem descrição');
  if (p.tipo === 'medida' && (!p.valores || typeof p.valores !== 'object' || !Object.keys(p.valores).length)) erro(onde, 'prova do tipo medida sem valores medidos');
  if (p.tipo === 'codigo') {
    if (!texto(l.arquivo) || !Number.isInteger(l.linha)) erro(onde, 'prova de código precisa de local.arquivo e local.linha (número)');
    if (!texto(p.trecho)) erro(onde, 'prova de código sem trecho');
  }
  if (p.tipo === 'figma' && (!l.figma || !texto(l.figma.no) || !/^https:\/\/www\.figma\.com\//.test(l.figma.link || ''))) erro(onde, 'prova de Figma precisa de local.figma.no e local.figma.link');
  for (const pr of p.prints || []) {
    if (!(await existe(path.join(pasta, pr)))) erro(onde, `print não encontrado: ${pr}`);
  }
  if (p.script && !(await existe(path.join(pasta, p.script)))) erro(onde, `script não encontrado: ${p.script}`);
}

const r = dados.revisao || {};
if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) erro('revisao.data', 'use AAAA-MM-DD');
if (!MODOS.includes(r.modo)) erro('revisao.modo', `use um de: ${MODOS.join(', ')}`);
if (!texto(r.alvo)) erro('revisao.alvo', 'vazio');
if (!AMBIENTES.includes(r.ambiente)) erro('revisao.ambiente', `use um de: ${AMBIENTES.join(', ')}`);
if (r.modo === '5-reteste' && !texto(r.origem)) erro('revisao.origem', 'o reteste precisa apontar a pasta da revisão anterior');

const defeitos = Array.isArray(dados.defeitos) ? dados.defeitos : (erro('defeitos', 'precisa ser uma lista'), []);
const suspeitas = Array.isArray(dados.suspeitas) ? dados.suspeitas : (erro('suspeitas', 'precisa ser uma lista (pode ser vazia)'), []);
const ids = new Set();

for (const [i, d] of defeitos.entries()) {
  const onde = `defeitos[${i}] ${d.id || ''}`.trim();
  if (!/^D\d+$/.test(d.id || '')) erro(onde, 'id precisa ser D1, D2...');
  if (ids.has(d.id)) erro(onde, 'id repetido');
  ids.add(d.id);
  if (!texto(d.titulo)) erro(onde, 'sem título');
  if (!GRAVIDADES.includes(d.gravidade)) erro(onde, `gravidade precisa ser ${GRAVIDADES.join(', ')}`);
  if (!Array.isArray(d.criterios) || !d.criterios.length) erro(onde, 'todo defeito cita pelo menos um critério com fonte');
  else d.criterios.forEach((c, j) => conferirCriterio(`${onde} criterios[${j}]`, c, r.modo));
  const l = d.local || {};
  if (!texto(l.url) && !texto(l.seletor) && !texto(l.arquivo) && !l.figma) erro(onde, 'sem local (url, seletor, arquivo ou figma)');
  await conferirProva(onde, d);
  if (!texto(d.impacto)) erro(onde, 'sem impacto para quem usa');
  if (!texto(d.conferencia)) erro(onde, 'sem registro da conferência');
  if (r.modo === '5-reteste' && d.reteste && !STATUS.includes(d.reteste.status)) erro(onde, `reteste.status precisa ser ${STATUS.join(' ou ')} (corrigidos vão em "corrigidos")`);
  if (d.alcance && (!Number.isFinite(d.alcance.pessoas) || !texto(d.alcance.consulta))) erro(onde, 'alcance precisa de pessoas (número) e da consulta usada');
}

for (const [i, s] of suspeitas.entries()) {
  const onde = `suspeitas[${i}] ${s.id || ''}`.trim();
  if (!/^S\d+$/.test(s.id || '')) erro(onde, 'id precisa ser S1, S2...');
  if (ids.has(s.id)) erro(onde, 'id repetido');
  ids.add(s.id);
  if (!texto(s.titulo)) erro(onde, 'sem título');
  if (!texto(s.falta)) erro(onde, 'diga o que falta para confirmar');
}

if (r.modo === '5-reteste') {
  for (const [i, c] of (dados.corrigidos || []).entries()) {
    const onde = `corrigidos[${i}] ${c.origem || ''}`.trim();
    if (!texto(c.origem)) erro(onde, 'aponte o id na revisão anterior');
    await conferirProva(onde, c);
  }
}

const prioridade = Array.isArray(dados.prioridade) ? dados.prioridade : [];
if (defeitos.length && !prioridade.length) erro('prioridade', 'falta a lista "o que corrigir primeiro"');
for (const id of prioridade) if (!defeitos.some((d) => d.id === id)) erro('prioridade', `${id} não existe em defeitos`);
for (const d of defeitos) if (d.gravidade === 'alta' && !prioridade.includes(d.id)) aviso('prioridade', `${d.id} é alta e não está na lista do que corrigir primeiro`);
if (prioridade.length > 5) aviso('prioridade', 'mais de 5 itens; a lista perde a função');

const bruto = JSON.stringify(dados);
if (/baymard\.com/i.test(bruto)) erro('fontes', 'baymard.com não pode ser usado (os termos proíbem extração automatizada)');
if (/[\u2014\u2013]/.test(bruto)) aviso('texto', 'há travessão (U+2014 ou U+2013); reescreva com vírgula, dois-pontos ou parênteses');
const pessoais = bruto.match(/[\w.+-]+@(?!exemplo\.com)[\w-]+\.[\w.-]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g);
if (pessoais) aviso('dados pessoais', `possíveis dados pessoais no texto: ${[...new Set(pessoais)].slice(0, 3).join(', ')}`);

const relatorio = path.join(pasta, 'relatorio.md');
if (!(await existe(relatorio))) erro('relatorio.md', 'não encontrado na pasta');
else {
  const md = await readFile(relatorio, 'utf8');
  if (!/^##\s+O que corrigir primeiro/im.test(md)) erro('relatorio.md', 'falta a seção "## O que corrigir primeiro" no topo');
  for (const d of defeitos) if (!new RegExp(`\\b${d.id}\\b`).test(md)) aviso('relatorio.md', `${d.id} não aparece no relatório`);
  if (/[\u2014\u2013]/.test(md)) aviso('relatorio.md', 'há travessão (U+2014 ou U+2013)');
}

for (const e of erros) console.log(`ERRO  ${e}`);
for (const a of avisos) console.log(`AVISO ${a}`);
console.log(`${defeitos.length} defeitos, ${suspeitas.length} suspeitas. ${erros.length} erros, ${avisos.length} avisos.`);
process.exit(erros.length ? 1 : 0);
