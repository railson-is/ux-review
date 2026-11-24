#!/usr/bin/env node
// Guarda PreToolUse do ux-review (declarada no frontmatter do agente).
// Rede de segurança, não sandbox: bloqueia os jeitos comuns de escrever fora
// da pasta da revisão, mexer no git, comentar em PR, abrir issue ou alterar
// arquivos pelo Figma, PostHog e outros conectores. As regras do agente
// continuam valendo para o que esta guarda não enxerga.
import os from 'node:os';

function negar(motivo) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `ux-review é somente leitura. ${motivo}`,
    },
  }));
  process.exit(0);
}

const normal = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();

// Onde o agente pode gravar: a pasta da revisão, a própria memória e pastas temporárias.
function podeGravar(caminho, entrada) {
  const p = normal(caminho);
  if (/(^|\/)revisoes\/\d{4}-\d{2}-\d{2}-[^/]+(\/|$)/.test(p)) return true;
  if (/\/agent-memory(-local)?\/ux-review\//.test(p)) return true;
  const temporarias = [os.tmpdir(), entrada.scratchpad_dir].filter(Boolean).map(normal);
  return temporarias.some((t) => p.startsWith(t.endsWith('/') ? t : `${t}/`));
}

const COMANDOS_PROIBIDOS = [
  [/\bgit\s+(?:-C\s+\S+\s+)?(commit|push|checkout|switch|reset|restore|stash|merge|rebase|cherry-pick|revert|apply|am|add|rm|mv|clean|clone|worktree|tag|pull|init)\b/i, 'Git só para leitura (log, show, diff, blame, status).'],
  [/\bgh\s+pr\s+(comment|review|merge|close|reopen|edit|create|ready|checkout|lock|unlock|update-branch)\b/i, 'Não comenta, não aprova e não faz checkout de PR.'],
  [/\bgh\s+issue\s+(create|comment|edit|close|reopen|delete|transfer|lock|unlock|pin|unpin|develop)\b/i, 'Não abre nem comenta issue; o texto da issue vai no relatório.'],
  [/\bgh\s+(repo\s+(create|edit|delete|fork|clone|rename|archive|sync)|release\s+(create|edit|delete|upload)|label\s+(create|edit|delete|clone)|gist\s+(create|edit|delete)|workflow\s+(run|enable|disable)|run\s+(rerun|cancel|delete)|secret|variable|cache\s+delete)\b/i, 'Comando gh que altera o repositório.'],
  [/\b(npm|pnpm|yarn|bun)\s+(publish|unpublish|deprecate|dist-tag|owner|access)\b/i, 'Publicação de pacote.'],
  [/\bsed\s+(-[a-z]*i|--in-place)/i, 'Edição de arquivo no lugar.'],
  [/\bperl\s+-[a-z]*i/i, 'Edição de arquivo no lugar.'],
  [/\bcurl\b[^|;&]*(\s-X\s*(POST|PUT|PATCH|DELETE)\b|\s--request\s+(POST|PUT|PATCH|DELETE)\b|\s(-d|--data[a-z-]*|-F|--form)\s)/i, 'Requisição que envia dados.'],
  [/\bInvoke-(WebRequest|RestMethod)\b[^|;]*-Method\s+(Post|Put|Patch|Delete)\b/i, 'Requisição que envia dados.'],
];

// Comandos que escrevem em disco: só valem se o comando citar a pasta da revisão
// ou uma pasta temporária.
const ESCRITA_EM_DISCO = /(\b(rm|rmdir|mv|cp|touch|tee|truncate|chmod|chown|ln|mkdir)\s)|\b(Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|New-Item|Clear-Content)\b|(^|[^0-9&>=\-])>{1,2}\s*(?!&|\/dev\/null|\$null|nul\b)[^\s>]/i;

function conferirComando(comando, entrada) {
  const c = String(comando || '');
  for (const [re, motivo] of COMANDOS_PROIBIDOS) if (re.test(c)) negar(motivo);
  if (/\b(npm|pnpm|yarn|bun)\s+(install|i|add|remove|uninstall|update|up|ci)\b/i.test(c) && !/\.claude[\\/]+ux-review\b/i.test(c)) {
    negar('Instalar ou remover pacotes muda o projeto; só a pasta de apoio (~/.claude/ux-review) pode receber npm ci.');
  }
  if (/\bgh\s+api\b/i.test(c)) {
    const graphqlLeitura = /\bgh\s+api\s+graphql\b/i.test(c) && !/\bmutation\b/i.test(c);
    const escreve = /(\s-X\s*|\s--method[\s=]+)(POST|PUT|PATCH|DELETE)\b/i.test(c) || /\s(-f|-F|--field|--raw-field|--input)\s/.test(c);
    if (escreve && !graphqlLeitura) negar('gh api só com GET (sem -X POST/PUT/PATCH/DELETE e sem -f/-F).');
  }
  // Texto entre aspas (padrões de grep, código em node -e) não conta como redirecionamento.
  const semAspas = c.replace(/'[^']*'|"[^"]*"/g, '""');
  if (ESCRITA_EM_DISCO.test(semAspas)) {
    const n = normal(c);
    const citaRevisao = /revisoes\/\d{4}-\d{2}-\d{2}-/.test(n);
    const temporarias = [os.tmpdir(), entrada.scratchpad_dir].filter(Boolean).map(normal);
    const citaTemporaria = temporarias.some((t) => n.includes(t)) || /\$(env:)?te?mp\b|%temp%|\/tmp\//i.test(c);
    if (!citaRevisao && !citaTemporaria) negar('Comandos que gravam em disco só podem mirar revisoes/AAAA-MM-DD-<alvo>/ ou uma pasta temporária.');
  }
}

// Conectores (Figma, PostHog, GitHub e outros): só ferramentas de leitura.
const PERMITIDAS_MCP = new Set(['create_session']); // o conector do Figma pede uma sessão antes das leituras
const ESCRITA_MCP = /(^|[-_])(create|update|delete|remove|add|send|upload|publish|post|comment|reply|merge|edit|write|set|patch|put|archive|destroy|generate|use|export|move|rename|resolve|assign|close|reopen|submit|approve|invite|share|install|deploy|trigger|duplicate|enable|disable)([-_]|$)/i;

function conferirMcp(nome) {
  const sufixo = nome.split('__').pop();
  if (PERMITIDAS_MCP.has(sufixo)) return;
  if (/^weave_/i.test(sufixo)) negar(`A ferramenta ${sufixo} gera conteúdo novo.`);
  if (ESCRITA_MCP.test(sufixo)) negar(`A ferramenta ${sufixo} parece alterar dados; só leitura é permitida.`);
}

let bruto = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { bruto += d; });
process.stdin.on('end', () => {
  let entrada;
  try { entrada = JSON.parse(bruto); } catch { process.exit(0); }
  const nome = entrada.tool_name || '';
  const t = entrada.tool_input || {};
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(nome)) {
    const alvo = t.file_path || t.notebook_path;
    if (!podeGravar(alvo, entrada)) negar(`Só grava em revisoes/AAAA-MM-DD-<alvo>/, na própria memória ou em pasta temporária. Tentou: ${alvo}`);
  } else if (nome === 'Bash' || nome === 'PowerShell') {
    conferirComando(t.command, entrada);
  } else if (nome.startsWith('mcp__')) {
    conferirMcp(nome);
  }
  process.exit(0);
});
