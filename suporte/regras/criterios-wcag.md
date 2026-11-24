# Critérios WCAG 2.2 (níveis A e AA)

Fonte: Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation, https://www.w3.org/TR/WCAG22/. Os nomes estão em inglês porque são os títulos oficiais; use-os assim no relatório, com uma explicação em português ao lado.

Link de cada critério: `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html` (páginas "Understanding" da W3C, todas conferidas).

4.1.1 Parsing é obsoleto e foi removido na WCAG 2.2. Não cite.

## Lista

| Nº | Nome oficial | Nível | slug |
|---|---|---|---|
| 1.1.1 | Non-text Content | A | non-text-content |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | audio-only-and-video-only-prerecorded |
| 1.2.2 | Captions (Prerecorded) | A | captions-prerecorded |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | audio-description-or-media-alternative-prerecorded |
| 1.2.4 | Captions (Live) | AA | captions-live |
| 1.2.5 | Audio Description (Prerecorded) | AA | audio-description-prerecorded |
| 1.3.1 | Info and Relationships | A | info-and-relationships |
| 1.3.2 | Meaningful Sequence | A | meaningful-sequence |
| 1.3.3 | Sensory Characteristics | A | sensory-characteristics |
| 1.3.4 | Orientation | AA | orientation |
| 1.3.5 | Identify Input Purpose | AA | identify-input-purpose |
| 1.4.1 | Use of Color | A | use-of-color |
| 1.4.2 | Audio Control | A | audio-control |
| 1.4.3 | Contrast (Minimum) | AA | contrast-minimum |
| 1.4.4 | Resize Text | AA | resize-text |
| 1.4.5 | Images of Text | AA | images-of-text |
| 1.4.10 | Reflow | AA | reflow |
| 1.4.11 | Non-text Contrast | AA | non-text-contrast |
| 1.4.12 | Text Spacing | AA | text-spacing |
| 1.4.13 | Content on Hover or Focus | AA | content-on-hover-or-focus |
| 2.1.1 | Keyboard | A | keyboard |
| 2.1.2 | No Keyboard Trap | A | no-keyboard-trap |
| 2.1.4 | Character Key Shortcuts | A | character-key-shortcuts |
| 2.2.1 | Timing Adjustable | A | timing-adjustable |
| 2.2.2 | Pause, Stop, Hide | A | pause-stop-hide |
| 2.3.1 | Three Flashes or Below Threshold | A | three-flashes-or-below-threshold |
| 2.4.1 | Bypass Blocks | A | bypass-blocks |
| 2.4.2 | Page Titled | A | page-titled |
| 2.4.3 | Focus Order | A | focus-order |
| 2.4.4 | Link Purpose (In Context) | A | link-purpose-in-context |
| 2.4.5 | Multiple Ways | AA | multiple-ways |
| 2.4.6 | Headings and Labels | AA | headings-and-labels |
| 2.4.7 | Focus Visible | AA | focus-visible |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | focus-not-obscured-minimum |
| 2.5.1 | Pointer Gestures | A | pointer-gestures |
| 2.5.2 | Pointer Cancellation | A | pointer-cancellation |
| 2.5.3 | Label in Name | A | label-in-name |
| 2.5.4 | Motion Actuation | A | motion-actuation |
| 2.5.7 | Dragging Movements | AA | dragging-movements |
| 2.5.8 | Target Size (Minimum) | AA | target-size-minimum |
| 3.1.1 | Language of Page | A | language-of-page |
| 3.1.2 | Language of Parts | AA | language-of-parts |
| 3.2.1 | On Focus | A | on-focus |
| 3.2.2 | On Input | A | on-input |
| 3.2.3 | Consistent Navigation | AA | consistent-navigation |
| 3.2.4 | Consistent Identification | AA | consistent-identification |
| 3.2.6 | Consistent Help | A | consistent-help |
| 3.3.1 | Error Identification | A | error-identification |
| 3.3.2 | Labels or Instructions | A | labels-or-instructions |
| 3.3.3 | Error Suggestion | AA | error-suggestion |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | error-prevention-legal-financial-data |
| 3.3.7 | Redundant Entry | A | redundant-entry |
| 3.3.8 | Accessible Authentication (Minimum) | AA | accessible-authentication-minimum |
| 4.1.2 | Name, Role, Value | A | name-role-value |
| 4.1.3 | Status Messages | AA | status-messages |

