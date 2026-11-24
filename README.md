# ux-review

Subagente do [Claude Code](https://code.claude.com/docs/en/overview) que revisa experiência de uso e acessibilidade. Ele só relata o que falhou, e cada defeito vem com prova medida e com critério de fonte reconhecida: WCAG 2.2 (W3C) ou artigo público da Nielsen Norman Group. É somente leitura: não edita código nem Figma, não comenta em PR e não abre issue.

## Modos

Um modo por vez, só quando pedido.

| Modo | O que faz | Exemplo de pedido |
|---|---|---|
| 1. Revisão de tela ou fluxo | Percorre a tela ou o fluxo num navegador real (Chromium), em várias larguras, e mede o que atrapalha: retorno que não vem, erro que não explica, conteúdo cortado ou sobreposto. | "Use o ux-review no modo 1 no fluxo de cadastro de https://exemplo.com/cadastro, em homologação." |
| 2. Auditoria WCAG 2.2 AA | axe-core primeiro, depois verificação manual de contraste, foco visível, ordem do foco, teclado, janela modal, alvo de toque, reflow e espaçamento de texto. | "Use o ux-review no modo 2 em https://www.w3.org/WAI/demos/bad/before/home.html" |
| 3. Revisão de PR | Lê o PR pelo `gh`, sem checkout, e aponta só o que muda para quem usa, com `arquivo:linha`. | "Use o ux-review no modo 3 no PR 42 de dono/repo." |
| 4. Fluxo no Figma | Avalia um fluxo desenhado no Figma pelo conector oficial, só leitura: passos, estados que faltam, texto, contraste e alvos. | "Use o ux-review no modo 4 em https://www.figma.com/design/ARQUIVO/Nome?node-id=1-2" |
| 5. Reteste | Refaz as medidas de uma revisão anterior e diz o que foi corrigido, continua ou piorou. | "Use o ux-review no modo 5 em revisoes/2026-01-15-exemplo-com-cadastro" |

A página BAD (https://www.w3.org/WAI/demos/bad/) é uma demonstração pública da W3C feita com falhas de propósito; serve para ver o agente funcionando.

Opcionais, só se você pedir:

- **Alcance no PostHog:** "pode consultar o PostHog" no pedido. O agente conta quantas pessoas passam pelo lugar de cada defeito (só números agregados).
- **Texto de issue:** "escreva o texto das issues". O texto fica em `issues.md`; quem publica é você.

## Como ele trabalha

- **Prova antes de defeito.** Cada defeito tem um valor medido (estilo computado, posição, contraste calculado, trilha de Tab real), um trecho de código com `arquivo:linha` ou um frame do Figma com o valor lido. Sem prova, o item vai para Suspeitas, separado, com o que falta para confirmar.
- **Critério com fonte.** Número, nome oficial e nível da WCAG 2.2 com link da W3C, ou artigo da NN/g com autor, título e link.
- **Gravidade** alta, média ou baixa, pelo efeito em quem usa (régua em `suporte/regras/gravidade.md`).
- **Conferência obrigatória** antes de entregar: o agente tenta derrubar cada achado. O que cai sai ou vira suspeita.
- **Memória** para aprender com as suas correções: quando você contestar um achado, peça para o ux-review registrar. Usa a memória persistente de subagentes do Claude Code (`memory: user`, em `~/.claude/agent-memory/ux-review/`), que depende da memória automática estar ligada.
- **Guarda de somente leitura:** um hook `PreToolUse` no próprio agente bloqueia escrita fora da pasta da revisão, comandos git e gh que alteram algo, e ferramentas de conectores que criam ou editam.

## Saída

Uma pasta por revisão, no diretório em que o Claude Code está aberto:

```
revisoes/2026-01-15-exemplo-com-cadastro/
├── relatorio.md     "O que corrigir primeiro" no topo, depois defeitos, suspeitas e limites
├── achados.json     os mesmos dados em formato fixo (lido pelo banco de provas)
├── prints/          imagens citadas, com dados pessoais borrados
├── revisao.mjs      o script usado (permite o reteste)
└── medidas.json     medidas brutas
```

Exemplo do formato em `suporte/formato/exemplo/`.

## Requisitos

| Para | Precisa de |
|---|---|
| Todos os modos | Claude Code com suporte a subagentes com `memory` e `hooks` no frontmatter; Node.js 20 ou mais novo |
| Modos 1, 2 e 5 (navegador) | Playwright e Chromium, axe-core (o instalador baixa pelo npm, sem CDN) |
| Modo 3 (PR) | [GitHub CLI](https://cli.github.com/) autenticado (`gh auth status`) com acesso de leitura ao repositório |
| Modo 4 (Figma) | Conector oficial da Figma (servidor MCP) configurado no Claude Code, com acesso ao arquivo |
| Alcance (opcional) | Conector MCP do PostHog configurado, com acesso de leitura ao projeto |

## Instalação

O instalador copia `agents/ux-review.md` para `~/.claude/agents/` e `suporte/` para `~/.claude/ux-review/`, preenche o caminho absoluto da pasta de apoio no agente e instala axe-core, Playwright e o Chromium do Playwright. Se `CLAUDE_CONFIG_DIR` estiver definida, ela substitui `~/.claude`. Uma reinstalação substitui os arquivos dessas duas pastas e mantém `node_modules`.

Linux, macOS ou Git Bash:

```bash
git clone <url-deste-repositório> ux-review
cd ux-review
./instalar.sh
```

Windows (PowerShell):

```powershell
git clone <url-deste-repositório> ux-review
cd ux-review
powershell -ExecutionPolicy Bypass -File .\instalar.ps1
```

Opções: `--destino <pasta>` / `-Destino <pasta>` instala em outra pasta; `--sem-dependencias` / `-SemDependencias` pula o npm e o Chromium.

A pasta `suporte/` tem um `.npmrc` que fixa o registro público do npm, para que um registro privado configurado na máquina não interfira na instalação.

Depois, abra uma nova sessão do Claude Code. O agente aparece como `ux-review`.

## Login e credenciais

O agente nunca recebe senha pelo chat. Defina variáveis de ambiente antes de abrir o Claude Code e diga os nomes no pedido (padrão `UXR_USUARIO` e `UXR_SENHA`):

```bash
export UXR_USUARIO='pessoa@exemplo.com'
read -rs UXR_SENHA && export UXR_SENHA
claude
```

```powershell
$env:UXR_USUARIO = 'pessoa@exemplo.com'
$s = Read-Host 'Senha' -AsSecureString
$env:UXR_SENHA = [System.Net.NetworkCredential]::new('', $s).Password
claude
```

As variáveis valem só para aquele terminal e para o que for aberto a partir dele.

Em produção (todo alvo que não seja localhost, `*.localhost`, `*.test` ou declarado homologação), o navegador de teste bloqueia requisições que não sejam GET e o agente não clica em nada que pague, confirme, envie ou finalize.

## Personalização

| O que | Onde |
|---|---|
| Larguras padrão | `LARGURAS_PADRAO` em `suporte/scripts/medidas.mjs` (ou peça outras larguras no pedido) |
| Palavras que bloqueiam cliques em produção | `PALAVRAS_DE_RISCO` em `suporte/scripts/medidas.mjs` |
| Régua de gravidade | `suporte/regras/gravidade.md` |
| Formato do relatório | `suporte/formato/relatorio.md` e `suporte/formato/achados.md` |
| O que a guarda bloqueia | `suporte/guardas/somente-leitura.mjs` |
| Instruções do agente | `agents/ux-review.md` e `suporte/modos/` |
| Memória aprendida | `~/.claude/agent-memory/ux-review/` (pode ler, editar e apagar) |

Depois de mudar algo, rode o instalador de novo e, se mexeu nas instruções, rode o banco de provas.

## Banco de provas

Casos com resposta conhecida, para medir falso positivo e falso negativo quando as instruções mudarem. Fica em `banco-de-provas/` e não é instalado.

| Caso | Modo | Defeitos | Armadilhas (não devem ser relatadas) |
|---|---|---|---|
| 01-contraste | 2 | 4 (1.4.3, 1.4.11) | texto grande, negrito grande, componente inativo, fundo semitransparente, texto oculto |
| 02-teclado-e-foco | 2 | 4 (2.1.1, 2.4.7, 2.4.3, 2.4.11) | foco por sombra, link de pular, botão ARIA correto |
| 03-modal | 2 | 3 (2.4.3, 2.1.1, 4.1.2) | `dialog` nativo correto |
| 04-alvos-reflow-espacamento | 2 | 3 (2.5.8, 1.4.10, 1.4.12) | alvo em frase, alvo pequeno isolado, tabela com rolagem própria, caixa com folga |
| 05-pagina-sem-defeitos | 2 | 0 | qualquer achado é falso positivo |
| 06-pr-formulario | 3 | 4 (2.4.7, 3.3.2, 2.1.1, 1.4.3) | troca de nome de variável, melhoria de ARIA, cor que passa |

Preparação (uma vez):

```bash
npm ci
npx playwright install chromium
npm run testar
```

**Calibração dos scripts** (sem o agente): mostra o que as medições automáticas detectam sozinhas e se marcam alguma armadilha. Resultado atual: 10 de 14 defeitos das páginas, nenhuma marcação indevida. Os outros 4 (contraste de ícone e as três falhas da janela modal) dependem do roteiro que o agente escreve.

```bash
npm run banco:calibrar
```

**Avaliação do agente:**

1. Num terminal, sirva as páginas: `npm run banco:servir` (porta 4173).
2. Abra o Claude Code numa pasta **fora deste repositório**, para o agente não ler os gabaritos.
3. Para cada caso, gere o pedido e cole no Claude Code: `node banco-de-provas/banco.mjs pedido 01-contraste`. No caso de PR, o comando copia o diff para uma pasta temporária e o pedido aponta para lá.
4. Compare o resultado com o gabarito:
   ```bash
   node banco-de-provas/banco.mjs avaliar --caso 01-contraste --achados <pasta>/revisoes/<data>-<alvo>/achados.json
   ```
   Vários casos de uma vez: repita `--caso` e `--achados` em pares. `--saida resultado.json` grava o resumo.
5. Anote precisão e revocação antes e depois de cada mudança nas instruções.

A correspondência usa o atributo `data-bp` das páginas (o seletor do achado é resolvido no navegador) e o critério citado; no caso de PR, o arquivo e a faixa de linhas. Um achado no lugar certo com critério errado conta como falso positivo, e o relatório diz qual era o esperado.

Para criar um caso: `casos/<nome>/pagina/index.html` com `data-bp` nos elementos relevantes e `casos/<nome>/esperado.json` com `defeitos` e `armadilhas` (veja os existentes). Rode a calibração para garantir que a página não tem defeitos fora do gabarito.

## Limites

- Não substitui teste com pessoas nem com leitor de tela real.
- As medições rodam no Chromium; outros navegadores não são testados.
- Contraste sobre imagem, gradiente ou elemento sobreposto sai com confiança baixa e exige confirmação.
- A detecção de clicáveis sem teclado lê ouvintes no próprio elemento; com delegação de eventos (comum em frameworks), o agente precisa testar no script.
- No modo 4, as imagens do Figma não são salvas em disco; o link do nó é a referência visual.
- Citações da NN/g são lentas de propósito: o robots.txt do site pede 60 segundos entre requisições.
- A guarda de somente leitura é uma rede de segurança, não um isolamento. As regras do agente continuam valendo.
- Só níveis A e AA da WCAG 2.2.

## Fontes

- Web Content Accessibility Guidelines (WCAG) 2.2, W3C: https://www.w3.org/TR/WCAG22/ (os nomes e números dos critérios em `suporte/regras/criterios-wcag.md` vêm da especificação).
- Nielsen Norman Group: só links. O agente lê os artigos no site quando precisa citar, respeitando o robots.txt, e cita no máximo uma frase. Nenhum texto da NN/g é guardado neste repositório.
- baymard.com não é usado: os termos do site proíbem extração automatizada.

Dependências instaladas pelo npm: [axe-core](https://github.com/dequelabs/axe-core) (MPL-2.0) e [Playwright](https://github.com/microsoft/playwright) (Apache-2.0).

## Licença

MIT. Copyright (c) 2026 railson-is. Veja `LICENSE`.
