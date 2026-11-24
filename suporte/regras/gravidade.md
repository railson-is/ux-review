# Régua de gravidade

A gravidade mede o efeito na pessoa que usa, não o nível da WCAG. Uma falha AA pode ser baixa; um problema sem critério WCAG pode ser alto.

Referência: Jakob Nielsen, "Severity Ratings for Usability Problems", NN/g, https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/ (leia no site se for citar).

Três fatores:

- **Impacto:** impede, atrasa ou só incomoda.
- **Frequência:** quantas pessoas passam por ali e quantas vezes. Com PostHog autorizado, use o número medido; sem ele, use a posição no fluxo (passo obrigatório ou opcional).
- **Persistência:** existe contorno razoável? A pessoa aprende a evitar ou tropeça sempre?

## Níveis

**Alta**
- Impede concluir a tarefa principal ou acessar conteúdo essencial, para pelo menos um grupo (teclado, leitor de tela, baixa visão, celular, 320 px), sem contorno razoável.
- Leva a erro com consequência: pagamento, envio, exclusão ou perda de dados.
- Exemplos: armadilha de teclado; botão principal sem foco; janela que não fecha pelo teclado; conteúdo essencial cortado em 320 px; texto do passo obrigatório com contraste muito abaixo do mínimo.

**Média**
- Atrasa, confunde ou causa erro recuperável. Há contorno, mas custa.
- Impede uma tarefa secundária.
- Exemplos: foco invisível em parte dos controles; mensagem de erro que não diz como corrigir; alvo pequeno em ação frequente; rótulo que some ao digitar.

**Baixa**
- Incômodo ou inconsistência que não impede nem atrasa de forma relevante; elemento secundário; contorno fácil.
- Exemplos: contraste pouco abaixo do mínimo em texto de rodapé; nomes diferentes para o mesmo comando em telas pouco usadas.

## Regras

- Na dúvida entre dois níveis, fique com o menor e registre o motivo em `conferencia`.
- O mesmo problema em vários lugares é um defeito só, com todas as ocorrências (`local.seletores`). A gravidade é a da ocorrência mais séria.
- Alcance medido pode subir ou descer um nível; diga qual número levou à mudança.

## O que corrigir primeiro

No topo do relatório, no máximo cinco defeitos, nesta ordem:

1. gravidade;
2. alcance (pessoas afetadas, se medido) ou posição no fluxo;
3. causa comum (uma correção resolve vários defeitos).

Uma linha por item: o id, o problema e por que vem antes.
