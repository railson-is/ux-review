# Modelo do relatorio.md

Copie a estrutura abaixo. Títulos de seção fixos; o validador procura "## O que corrigir primeiro". Exemplo completo em `exemplo/relatorio.md`.

```markdown
# Revisão de UX: <alvo curto>

- **Modo:** <1 revisão de tela | 2 auditoria WCAG 2.2 AA | 3 revisão de PR | 4 fluxo no Figma | 5 reteste>
- **Alvo:** <URL, PR dono/repo#n com commit, link do Figma ou pasta anterior>
- **Data:** AAAA-MM-DD
- **Ambiente:** <local | homologacao | producao | nao-se-aplica>
- **Larguras:** <320, 390, 768, 1280 px> (altura 800)
- **Ferramentas:** <ux-review x.y.z, Playwright x.y.z, Chromium x, axe-core x.y.z> (de `versoes` em medidas.json)
- **Resultado:** <n> defeitos (<a> altas, <m> médias, <b> baixas) e <s> suspeitas

## O que corrigir primeiro

1. **D2** <problema em uma linha>. <por que vem antes: gravidade, alcance, causa comum>
2. **D1** ...

## Defeitos

### D1. <título que diz o problema e onde>

- **Gravidade:** <alta | média | baixa>. <motivo em uma frase, pela régua>
- **Critério:** WCAG 2.2 <nº> <Nome oficial> (nível <A|AA>), <link> | NN/g, <autor>, "<título>", <link>
- **Onde:** <URL ou arquivo:linha ou frame>, <largura>, `<seletor>`
- **Prova:** <valor medido, com unidade e as duas pontas quando for comparação>. Print: `prints/<arquivo>.png`. Script: `revisao.mjs`
- **Impacto:** <quem é afetado e o que acontece com essa pessoa>
- **Como reproduzir:**
  1. ...
- **Direção de correção:** <uma frase; o que precisa mudar, não como implementar>
- **Conferência:** <o que tentou para derrubar e por que ficou>
- **Alcance:** <só com PostHog autorizado: n pessoas em <período>, consulta em achados.json>

## Suspeitas

### S1. <título>

- **Indício:** <o que foi observado>
- **Falta para confirmar:** <o que medir ou testar, e onde>

## Limites

- <o que não foi verificado e por quê; uma linha por item>
- Cobertura: <o que foi verificado, em uma linha, sem listar o que passou>
```

Regras de escrita: português do Brasil, frases curtas, sem travessão, sem adjetivos de opinião ("péssimo", "confuso demais"). Números com unidade. Dados pessoais nunca.
