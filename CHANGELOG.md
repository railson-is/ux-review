# Mudanças

Uma seção por versão, da mais nova para a mais antiga. As versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## 0.2.0 (2026-11-25)

### Adicionado

- Pacote npm com a CLI `ux-review` (`instalar`, `verificar`, `desinstalar`, `config`, `versao`), que roda sem clonar: `npx github:railson-is/ux-review instalar`.
- Configuração por variáveis de ambiente, validada ao carregar: `UXR_LARGURAS`, `UXR_ALTURA`, `UXR_TEMPO_LIMITE_MS`, `UXR_VISIVEL`, `UXR_PERMITIR_ESCRITA`, `UXR_PALAVRAS_DE_RISCO`.
- `suporte/scripts/verificar.mjs`: diagnóstico da instalação (Node, dependências, Chromium, agente, configuração, gh).
- Versão do ux-review registrada nas medidas (`versoes.uxReview`) e no arquivo `.versao` da pasta de apoio.
- CI no GitHub Actions (Ubuntu e Windows): testes, calibração com mínimo, conteúdo do pacote, instalação e verificação.
- `docs/doze-fatores.md`: como o projeto aplica os 12 fatores.

### Mudado

- Exige Node.js 22 ou mais novo. O Node.js 20 saiu de suporte em abril de 2026.
- `instalar.sh` e `instalar.ps1` viraram atalhos para a CLI; a instalação tem uma implementação só.
- Ctrl+C e SIGTERM fecham o navegador antes de sair.
- O banco de provas aceita a porta pela variável `PORT`, e a calibração aceita `--minimo`.

## 0.1.0 (2026-11-24)

- Primeira versão: agente com cinco modos, regras de prova, gravidade e conferência, scripts de medição com axe-core e Playwright, banco de provas, guarda de somente leitura e instaladores.
