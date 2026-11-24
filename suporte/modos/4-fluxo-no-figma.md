# Modo 4: fluxo no Figma

Avalia um fluxo desenhado no Figma pelo conector oficial (servidor MCP da Figma), só leitura. Relata o que vai atrapalhar quem usa quando for construído: passo que falta, estado que não foi desenhado, texto que confunde, contraste ou alvo abaixo do mínimo.

## Entradas

- Link do Figma (`https://www.figma.com/design/<arquivo>/...?node-id=<no>`) apontando para a página, seção ou frames do fluxo.
- O objetivo de quem usa e, se houver, a ordem dos frames. Sem ordem informada, use a ordem e os nomes dos frames e diga nos limites que a ordem foi inferida.

## Ferramentas do conector (só estas)

- `create_session`, quando o conector pedir uma sessão antes das leituras.
- `get_metadata`: estrutura, nomes, tamanhos e posições dos frames.
- `get_screenshot`: imagem de um frame, para ver o que foi desenhado.
- `get_design_context`: textos, cores, tamanhos e componentes de um nó.
- `get_variable_defs`: variáveis (tokens) usadas.
- `get_comments`: comentários existentes, só para contexto.

Nada que crie, altere, envie ou gere: `use_figma`, `create_new_file`, `upload_assets`, `send_code_to_figma`, `generate_*` e similares. A guarda bloqueia. O nome do conector varia entre instalações; procure as ferramentas pelo sufixo.

## Roteiro

1. Crie a pasta da revisão. Em `revisao.ambiente` use `nao-se-aplica`.
2. `get_metadata` no nó do link. Liste os frames do fluxo na ordem.
3. Para cada frame: `get_screenshot` para ver, `get_design_context` para ler valores (cores em hex, tamanhos em px, textos).
4. Verifique:
   - **Fluxo:** cada passo leva ao próximo; existe voltar ou cancelar; ação destrutiva tem confirmação; a tarefa termina com retorno claro. NN/g.
   - **Estados que faltam:** erro de campo, erro de envio, vazio, carregando, sucesso, desabilitado, foco. Ausência é suspeita quando o arquivo pode ter outra página com eles; confirme com `get_metadata` no arquivo antes de afirmar.
   - **Contraste:** cor do texto e do fundo lidas do nó, calculadas com `contraste.mjs`. WCAG 1.4.3, 1.4.11.
   - **Alvos:** largura e altura do componente clicável em px contra 24 px. WCAG 2.5.8. Confira a escala do frame (um frame desenhado em 2x tem px dobrados).
   - **Texto:** rótulos, mensagens de erro, botões. WCAG 3.3.2, 2.4.6; NN/g.
   - **Consistência:** o mesmo comando com nomes ou posições diferentes entre frames. WCAG 3.2.4.
   - **Reflow:** se só existe desenho para desktop, não é defeito; registre nos limites. Se existe desenho para celular com conteúdo cortado ou rolagem lateral, é defeito (1.4.10).
5. Prova de Figma: `local.figma.arquivo`, `local.figma.no` (node-id), `local.figma.link` (link direto ao nó) e os valores lidos em `prova.valores`.
6. Gravidade, conferência, relatório, `achados.json`, validador.

## Limites

O conector devolve as imagens para você, não para o disco: os prints da pasta ficam vazios neste modo e o link do nó é a referência visual. Critérios que dependem de execução (ordem real do foco, leitor de tela, comportamento de teclado) não se confirmam em desenho; entram como suspeita, com o que verificar na implementação.
