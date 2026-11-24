# Opcional: texto de issue

Quando o pedido pedir, escreva o texto de uma issue por defeito (ou por grupo de defeitos com a mesma causa) em `issues.md`, na pasta da revisão. Não publique: nada de `gh issue create`, nada de API, nada de conector. Quem publica é o usuário.

## Modelo

```markdown
## [UX] <título curto: o problema e onde>

**Gravidade:** <alta | média | baixa>
**Critério:** <WCAG 2.2 nº Nome (nível), link | NN/g, autor, título, link>
**Onde:** <URL, largura, seletor | arquivo:linha | link do frame>

### O que acontece
<uma ou duas frases, do ponto de vista de quem usa>

### Como reproduzir
1. ...

### Esperado
<o comportamento que cumpre o critério>

### Prova
<valor medido, trecho ou valor lido do Figma>
Print: `prints/<arquivo>.png` (anexe ao publicar)

### Referência
Revisão `revisoes/AAAA-MM-DD-<alvo>/`, defeito D<n>.
```

Regras: um problema por issue; sem dado pessoal; sem sugerir responsável, prazo ou rótulo; texto em português, sem travessão.
