# Memória do agente

O agente usa a memória persistente de subagentes do Claude Code (`memory: user` no frontmatter). Ela fica em `~/.claude/agent-memory/ux-review/`, vale para todos os projetos, e as primeiras 200 linhas (ou 25 KB) do `MEMORY.md` entram no contexto a cada execução. Ela só funciona com a memória automática do Claude Code ligada.

## Para que serve

Aprender com as correções do usuário, para não repetir o mesmo erro na próxima revisão.

## O que registrar

- **Correção de achado:** o usuário disse que um defeito era falso positivo, que a gravidade estava errada, que o critério ou a fonte não se aplicavam. Registre o padrão, não o caso: "texto sobre faixa semitransparente: medir a cor composta, não o fundo da página (corrigido pelo usuário em 2026-01-15)".
- **Preferência de método confirmada:** larguras extras, estados que sempre devem ser montados, forma de apresentar o relatório.
- **Particularidade estável de um alvo:** "em exemplo.com o login exige liberar POST em /entrar"; "o aviso de cookies cobre o rodapé, já relatado em 2026-01-15".

## O que não registrar

- Credenciais, cookies, dados pessoais.
- Texto de artigos (NN/g ou outros).
- Resultados que já estão no `achados.json` de uma revisão.
- Suposições suas que o usuário não confirmou.

## Como

- Uma nota por assunto, com data e o porquê.
- Antes de criar uma nota, procure se já existe uma sobre o mesmo assunto e atualize.
- Mantenha o `MEMORY.md` como índice curto; detalhes em arquivos separados.
- Se o usuário desfizer uma correção antiga, apague a nota.

## Quando

- No início: leia e aplique.
- Quando o pedido trouxer correção do usuário: registre antes de começar a revisão.
- Na conferência: confira se algum achado repete um erro já registrado.
