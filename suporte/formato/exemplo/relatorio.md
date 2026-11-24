# Revisão de UX: exemplo.com/cadastro

> Exemplo ilustrativo do formato. Os valores não vêm de um site real.

- **Modo:** 2 auditoria WCAG 2.2 AA
- **Alvo:** https://exemplo.com/cadastro
- **Data:** 2026-01-15
- **Ambiente:** homologacao
- **Larguras:** 320 e 1280 px (altura 800)
- **Ferramentas:** Playwright, Chromium e axe-core nas versões de `medidas.json`
- **Resultado:** 2 defeitos (1 alta, 1 média) e 1 suspeita

## O que corrigir primeiro

1. **D1** O botão Continuar não recebe foco. Vem primeiro porque impede concluir o cadastro pelo teclado.
2. **D2** Texto de ajuda com contraste de 2,84:1. Atrapalha a leitura das regras de senha, mas a regra reaparece no erro.

## Defeitos

### D1. Botão Continuar do cadastro não recebe foco pelo teclado

- **Gravidade:** alta. Impede concluir a tarefa principal para quem usa só o teclado, sem contorno.
- **Critério:** WCAG 2.2 2.1.1 Keyboard (nível A), https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html; WCAG 2.2 4.1.2 Name, Role, Value (nível A), https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- **Onde:** https://exemplo.com/cadastro, 1280 px, `#continuar`
- **Prova:** `div` com ouvinte de clique, sem `tabindex` e sem `role`. A trilha de Tab tem 14 paradas e nenhuma é o botão.
- **Impacto:** quem navega só pelo teclado preenche tudo e não consegue avançar.
- **Como reproduzir:**
  1. Abrir a página.
  2. Preencher os campos pelo teclado.
  3. Pressionar Tab até o fim: o foco não chega em Continuar.
- **Direção de correção:** usar um `button` para a ação.
- **Conferência:** mesma trilha em 320 e 1280 px; Enter e Espaço no último campo não avançam; não há controle equivalente.

### D2. Texto de ajuda dos campos com contraste de 2,84:1

- **Gravidade:** média. Atrasa e induz erro recuperável; a regra de senha reaparece na mensagem de erro.
- **Critério:** WCAG 2.2 1.4.3 Contrast (Minimum) (nível AA), https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Onde:** https://exemplo.com/cadastro, 320 px, `#ajuda-email` e `#ajuda-senha`
- **Prova:** texto `#999999` sobre `#ffffff`, 14 px, peso 400: 2,84:1 (mínimo 4,5:1).
- **Impacto:** pessoas com baixa visão, ou com reflexo na tela, não leem as regras e erram o cadastro.
- **Como reproduzir:**
  1. Abrir a página em 320 px.
  2. Ler o texto abaixo dos campos E-mail e Senha.
- **Direção de correção:** escurecer o texto de ajuda até pelo menos 4,5:1.
- **Conferência:** recalculado com `contraste.mjs`; não é texto grande, nem inativo, nem decorativo.

## Suspeitas

### S1. Mensagem de erro do e-mail pode não ser anunciada

- **Indício:** aparece num `span` sem `role` e sem `aria-live`, e o foco não vai até ela.
- **Falta para confirmar:** testar com leitor de tela se a mensagem é lida ao aparecer.

## Limites

- Sem teste com leitor de tela.
- Passo de confirmação por e-mail não revisado: exige caixa de entrada real.
- Cobertura: axe-core, contraste, foco, ordem do foco, teclado, alvos, reflow e espaçamento de texto em 320 e 1280 px.
