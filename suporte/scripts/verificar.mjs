#!/usr/bin/env node
// Diagnóstico da instalação do ux-review. Roda a partir da pasta de apoio
// instalada (<destino>/ux-review/scripts/verificar.mjs).
//   node verificar.mjs [--json]
// Sai com código 1 se algum item obrigatório falhar. Avisos não bloqueiam.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerConfig } from './config.mjs';

const APOIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.dirname(APOIO);
const AGENTE = path.join(BASE, 'agents', 'ux-review.md');
const require = createRequire(path.join(APOIO, 'package.json'));
const itens = [];
const ok = (item, detalhe) => itens.push({ estado: 'ok', item, detalhe });
const aviso = (item, detalhe) => itens.push({ estado: 'aviso', item, detalhe });
const falha = (item, detalhe) => itens.push({ estado: 'falha', item, detalhe });
const lerJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Node
const maior = Number(process.versions.node.split('.')[0]);
if (maior >= 22) ok('Node.js', process.versions.node); else falha('Node.js', `${process.versions.node}; precisa de 22 ou mais novo`);

// Pasta de apoio e versão instalada
const pacote = lerJson(path.join(APOIO, 'package.json'));
const marca = path.join(APOIO, '.versao');
if (existsSync(marca)) {
  const v = lerJson(marca);
  if (v.versao === pacote.version) ok('Versão instalada', `${v.versao} (instalada em ${v.instaladoEm})`);
  else aviso('Versão instalada', `.versao diz ${v.versao}, package.json diz ${pacote.version}; rode o instalador de novo`);
} else {
  aviso('Versão instalada', `sem o arquivo .versao em ${APOIO}; rode o instalador de novo`);
}

// Dependências declaradas e instaladas nas versões exatas
for (const [nome, esperada] of Object.entries(pacote.dependencies || {})) {
  try {
    const instalada = require(`${nome}/package.json`).version;
    if (instalada === esperada) ok(`Dependência ${nome}`, instalada);
    else falha(`Dependência ${nome}`, `instalada ${instalada}, esperada ${esperada}; rode npm ci em ${APOIO}`);
  } catch {
    falha(`Dependência ${nome}`, `não instalada; rode npm ci em ${APOIO}`);
  }
}

// Chromium do Playwright
try {
  const { chromium } = require('playwright');
  const exe = chromium.executablePath();
  if (existsSync(exe)) ok('Chromium do Playwright', exe);
  else falha('Chromium do Playwright', `não encontrado; rode: node "${path.join(APOIO, 'node_modules', 'playwright', 'cli.js')}" install chromium`);
} catch {
  falha('Chromium do Playwright', 'Playwright não instalado');
}

// Arquivo do agente
if (!existsSync(AGENTE)) {
  falha('Agente', `não encontrado em ${AGENTE}`);
} else {
  const texto = readFileSync(AGENTE, 'utf8');
  const caminho = APOIO.replace(/\\/g, '/');
  if (texto.includes('{{UX_REVIEW_DIR}}')) falha('Agente', 'o caminho da pasta de apoio não foi preenchido; rode o instalador');
  else if (!texto.includes(caminho)) aviso('Agente', `aponta para outra pasta de apoio, não para ${caminho}`);
  else ok('Agente', AGENTE);
  const guarda = path.join(APOIO, 'guardas', 'somente-leitura.mjs');
  if (existsSync(guarda)) ok('Guarda de somente leitura', guarda); else falha('Guarda de somente leitura', `não encontrada em ${guarda}`);
}

// Configuração do ambiente
try {
  const c = lerConfig();
  ok('Configuração', `larguras ${c.larguras.join(', ')}; altura ${c.altura}`);
} catch (e) {
  falha('Configuração', e.message);
}

// Memória do agente depende da memória automática do Claude Code
if (process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY) aviso('Memória', 'CLAUDE_CODE_DISABLE_AUTO_MEMORY está definida; o agente não terá memória');
else ok('Memória', 'sem bloqueio por variável de ambiente (confira também a configuração autoMemoryEnabled)');

// Ferramentas opcionais por modo
const versaoDe = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').split('\n')[0].trim() : null;
};
const gh = versaoDe('gh', ['--version']);
if (gh) {
  const auth = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (auth.status === 0) ok('GitHub CLI (modo 3)', gh); else aviso('GitHub CLI (modo 3)', `${gh}, mas sem login (gh auth login)`);
} else {
  aviso('GitHub CLI (modo 3)', 'gh não encontrado; o modo 3 não funciona sem ele');
}

const json = process.argv.includes('--json');
if (json) {
  process.stdout.write(JSON.stringify({ apoio: APOIO, versao: pacote.version, itens }, null, 2) + '\n');
} else {
  const marcas = { ok: 'ok   ', aviso: 'aviso', falha: 'FALHA' };
  for (const i of itens) console.log(`${marcas[i.estado]}  ${i.item}: ${i.detalhe}`);
  const n = (e) => itens.filter((i) => i.estado === e).length;
  console.log(`\n${n('falha')} falhas, ${n('aviso')} avisos.`);
}
process.exit(itens.some((i) => i.estado === 'falha') ? 1 : 0);
