# Modo 3: revisão de PR

Lê um pull request pelo `gh`, sem checkout, e relata só o que a mudança altera para quem usa: o que a pessoa vê, ouve, lê, toca ou digita. Lógica de negócio, desempenho, estilo de código e testes ficam de fora, a não ser que mudem a experiência.

## Entradas

- Número do PR e repositório (`dono/repo`), ou a URL do PR.
- Opcional: URL de prévia (deploy do PR). Ela não é usada neste modo; se o achado depender de execução, sugira o modo 1 ou 2 na prévia.

## Comandos permitidos (só leitura)

```
gh pr view <n> -R dono/repo --json number,title,body,url,headRefOid,baseRefName,files,additions,deletions
gh pr diff <n> -R dono/repo
gh pr diff <n> -R dono/repo --name-only
gh api "repos/dono/repo/contents/<caminho>?ref=<headRefOid>" -H "Accept: application/vnd.github.raw"
```

O último lê o arquivo inteiro na versão do PR, para ver o contexto e confirmar números de linha. Nada de `gh pr checkout`, `git clone`, comentário, revisão ou aprovação: a guarda bloqueia.

Para o banco de provas, o pedido pode trazer um arquivo `.diff` local no lugar do PR. Nesse caso, leia o arquivo e siga o mesmo roteiro.

## Roteiro

1. Leia título, descrição e lista de arquivos. Separe os que afetam interface: componentes, páginas, estilos, textos, traduções, rotas, validações de formulário.
2. Leia o diff desses arquivos. Para cada trecho alterado, pergunte: o que muda para quem usa?
3. Calcule a linha de cada achado na versão nova do arquivo (lado `+` do diff, a partir do cabeçalho `@@ -a,b +c,d @@`). Confirme lendo o arquivo na versão `headRefOid` quando houver dúvida.
4. Monte os candidatos. Prova de código é `local.arquivo`, `local.linha` e o `trecho` (poucas linhas).
5. Quando der para medir sem navegador, meça: contraste entre cores literais ou tokens resolvidos no próprio repositório (`contraste.mjs`), tamanhos fixos em px contra 24 px (2.5.8), largura fixa contra 320 px (1.4.10).
6. O que só se confirma executando (para onde o foco vai, se a janela prende o foco) vira suspeita, dizendo o que verificar e onde.
7. Gravidade, conferência, relatório, `achados.json`, validador. Em `revisao.ambiente` use `nao-se-aplica`.

## O que procurar no diff

- Elemento clicável que não é `button` nem `a` (div ou span com `onClick` sem papel, `tabIndex` e teclado). WCAG 2.1.1, 4.1.2.
- `outline: none` ou `outline: 0` sem outro indicador de foco. WCAG 2.4.7.
- Rótulo removido ou trocado por placeholder; `aria-label` que não bate com o texto visível. WCAG 3.3.2, 1.3.1, 2.5.3; NN/g sobre placeholder.
- `alt` removido ou vazio em imagem que informa. WCAG 1.1.1.
- `tabIndex` positivo, foco programático que pula conteúdo, `autoFocus` que tira a pessoa do lugar. WCAG 2.4.3.
- `aria-hidden` em algo que recebe foco, `role` sem os atributos obrigatórios. WCAG 4.1.2.
- Cor nova de texto ou de ícone. Calcule. WCAG 1.4.3, 1.4.11.
- Larguras e alturas fixas, `overflow: hidden` em texto, `white-space: nowrap` em blocos longos. WCAG 1.4.10, 1.4.12.
- Alvos de toque menores que 24 px sem espaçamento. WCAG 2.5.8.
- Mensagens de erro, vazio, carregamento e sucesso: removidas, genéricas, só em cor, sem `role="status"`/`alert` quando aparecem sem foco. WCAG 3.3.1, 3.3.3, 1.4.1, 4.1.3.
- Textos de interface: jargão, rótulos ambíguos, mudança de nome de um mesmo comando. WCAG 2.4.6, 3.2.4; NN/g.
- Tempo limite novo, arrastar como única forma de fazer algo, autenticação por quebra-cabeça. WCAG 2.2.1, 2.5.7, 3.3.8.

## O que não entra

Renomear variável, mover arquivo, refatorar sem mudar o que é renderizado, melhorias de acessibilidade (o modo só relata o que falhou).
