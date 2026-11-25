// Configuração do ux-review, lida do ambiente (fator III dos 12 fatores).
// Cada valor tem um padrão; um valor inválido interrompe na hora, com a
// variável e o motivo, em vez de seguir com um comportamento inesperado.
//
//   node config.mjs   mostra a configuração efetiva (sem valores de credencial)

export const VARIAVEIS = [
  { nome: 'UXR_LARGURAS', padrao: '320,390,768,1280', descricao: 'Larguras padrão em px, separadas por vírgula (entre 200 e 3840).' },
  { nome: 'UXR_ALTURA', padrao: '800', descricao: 'Altura da janela em px (entre 200 e 2160).' },
  { nome: 'UXR_TEMPO_LIMITE_MS', padrao: '60000', descricao: 'Tempo máximo para carregar uma página, em milissegundos.' },
  { nome: 'UXR_VISIVEL', padrao: '0', descricao: '1 abre o navegador com janela (para depurar o script).' },
  { nome: 'UXR_PERMITIR_ESCRITA', padrao: '', descricao: 'Expressão regular de URLs que podem receber POST em produção (ex.: login).' },
  { nome: 'UXR_PALAVRAS_DE_RISCO', padrao: '', descricao: 'Palavras extras, separadas por vírgula, que bloqueiam cliques em produção.' },
  { nome: 'UXR_USUARIO', padrao: '', descricao: 'Usuário de login do alvo. Nunca é gravado.', segredo: true },
  { nome: 'UXR_SENHA', padrao: '', descricao: 'Senha de login do alvo. Nunca é gravada.', segredo: true },
  { nome: 'UX_REVIEW_DIR', padrao: '<CLAUDE_CONFIG_DIR ou ~/.claude>/ux-review', descricao: 'Pasta de apoio instalada.' },
  { nome: 'CLAUDE_CONFIG_DIR', padrao: '~/.claude', descricao: 'Pasta de configuração do Claude Code (destino da instalação).' },
];

const VERDADEIRO = new Set(['1', 'true', 'sim', 'yes']);

function erro(variavel, motivo) {
  return new Error(`Configuração inválida em ${variavel}: ${motivo}`);
}

function inteiro(env, nome, padrao, min, max) {
  const bruto = env[nome];
  if (bruto === undefined || bruto === '') return padrao;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < min || n > max) throw erro(nome, `"${bruto}" precisa ser um inteiro entre ${min} e ${max}.`);
  return n;
}

export function lerConfig(env = process.env) {
  let larguras = [320, 390, 768, 1280];
  if (env.UXR_LARGURAS) {
    larguras = env.UXR_LARGURAS.split(',').map((s) => s.trim()).filter(Boolean).map(Number);
    if (!larguras.length || larguras.some((n) => !Number.isInteger(n) || n < 200 || n > 3840)) {
      throw erro('UXR_LARGURAS', `"${env.UXR_LARGURAS}" precisa ser uma lista de inteiros entre 200 e 3840, separados por vírgula.`);
    }
  }
  let permitirEscrita = [];
  if (env.UXR_PERMITIR_ESCRITA) {
    try { permitirEscrita = [new RegExp(env.UXR_PERMITIR_ESCRITA)]; } catch (e) { throw erro('UXR_PERMITIR_ESCRITA', `expressão regular inválida (${e.message}).`); }
  }
  const palavrasDeRiscoExtras = (env.UXR_PALAVRAS_DE_RISCO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (palavrasDeRiscoExtras.some((p) => !/^[\p{L}\p{N} -]+$/u.test(p))) {
    throw erro('UXR_PALAVRAS_DE_RISCO', 'use só letras, números, espaços e hífens.');
  }
  return {
    larguras,
    altura: inteiro(env, 'UXR_ALTURA', 800, 200, 2160),
    tempoLimiteMs: inteiro(env, 'UXR_TEMPO_LIMITE_MS', 60000, 1000, 600000),
    visivel: VERDADEIRO.has(String(env.UXR_VISIVEL || '').toLowerCase()),
    permitirEscrita,
    palavrasDeRiscoExtras,
  };
}

// Configuração efetiva para exibir: valores de segredo viram "definida" ou "não definida".
export function descreverConfig(env = process.env) {
  return VARIAVEIS.map((v) => {
    const definida = env[v.nome] !== undefined && env[v.nome] !== '';
    const valor = v.segredo ? (definida ? 'definida' : 'não definida') : (definida ? env[v.nome] : `(padrão) ${v.padrao || 'vazio'}`);
    return { variavel: v.nome, valor, descricao: v.descricao };
  });
}

const ehPrincipal = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (ehPrincipal) {
  try {
    lerConfig();
    for (const l of descreverConfig()) console.log(`${l.variavel.padEnd(22)} ${l.valor}\n${' '.repeat(23)}${l.descricao}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
