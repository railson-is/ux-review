# Prova antes de defeito

Um defeito só entra se tiver pelo menos uma prova que outra pessoa consiga refazer. Sem prova, o item vai para Suspeitas.

## O que conta como prova

| Tipo (`prova.tipo`) | Exemplos | O que precisa ter |
|---|---|---|
| `medida` | estilo computado; caixa (x, y, largura, altura); razão de contraste com as duas cores; trilha de Tab real; recortes idênticos com e sem foco; tempo até a primeira mudança na tela; transbordo em 320 px; texto cortado com o espaçamento de 1.4.12 | os valores em `prova.valores`, a largura e o estado em que foram medidos, e o script que os gera (`prova.script`) |
| `codigo` | trecho do diff ou do arquivo na versão do PR | `local.arquivo`, `local.linha` (lado novo) e `prova.trecho` com poucas linhas |
| `figma` | cor, tamanho ou texto lido de um nó | `local.figma.no`, `local.figma.link` e os valores lidos em `prova.valores` |

## O que não conta sozinho

- **Print.** Ilustra, não prova. A exceção é a comparação de recortes gerada pelo script (`mudancaVisual: false`), que é uma medida.
- **Resultado do axe.** É candidato. Vira defeito quando você confirma: recalcula o contraste, lê o atributo no DOM, testa o teclado.
- **Medida com `confianca: "baixa"`.** Fundo com imagem, gradiente, opacidade ou elemento posicionado por cima. Confirme por outro caminho ou rebaixe para suspeita.
- **Impressão.** "Parece pequeno", "deve confundir", "provavelmente não funciona no celular". Ou mede, ou é suspeita.
- **Memória do modelo.** Valor de critério, nome de artigo, comportamento de navegador: confira na fonte.

## Suspeita

Entra quando há indício mas falta prova. Precisa de:

- `titulo` e o indício observado;
- `falta`: o que medir ou testar para confirmar, e onde (ex.: "testar com leitor de tela se o erro é anunciado", "rodar o modo 2 na prévia do PR").

Suspeita não tem gravidade e não entra em "O que corrigir primeiro".

## Reprodutibilidade

Rodar o script de novo, no mesmo ambiente e na mesma largura, tem que dar o mesmo valor. Se a medida oscila (animação, conteúdo dinâmico), espere a página assentar, meça duas vezes e registre as duas.
