# Opcional: alcance no PostHog

Mede quantas pessoas passam pelo lugar de cada defeito. Serve para ordenar "O que corrigir primeiro" e, às vezes, para mudar a gravidade em um nível.

## Só com autorização

Use apenas se o pedido disser, com essas ou outras palavras, que você pode consultar o PostHog. Sem isso, deixe `alcance: null` e não mencione o PostHog no relatório.

## Como

1. Use o conector MCP do PostHog que estiver configurado. Só ferramentas de leitura e consulta; nada que crie insight, painel, coorte ou flag (a guarda bloqueia). Se o conector não estiver disponível, diga nos limites e siga sem alcance.
2. Antes da primeira consulta, confira se as propriedades que vai usar existem no projeto (ex.: uma consulta curta que conte eventos com a propriedade preenchida). Projetos diferentes capturam propriedades diferentes.
3. Para cada defeito, defina o recorte que representa quem passa por ele: a página (URL ou caminho), o passo do fluxo, e, se o defeito depende da largura, a faixa de largura de tela.
4. Conte pessoas, não eventos, num período fechado (padrão: últimos 30 dias). Exemplo em SQL do PostHog (HogQL), com `$pageview` e `$current_url`, que são do próprio PostHog:

```sql
SELECT count(DISTINCT person_id) AS pessoas
FROM events
WHERE event = '$pageview'
  AND properties.$current_url LIKE '%exemplo.com/cadastro%'
  AND timestamp > now() - INTERVAL 30 DAY
```

5. Registre em `alcance`: `pessoas`, `periodo`, `consulta` (o texto exato) e `fonte: "PostHog"`.

## Limites

- Só números agregados. Nunca liste pessoas, e-mails, identificadores ou sessões individuais.
- Visualização de página não é o mesmo que passar pelo defeito (a pessoa pode não rolar até ele). Diga isso quando for o caso.
- Não use nomes de eventos personalizados que você não confirmou no projeto.
