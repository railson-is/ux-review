<#
Atalho para quem clonou o repositório no Windows. A instalação de verdade está em
bin\ux-review.mjs, o mesmo código usado por "npx github:railson-is/ux-review instalar".

Uso: powershell -ExecutionPolicy Bypass -File .\instalar.ps1 [-Destino <pasta>] [-SemDependencias]
#>
[CmdletBinding()]
param(
  [string]$Destino,
  [switch]$SemDependencias
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js 22 ou mais novo é necessário: https://nodejs.org/'
}

$argumentos = @((Join-Path $PSScriptRoot 'bin\ux-review.mjs'), 'instalar')
if ($Destino) { $argumentos += @('--destino', $Destino) }
if ($SemDependencias) { $argumentos += '--sem-dependencias' }

& node @argumentos
exit $LASTEXITCODE
