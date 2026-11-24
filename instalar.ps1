<#
Instala o subagente ux-review no Windows.
  agents\ux-review.md -> <destino>\agents\ux-review.md
  suporte\            -> <destino>\ux-review\
Destino padrão: $env:CLAUDE_CONFIG_DIR ou ~\.claude

Uso: powershell -ExecutionPolicy Bypass -File .\instalar.ps1 [-Destino <pasta>] [-SemDependencias]
#>
[CmdletBinding()]
param(
  [string]$Destino,
  [switch]$SemDependencias
)
$ErrorActionPreference = 'Stop'

if (-not $Destino) {
  if ($env:CLAUDE_CONFIG_DIR) { $Destino = $env:CLAUDE_CONFIG_DIR } else { $Destino = Join-Path $HOME '.claude' }
}
$origem = $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 20 ou mais novo é necessário: https://nodejs.org/' }
# Sem aspas aninhadas: o Windows PowerShell 5.1 as remove ao chamar programas nativos.
$versao = (& node -p process.versions.node) | Select-Object -First 1
$maior = [int]($versao.Split('.')[0])
if ($maior -lt 20) { throw "Node.js $maior encontrado; o Playwright usado aqui exige 20 ou mais novo." }

$apoio = Join-Path $Destino 'ux-review'
$agentes = Join-Path $Destino 'agents'
New-Item -ItemType Directory -Force -Path $apoio, $agentes | Out-Null

# Atualiza a pasta de apoio sem apagar node_modules.
Get-ChildItem -LiteralPath $apoio -Force | Where-Object { $_.Name -ne 'node_modules' } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $origem 'suporte\*') -Destination $apoio -Recurse -Force
Copy-Item -LiteralPath (Join-Path $origem 'suporte\.npmrc') -Destination $apoio -Force

# Caminho absoluto com barras normais, que funciona no Git Bash, no PowerShell e no Node.
$caminho = (Resolve-Path -LiteralPath $apoio).Path -replace '\\', '/'
$texto = [System.IO.File]::ReadAllText((Join-Path $origem 'agents\ux-review.md'), [System.Text.Encoding]::UTF8)
$texto = $texto.Replace('{{UX_REVIEW_DIR}}', $caminho)
$utf8SemBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $agentes 'ux-review.md'), $texto, $utf8SemBom)

Write-Host "Agente:  $(Join-Path $agentes 'ux-review.md')"
Write-Host "Apoio:   $apoio"

if (-not $SemDependencias) {
  Push-Location $apoio
  try {
    Write-Host 'Instalando axe-core e Playwright pelo npm...'
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou.' }
    Write-Host 'Instalando o Chromium do Playwright...'
    & npx playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw 'A instalação do Chromium falhou.' }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "Dependências não instaladas (-SemDependencias). Rode depois: cd `"$apoio`"; npm ci; npx playwright install chromium"
}

Write-Host 'Pronto. Abra uma nova sessão do Claude Code para o agente aparecer.'
