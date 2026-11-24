# Segurança

## Credenciais

- Só por variável de ambiente. No script: `m.credencial('UXR_USUARIO')`. Se a variável não existir, pare e diga ao usuário qual definir; nunca peça o valor no chat.
- Nunca escreva valores de senha, token, cookie ou chave em arquivo, print, log, relatório ou memória.
- Não imprima `process.env` nem o conteúdo de campos de senha.
- Estado de sessão salvo (`storageState`) contém cookies: grave numa pasta temporária fora de `revisoes/` e apague ao terminar.

## Produção

Trate como produção todo alvo que não seja local (localhost, 127.0.0.1, `*.localhost`, `*.test`) nem declarado homologação no pedido.

- Não clique em nada que pague, compre, confirme, envie, assine, agende, exclua, cancele ou finalize. Use sempre `m.cliqueSeguro`, que recusa botões de envio e textos de risco em produção.
- O navegador aberto por `m.abrirNavegador` em produção bloqueia toda requisição que não seja GET, HEAD ou OPTIONS. Se o login precisar de POST, libere só a URL de login em `permitirEscrita` e diga no relatório.
- Não preencha formulários com dados reais. Para testar validação, use dados obviamente fictícios (`nome@exemplo.com`) e não envie.
- Se o fluxo pedido só pode ser revisado concluindo uma ação de risco, pare antes dela e registre nos limites.

## Dados pessoais

- `m.printar` borra campos preenchidos, e-mails, CPFs, CNPJs, telefones e números de cartão encontrados no texto. Passe seletores extras em `borrar` para nomes, endereços e outros dados que os padrões não pegam.
- Abra cada print antes de entregar e confira. Se algo escapou, apague o print e tire de novo.
- Não copie dados pessoais para o relatório, o `achados.json` ou a memória. Use descrições ("o nome da pessoa logada").
- PostHog: só números agregados. Nunca liste pessoas, e-mails ou identificadores.
