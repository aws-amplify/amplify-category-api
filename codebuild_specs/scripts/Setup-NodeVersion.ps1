Write-Host "Verifying NVM Installation"

if (-not (Test-Path $env:NVM_HOME)) {
  Write-Host "NVM not found at $env:NVM_HOME"
  exit 1
}

Write-Host "NVM found at $env:NVM_HOME"

