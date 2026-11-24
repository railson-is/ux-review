# Modo 2: auditoria WCAG 2.2 AA

Verifica uma página (ou um conjunto pequeno de páginas e estados) contra os critérios de nível A e AA da WCAG 2.2. Primeiro o axe-core, depois a verificação manual. Critérios AAA ficam de fora.

## Entradas

- URL (ou URLs) e, se houver, os estados a auditar: janela aberta, menu expandido, formulário com erro.
- Ambiente e larguras (padrão: 320, 390, 768 e 1280 px).
- Login, se precisar, pelas variáveis de ambiente (veja `seguranca.md`).

## Roteiro

1. Crie a pasta da revisão.
2. Rode a coleta automática:
   ```
   node APOIO/scripts/auditar.mjs --url <url> --saida revisoes/AAAA-MM-DD-<alvo> --ambiente <ambiente>
   ```
   Ela grava `medidas.json` e `prints/`. Leia o resumo e depois o JSON.
3. **axe-core.** Cada violação é candidata. Confirme cada uma no DOM ou recalculando o valor (o axe erra, em especial com fundos sobrepostos e componentes personalizados). Itens em `incompletos` exigem verificação manual: não relate sem verificar.
4. **Verificação manual.** Para cada item abaixo, use a medida indicada. Quando a página tiver estados (janela, menu, abas, acordeão, carrossel), escreva o `revisao.mjs` a partir do modelo para montar o estado e medir nele.

| Verificação | Critérios | Como medir |
|---|---|---|
| Contraste de texto | 1.4.3 | `contraste` no `medidas.json` (cor, fundo, razão, mínimo). Itens com `confianca: "baixa"` (imagem, gradiente, opacidade, sobreposição) precisam de confirmação: recorte a área com o texto transparente e meça os pixels do fundo, ou rebaixe para suspeita. |
| Contraste não textual | 1.4.11 | Ícones que comunicam função, bordas de campo quando são a única indicação do controle, indicadores de estado e de foco. Leia `stroke`, `fill`, `border-color` e o fundo com `getComputedStyle` e calcule com `contraste.mjs`. |
| Foco visível | 2.4.7 | `teclado.passos[].mudancaVisual === false` (recortes idênticos com e sem foco) junto com `mudancasDeEstilo` vazio. Os recortes ficam em `prints/foco-<largura>/`. |
| Foco não encoberto | 2.4.11 | `encoberto: "total"` e `cobertoPor` na trilha. Só "inteiramente escondido" falha no nível AA; parcial não. |
| Ordem do foco | 2.4.3 | A trilha (`passos`) comparada com a ordem visual e de leitura. `tabindex` positivo, saltos de volta para cima, foco que vai para trás de uma janela aberta. |
| Teclado | 2.1.1, 2.1.2 | `clicaveisSemTeclado.confirmados` (ouvinte de clique, sem foco). Os `possiveis` precisam de teste no script (focar, Enter, Espaço). Armadilha: `cicloCurto` sem saída por Esc nem Tab. |
| Janela modal | 2.4.3, 2.1.2, 4.1.2, 1.3.1 | No script: abrir pelo teclado, registrar o foco logo depois (`estadoFoco`), trilha com `inicio: 'atual'`, testar Esc, fechar e ver para onde o foco volta. Ler `role`, `aria-modal`, nome acessível do contêiner. |
| Tamanho do alvo | 2.5.8 | `alvos` no `medidas.json`: largura, altura, `excecao` e `conflitos`. `excecao: null` é candidato; `possivel-controle-do-navegador-ou-rotulo-associado` exige julgamento (veja `criterios-wcag.md`). |
| Reflow | 1.4.10 | Em 320 px: `reflow.rolagemHorizontal`, `culpados` (com posição) e `conteudoCortadoPeloCorpo`. `emRolagemPropria` é conteúdo com rolagem própria: só é defeito se não for bidimensional (tabela de dados, mapa, diagrama, código). |
| Espaçamento de texto | 1.4.12 | `espacamento.novosCortes`: o que passou a ser cortado ou a vazar com os quatro valores do critério. Print em `prints/espacamento-<largura>.png`. |

5. Outros critérios A e AA que o axe ou a navegação mostrarem (nome acessível, rótulos, idioma, títulos, mensagens de status) entram com a mesma exigência de prova.
6. Gravidade, conferência, relatório, `achados.json`, validador.

## Limites a declarar

Diga nos limites o que não foi verificado: leitor de tela real, zoom de 200% (1.4.4), mídia (1.2.x), conteúdo atrás de login que não foi acessado, estados não montados. Não diga que a página "está conforme"; diga só o que falhou e o que ficou de fora.