## Critérios medidos pelos scripts: valores e exceções

Resumo operacional em palavras próprias. Em caso de dúvida, vale o texto da W3C.

**1.4.3 Contrast (Minimum).** Texto normal: 4,5:1. Texto grande: 3:1. Grande é a partir de 18 pt (24 px) ou 14 pt (cerca de 18,67 px) em negrito. Não arredonde: 4,49:1 falha. Sem requisito: texto de componente inativo (desabilitado), texto puramente decorativo ou invisível, texto que faz parte de logotipo. Placeholder é texto e entra.

**1.4.11 Non-text Contrast.** 3:1 contra as cores vizinhas para partes visuais necessárias para identificar um controle e seus estados, e para partes de gráficos necessárias para entender o conteúdo. Controle inativo não entra. Se o controle é identificável sem a borda (ex.: botão com texto), a borda não precisa de 3:1. Para bordas de campos de texto, leia a página Understanding antes de relatar: a resposta depende de como o campo é percebido.

**1.4.10 Reflow.** Sem rolagem nas duas direções a 320 px de largura (conteúdo com rolagem vertical) ou 256 px de altura (rolagem horizontal). Exceção: partes que precisam de layout bidimensional para uso ou sentido (tabelas de dados, mapas, diagramas, editores, código).

**1.4.12 Text Spacing.** Nada pode se perder (cortar, sobrepor, sumir) quando a pessoa ajusta: altura de linha 1,5 vez o tamanho da fonte, espaço depois de parágrafo 2 vezes, espaçamento entre letras 0,12 vez, entre palavras 0,16 vez. O script aplica os quatro de uma vez.

**2.1.1 Keyboard.** Toda função operável por teclado, sem exigir tempo específico entre teclas. Exceção: quando a função depende do caminho do movimento (desenho livre).

**2.1.2 No Keyboard Trap.** Se o foco entra num componente, sai com o teclado. Se a saída exige algo além de Tab, setas ou Esc, a pessoa precisa ser avisada.

**2.4.3 Focus Order.** A ordem do foco preserva sentido e operação. Falhas típicas: `tabindex` positivo que embaralha, janela aberta sem levar o foco para dentro, foco que vai para conteúdo escondido atrás de uma sobreposição.

**2.4.7 Focus Visible.** Há um indicador visível de foco do teclado. A prova mais forte é a comparação de recortes com e sem foco.

**2.4.11 Focus Not Obscured (Minimum).** O componente com foco não pode ficar inteiramente escondido por conteúdo do autor (cabeçalho fixo, aviso de cookies, chat). Parcialmente coberto não falha no nível AA. Conteúdo que a pessoa abriu ou pode dispensar sem mover o foco tem tratamento próprio na página Understanding; leia antes de relatar e descreva o estado em que mediu.

**2.5.8 Target Size (Minimum).** Alvo de pelo menos 24 por 24 px, com cinco exceções:
- *Espaçamento:* alvo menor passa se um círculo de 24 px de diâmetro, centrado nele, não cruza outro alvo nem o círculo de outro alvo pequeno. O script calcula e devolve `excecao: "espacamento"`.
- *Equivalente:* a mesma função está disponível em outro controle da página que cumpre o critério.
- *Em linha:* o alvo está numa frase ou tem o tamanho limitado pela altura de linha do texto ao redor.
- *Controle do navegador:* o tamanho é definido pelo navegador e o autor não mudou. Checkbox e radio nativos costumam cair aqui, mas confira se o CSS alterou o tamanho.
- *Essencial:* a apresentação é essencial ou exigida por lei.

**4.1.2 Name, Role, Value.** Componentes de interface têm nome e papel determináveis por programa, e estados e valores que podem ser definidos pelo usuário são expostos. Janela modal personalizada sem `role="dialog"` (ou `alertdialog`) e sem nome entra aqui.
