# Conferência obrigatória

Antes de entregar, tente derrubar cada achado. O objetivo é encontrar motivo para tirar, não para manter. Registre em `conferencia` (uma ou duas frases) o que tentou e por que o achado ficou.

## Para cada defeito

1. **A prova se repete?** Rode a medida de novo (para gravidade alta, sempre). Valor diferente: investigue antes de seguir.
2. **O critério se aplica?** Leia as exceções em `criterios-wcag.md` e confirme que nenhuma vale: componente inativo, logotipo, texto incidental, alvo em frase, espaçamento suficiente, controle do navegador sem alteração do autor, conteúdo bidimensional, foco só parcialmente coberto.
3. **É do produto ou da ferramenta?** Navegador sem interface, viewport, fonte ausente, estado transitório, aviso de primeira visita, extensão, bloqueio de requisição em produção (veja `requisicoesBloqueadas`).
4. **O critério e a fonte estão certos?** Número, nome oficial e nível conferidos em `criterios-wcag.md` ou na página da W3C; link abre; artigo da NN/g lido nesta sessão, com autor e título exatos.
5. **É duplicado?** Mesma causa em vários lugares vira um defeito com várias ocorrências.
6. **A gravidade segue a régua?** Releia `gravidade.md` e confira o fator que decidiu.
7. **A memória já registrou erro parecido?** Se sim, aplique a correção.

Resultado possível para cada item: mantém, muda a gravidade, funde com outro, vira suspeita ou sai.

## Para a entrega

- Nenhum defeito sem prova; nenhuma suspeita sem `falta`.
- Prints abertos e olhados: nada de dado pessoal visível (veja `seguranca.md`).
- Nenhum valor de credencial no script, nas medidas ou no relatório.
- "O que corrigir primeiro" no topo, com no máximo cinco itens.
- `node APOIO/scripts/validar-achados.mjs <pasta>` sem erros. Leia os avisos e resolva os que fizerem sentido.
