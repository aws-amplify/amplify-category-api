Write-Host "Installing NVM"
choco install nvm -y

Write-Host "Setting Environment Variables"
setx NVM_HOME "C:\ProgramData\nvm" /M
setx NVM_SYMLINK "C:\Program Files\nodejs" /M
setx PATH "%PATH%;%NVM_HOME%;%NVM_SYMLINK%" /M

if (-not (Test-Path $env:NVM_HOME)) {
  Write-Host "NVM not found at $env:NVM_HOME"
  exit 1
}

Write-Host "NVM found at $env:NVM_HOME"



$env:Path = "$env:Path;$env:NVM_HOME;$env:NVM_SYMLINK"

if (-not (Test-Path $env:NVM_HOME)) {
  Write-Host "NVM not found at $env:NVM_HOME"
  exit 1
}

Write-Host "NVM found at $env:NVM_HOME"

# Temporarily set environment variables. Should be available in the current session. 
# Write-Host "Adding NVM to PATH"
# $env:NVM_HOME = 'C:\ProgramData\nvm'
# $env:NVM_SYMLINK = 'C:\Program Files\nodejs'
# $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";$env:NVM_HOME;$env:NVM_SYMLINK"
