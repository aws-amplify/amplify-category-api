param (
  [string]$version
)

Write-Host "Starting Node.js setup with version $version`n"

Write-Host "Installing NVM"
choco install nvm -y
