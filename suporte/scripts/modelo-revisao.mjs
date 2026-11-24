#!/usr/bin/env node
// Modelo de script de revisão. O ux-review copia este arquivo para
// revisoes/AAAA-MM-DD-<alvo>/revisao.mjs, ajusta CONFIG e PASSOS e roda com:
//   node revisoes/AAAA-MM-DD-<alvo>/revisao.mjs
// Grava medidas-revisao.json e prints/ na mesma pasta. Rodar de novo deve dar
// o mesmo resultado (é o que o modo 5, reteste, faz).
//
// Credenciais: só por variável de ambiente (credencial('UXR_USUARIO')).
// Nunca escreva valores de senha, token ou dado pessoal neste arquivo.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Pasta de apoio: UX_REVIEW_DIR, ou <CLAUDE_CONFIG_DIR ou ~/.claude>/ux-review.
const APOIO = process.env.UX_REVIEW_DIR || path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'ux-review');
const m = await import(pathToFileURL(path.join(APOIO, 'scripts', 'medidas.mjs')).href);

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const PRINTS = path.join(PASTA, 'prints');

const CONFIG = {
  url: 'https://exemplo.com/',
  ambiente: undefined, // 'local' | 'homologacao' | 'producao'; sem valor, decide pela URL (na dúvida, produção)
  larguras: m.LARGURAS_PADRAO,
  altura: m.ALTURA_PADRAO,
  borrar: [], // seletores extras com dado pessoal (ex.: '.nome-do-cliente')
  permitirEscrita: [], // RegExp de URLs que podem receber POST em produção (ex.: /\/login$/)
};

// Cada passo recebe { page, ambiente, largura, registrar } e devolve nada.
// Use m.cliqueSeguro para clicar: em produção ele recusa pagar, confirmar,
// enviar ou finalizar. registrar(nome, dados) guarda uma medida do passo.
const PASSOS = [
  {
    nome: 'inicio',
    async executar({ page, registrar }) {
      registrar('titulo', await page.title());
    },
  },
  // Exemplo de janela modal:
  // {
  //   nome: 'abrir-detalhes',
  //   async executar({ page, ambiente, registrar }) {
  //     await page.locator('#abrir-detalhes').focus();
  //     await page.keyboard.press('Enter');
  //     await page.waitForTimeout(300);
  //     registrar('focoDepoisDeAbrir', await page.evaluate(() => window.__uxr.estadoFoco()));
  //     registrar('trilhaComJanelaAberta', await m.trilhaDeTab(page, { inicio: 'atual', maxPassos: 15 }));
  //     registrar('clicaveisSemTeclado', await m.clicaveisSemTeclado(page));
  //     await page.keyboard.press('Escape');
  //     await page.waitForTimeout(200);
  //     registrar('janelaVisivelDepoisDeEsc', await page.locator('#detalhes').isVisible());
  //   },
  // },
];

const ambiente = m.tipoDeAmbiente(CONFIG.url, CONFIG.ambiente);
const nav = await m.abrirNavegador({ ambiente, permitirEscrita: CONFIG.permitirEscrita });
const saida = { url: CONFIG.url, ambiente, data: new Date().toISOString(), versoes: await m.versoes(nav), larguras: {} };

try {
  for (const largura of CONFIG.larguras) {
    const page = await nav.novaPagina({ largura, altura: CONFIG.altura });
    await m.irPara(page, CONFIG.url);
    const porPasso = {};
    for (const passo of PASSOS) {
      const dados = {};
      const registrar = (nome, valor) => { dados[nome] = valor; };
      try {
        await passo.executar({ page, ambiente, largura, registrar });
      } catch (e) {
        dados.erro = String(e.message || e).slice(0, 300);
      }
      dados.print = (await m.printar(page, path.join(PRINTS, `${passo.nome}-${largura}.png`), { borrar: CONFIG.borrar })).arquivo;
      porPasso[passo.nome] = dados;
    }
    saida.larguras[largura] = { passos: porPasso, errosJs: page.__errosJs || [] };
    await page.context().close();
  }
} finally {
  saida.requisicoesBloqueadas = nav.bloqueadas;
  await nav.fechar();
}

await m.salvarJson(path.join(PASTA, 'medidas-revisao.json'), saida);
console.log(`Medidas em ${path.join(PASTA, 'medidas-revisao.json')}`);
