# Modo 1: revisão de tela ou fluxo

Percorre uma tela ou um fluxo num navegador real (Chromium do Playwright), em várias larguras, e relata o que atrapalha quem usa: tarefa que não se conclui, retorno que não vem, erro que não se explica, conteúdo que some ou se sobrepõe, controle que não responde.

Não é uma auditoria WCAG completa (isso é o modo 2). Problemas de acessibilidade que aparecerem no caminho entram, com a mesma exigência de prova.

## Entradas

- URL inicial.
- O fluxo: objetivo de quem usa ("criar conta", "remarcar um pedido") ou a lista de passos. Sem isso, revise só a tela da URL e diga nos limites.
- Ambiente. Sem declaração, siga a regra do agente (na dúvida, produção).
- Larguras. Padrão: 320, 390, 768 e 1280 px, altura 800 (ou o que `UXR_LARGURAS` e `UXR_ALTURA` definirem).
- Se precisar de login: os nomes das variáveis de ambiente com usuário e senha (padrão `UXR_USUARIO` e `UXR_SENHA`). Se não existirem, pare e peça; nunca peça o valor no chat.

## Roteiro

1. Crie a pasta da revisão. Copie `APOIO/scripts/modelo-revisao.mjs` para `revisao.mjs` na pasta.
2. Escreva os passos do fluxo em `PASSOS`. Em cada passo:
   - use `m.cliqueSeguro(page, alvo, { ambiente })` para clicar;
   - registre o que provar o problema: `m.tempoAteResposta` para retorno de ação, `window.__uxr.estadoFoco()` para onde o foco foi, `m.medirSobreposicao`, `m.medirReflow`, `m.rodarAxe` no estado final do passo, estilos computados com `page.evaluate`;
   - deixe o print do passo (o modelo já tira, borrado).
3. Rode o script. Se falhar, corrija o script, não o alvo.
4. Rode também `auditar.mjs` na URL inicial, nas mesmas larguras, para a base automática.
5. Leia `medidas-revisao.json`, `medidas.json` e os prints. Monte os candidatos.
6. Para cada candidato, ache o critério (WCAG 2.2 ou NN/g) e a prova. Sem prova, é suspeita.
7. Gravidade, conferência, relatório, `achados.json`, validador.

## O que procurar

Para cada item, a prova costuma ser a indicada entre parênteses. A fonte vem de `fontes.md` e `criterios-wcag.md`.

- **Retorno da ação:** clique sem mudança na tela (tempo até a primeira mudança no DOM), carregamento sem indicação, botão que aceita clique duplo e repete a ação (contagem de requisições, só em local ou homologação). Fonte típica: NN/g, heurística de visibilidade do status do sistema; WCAG 4.1.3 para mensagens de status sem papel adequado.
- **Erros:** mensagem genérica, que não diz o que fazer, que só aparece em cor, que apaga o que foi digitado (valor do campo antes e depois). WCAG 3.3.1, 3.3.3, 1.4.1; NN/g sobre mensagens de erro.
- **Formulários:** placeholder no lugar de rótulo, rótulo que não descreve, campo de dado pessoal sem `autocomplete`, tipo de campo errado para o teclado do celular (`type`, `inputmode`), pedir de novo o que já foi informado. WCAG 3.3.2, 2.4.6, 1.3.5, 3.3.7.
- **Layout por largura:** conteúdo cortado, sobreposto (`medirSobreposicao` com quem fica por cima), rolagem horizontal em 320 px, ação principal fora da tela sem pista. WCAG 1.4.10; NN/g quando o problema for de percepção e não de critério WCAG.
- **Controle e saída:** passo sem voltar ou cancelar, janela que não fecha, perda do que foi preenchido ao voltar. NN/g, heurística de controle e liberdade; WCAG 2.1.2 e 2.4.3 em janelas.
- **Consistência:** o mesmo comando com nomes diferentes em telas diferentes, ajuda que muda de lugar. WCAG 3.2.4, 3.2.6.
- **Linguagem:** jargão interno, rótulo ambíguo ("OK", "Clique aqui"), link que não diz para onde vai. WCAG 2.4.4, 2.4.6; NN/g sobre linguagem do usuário.

Opinião estética, preferência de marca e "eu faria diferente" não entram. Se não há critério nem efeito demonstrável em quem usa, não é defeito.

## Armadilhas

- Estado transitório (animação, carregamento) confundido com defeito. Repita a medida depois de esperar a página assentar.
- Comportamento do navegador headless (fonte ausente, vídeo que não toca) confundido com defeito do produto. Na dúvida, rode com `UXR_VISIVEL=1`.
- Banner de cookies ou aviso que só aparece na primeira visita. Diga em que estado a medida foi feita.
