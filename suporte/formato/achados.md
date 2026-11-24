# Formato do achados.json

Lido pelo validador (`scripts/validar-achados.mjs`) e pelo banco de provas. Exemplo completo em `exemplo/achados.json`.

## Raiz

| Campo | Tipo | Obrigatório | Conteúdo |
|---|---|---|---|
| `versao` | número | sim | `1` |
| `revisao` | objeto | sim | veja abaixo |
| `prioridade` | lista de ids | se houver defeito | "O que corrigir primeiro", até 5 ids, na ordem |
| `defeitos` | lista | sim (pode ser vazia) | veja abaixo |
| `suspeitas` | lista | sim (pode ser vazia) | veja abaixo |
| `corrigidos` | lista | só no modo 5 | defeitos anteriores que agora passam, cada um com `origem` e `prova` |
| `limites` | lista de textos | sim | o que não foi verificado |

`revisao`: `data` (AAAA-MM-DD), `modo` (`1-revisao-de-tela`, `2-auditoria-wcag`, `3-revisao-de-pr`, `4-fluxo-no-figma`, `5-reteste`), `alvo`, `ambiente` (`local`, `homologacao`, `producao`, `nao-se-aplica`), `larguras` (lista de px, quando houver navegador), `origem` (só no modo 5: pasta da revisão anterior).

## Defeito

| Campo | Conteúdo |
|---|---|
| `id` | `D1`, `D2`... |
| `titulo` | o problema e onde, numa frase |
| `gravidade` | `alta`, `media` ou `baixa` |
| `criterios` | lista com pelo menos um critério (formatos em `regras/fontes.md`) |
| `local` | `url`, `largura`, `seletor`, `seletores` (outras ocorrências), `arquivo`, `linha`, `figma` (`arquivo`, `no`, `link`). Preencha o que se aplica. |
| `prova` | `tipo` (`medida`, `codigo`, `figma`), `descricao`, `valores` (objeto com os números), `trecho` (código), `prints` (caminhos relativos à pasta), `script` (nome do arquivo na pasta) |
| `impacto` | quem é afetado e como |
| `reproduzir` | lista de passos |
| `correcao` | direção de correção, uma frase |
| `conferencia` | o que tentou para derrubar e por que ficou |
| `alcance` | `null` ou `{ "pessoas": n, "periodo": "30 dias", "consulta": "...", "fonte": "PostHog" }` (só com autorização) |
| `reteste` | `null` ou, no modo 5, `{ "status": "continua" \| "piorou", "origem": "D3" }` |

## Suspeita

`id` (`S1`...), `titulo`, `criterios` (opcional), `local`, `indicio`, `falta` (o que falta para confirmar).
