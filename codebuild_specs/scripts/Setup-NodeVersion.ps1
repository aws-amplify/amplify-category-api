param (
  [string]$version
)

Write-Host "Starting Node.js setup with version $version`n"

Write-Host "Installing NVM via Chocolatey..."
choco install nvm -y

Write-Host "Finding nvm.exe"
Get-ChildItem -Path "C:\ProgramData\chocolatey\lib\" -Recurse -Filter "nvm.exe" -ErrorAction SilentlyContinue