# Modo 5: reteste

Refaz as medidas de uma revisão anterior e diz, para cada defeito, se foi corrigido, continua ou piorou. Cada resposta tem prova nova.

## Entradas

- A pasta da revisão anterior (`revisoes/AAAA-MM-DD-<alvo>/`).
- O alvo atual, se mudou: nova URL, novo commit do PR, nova versão do frame. Sem informação, use o mesmo alvo.

## Roteiro

1. Leia o `achados.json` e o `relatorio.md` da revisão anterior. Anote modo, ambiente, larguras e estados.
2. Crie a pasta nova: `revisoes/AAAA-MM-DD-<alvo>-reteste/`. Em `revisao.modo` use `5-reteste` e em `revisao.origem` o caminho da pasta anterior.
3. Refaça cada medida do mesmo jeito:
   - navegador: copie o `revisao.mjs` anterior para a pasta nova e rode; rode `auditar.mjs` com as mesmas larguras e o mesmo ambiente;
   - PR: leia a versão atual do arquivo e confira a mesma linha (ela pode ter mudado de número; ache pelo trecho);
   - Figma: leia o mesmo nó.
4. Classifique cada defeito anterior:
   - **corrigido:** a medida agora passa no critério. Vai em `corrigidos`, com a prova (valor novo).
   - **continua:** a mesma falha, com valor igual ou parecido. Vai em `defeitos` com `reteste: { status: "continua", origem: "D3" }`.
   - **piorou:** valor pior, mais ocorrências, ou a falha passou a afetar um passo mais importante. Vai em `defeitos` com `status: "piorou"` e a comparação antes e depois em `prova.valores`.
5. Suspeitas anteriores: tente confirmar. Confirmada, vira defeito (com `reteste: null` e a nota de origem na conferência); não confirmada, continua suspeita.
6. Problema novo visto de passagem entra como defeito novo (`reteste: null`), com a mesma exigência de prova. Não amplie o escopo de propósito.
7. Se não der para refazer uma medida (página removida, estado impossível de montar), diga nos limites. Não classifique sem medir.
8. Gravidade (pode mudar, explique), conferência, relatório, `achados.json`, validador.

## Relatório

Além do formato padrão, abra com uma tabela curta: defeito anterior, status, valor antes, valor depois. "O que corrigir primeiro" considera só o que continua, piorou ou é novo.
