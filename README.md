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
| Todos os modos | Claude Code com suporte a subagentes com `memory` e `hooks` no frontmatter; Node.js 22 ou mais novo; Git (para o `npx github:`) |
| Modos 1, 2 e 5 (navegador) | Playwright e Chromium, axe-core (o instalador baixa pelo npm, sem CDN) |
| Modo 3 (PR) | [GitHub CLI](https://cli.github.com/) autenticado (`gh auth status`) com acesso de leitura ao repositório |
| Modo 4 (Figma) | Conector oficial da Figma (servidor MCP) configurado no Claude Code, com acesso ao arquivo |
| Alcance (opcional) | Conector MCP do PostHog configurado, com acesso de leitura ao projeto |

## Instalação

O ux-review é um pacote npm com uma CLI, `ux-review`. Ele roda direto do GitHub pelo `npx`, sem clonar e sem publicar no registro do npm:

```bash
npx github:railson-is/ux-review instalar
```

O comando é o mesmo no bash e no PowerShell. Ele copia `agents/ux-review.md` para `~/.claude/agents/` e `suporte/` para `~/.claude/ux-review/`, preenche o caminho absoluto da pasta de apoio no agente e instala axe-core, Playwright e o Chromium do Playwright. Se `CLAUDE_CONFIG_DIR` estiver definida, ela substitui `~/.claude`. Depois, abra uma nova sessão do Claude Code: o agente aparece como `ux-review`.

Sem versão, o `npx` usa o que estiver na `main`. Para uma instalação reproduzível, fixe a versão pela tag:

```bash
npx github:railson-is/ux-review#v0.2.0 instalar
```

Outros comandos da CLI:

| Comando | O que faz |
|---|---|
| `instalar [--destino <pasta>] [--sem-dependencias]` | Instala ou atualiza. Rodar de novo troca os arquivos e mantém `node_modules`. |
| `verificar [--destino <pasta>] [--json]` | Diagnóstico: Node, dependências nas versões declaradas, Chromium, agente, guarda, configuração e `gh`. Sai com código 1 se algo obrigatório falhar. |
| `desinstalar [--destino <pasta>] [--apagar-memoria] [--confirmar]` | Sem `--confirmar`, só mostra o que seria removido. A memória do agente fica, a menos que use `--apagar-memoria`. |
| `config` | Mostra a configuração lida do ambiente, sem valores de credencial. |
| `versao` / `ajuda` | Versão e ajuda. |

Quem clonou o repositório pode usar os atalhos, que chamam a mesma CLI: `./instalar.sh` (bash) ou `powershell -ExecutionPolicy Bypass -File .\instalar.ps1` (Windows), com as mesmas opções (`-Destino`, `-SemDependencias` no PowerShell).

**Registro do npm:** a instalação gera um `.npmrc` na pasta de apoio com o registro público, porque o npm não inclui `.npmrc` em pacotes. Assim um registro privado configurado na máquina não atrapalha a instalação das dependências.

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

## Configuração

Tudo o que muda entre máquinas ou usos vem de variáveis de ambiente, com padrão. Valor inválido interrompe na hora, dizendo a variável e o motivo. `ux-review config` mostra o que está em vigor.

| Variável | Padrão | Para que serve |
|---|---|---|
| `UXR_LARGURAS` | `320,390,768,1280` | Larguras em px, separadas por vírgula |
| `UXR_ALTURA` | `800` | Altura da janela em px |
| `UXR_TEMPO_LIMITE_MS` | `60000` | Tempo máximo para carregar uma página |
| `UXR_VISIVEL` | `0` | `1` abre o navegador com janela, para depurar |
| `UXR_PERMITIR_ESCRITA` | vazio | Expressão regular de URLs que podem receber POST em produção (ex.: o login) |
| `UXR_PALAVRAS_DE_RISCO` | vazio | Palavras extras que bloqueiam cliques em produção, separadas por vírgula |
| `UXR_USUARIO`, `UXR_SENHA` | vazio | Credenciais do alvo; nunca gravadas |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Destino da instalação |
| `UX_REVIEW_DIR` | `<CLAUDE_CONFIG_DIR>/ux-review` | Pasta de apoio usada pelos scripts de revisão |

Um pedido explícito ao agente (ex.: "só em 360 px") vale mais que a variável.

## Personalização

| O que | Onde |
|---|---|
| Larguras, altura, palavras de risco | Variáveis de ambiente (tabela acima) |
| Régua de gravidade | `suporte/regras/gravidade.md` |
| Formato do relatório | `suporte/formato/relatorio.md` e `suporte/formato/achados.md` |
| O que a guarda bloqueia | `suporte/guardas/somente-leitura.mjs` |
| Instruções do agente | `agents/ux-review.md` e `suporte/modos/` |
| Memória aprendida | `~/.claude/agent-memory/ux-review/` (pode ler, editar e apagar) |

Depois de mudar algo, rode o instalador de novo e, se mexeu nas instruções, rode o banco de provas.

## Versões e qualidade

- **Versões:** seguem o Versionamento Semântico. Cada versão tem entrada no [CHANGELOG.md](CHANGELOG.md) e uma tag `vX.Y.Z`. A versão instalada fica em `~/.claude/ux-review/.versao` e aparece nas medidas de cada revisão (`versoes.uxReview`).
- **CI:** a cada push e pull request, o GitHub Actions roda em Ubuntu e Windows os testes, a calibração do banco de provas (falha se os scripts detectarem menos de 10 defeitos ou marcarem alguma armadilha), a conferência do conteúdo do pacote e uma instalação completa seguida de `verificar`.
- **12 fatores:** [docs/doze-fatores.md](docs/doze-fatores.md) mostra como cada fator da metodologia se aplica aqui e quais quase não se aplicam a um agente de linha de comando.

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
