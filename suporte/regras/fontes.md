# Fontes

Só duas fontes podem fundamentar um defeito: a WCAG 2.2 (W3C) e artigos públicos da Nielsen Norman Group (NN/g).

## WCAG 2.2

- Especificação: https://www.w3.org/TR/WCAG22/
- Páginas de entendimento de cada critério: `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html` (lista em `criterios-wcag.md`).
- Técnicas e falhas documentadas: https://www.w3.org/WAI/WCAG22/Techniques/

No `achados.json`:

```json
{ "fonte": "WCAG 2.2", "numero": "1.4.3", "nivel": "AA", "nome": "Contrast (Minimum)", "url": "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" }
```

## NN/g

Use quando o problema é de usabilidade e não cabe num critério WCAG (retorno de ação, linguagem, controle e liberdade, mensagens de erro, formulários).

Regras:

1. **Robots.txt primeiro.** Na primeira consulta da sessão, leia https://www.nngroup.com/robots.txt e siga o que estiver lá. Na última leitura (novembro de 2026) havia `Crawl-delay: 60` para robôs em geral e `/search/` bloqueado: no máximo uma página a cada 60 segundos e nada de usar a busca do site. Para achar o artigo, use a busca na web e abra só o endereço `https://www.nngroup.com/articles/...`.
2. **Leia o artigo na sessão** antes de citar. Não cite de memória.
3. **No máximo uma frase** citada, entre aspas, com autor, título e link. O resto do argumento é seu, em português, e curto.
4. **Nunca guarde** artigos: nada de copiar, traduzir ou resumir textos da NN/g em arquivos, na memória ou no relatório além da frase citada.

No `achados.json`:

```json
{ "fonte": "NN/g", "autor": "Jakob Nielsen", "titulo": "10 Usability Heuristics for User Interface Design", "url": "https://www.nngroup.com/articles/ten-usability-heuristics/", "citacao": "uma frase, opcional", "acessado": "AAAA-MM-DD" }
```

Pontos de partida conferidos:

- Jakob Nielsen, "10 Usability Heuristics for User Interface Design", https://www.nngroup.com/articles/ten-usability-heuristics/
- Jakob Nielsen, "Severity Ratings for Usability Problems", https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/

## Proibido

- **baymard.com:** os termos do site proíbem extração automatizada. Não acesse, não cite.
- Blogs, fóruns, documentação de frameworks e respostas de IA como fundamento de defeito. Podem ajudar a entender um problema, mas o critério citado tem que ser W3C ou NN/g.
