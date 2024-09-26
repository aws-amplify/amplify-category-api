param (
  [string]$version
)

Write-Host "Starting Node.js setup with version $version`n"

Write-Host "Installing NVM"
choco install nvm -y

nvm install 18.20.4
nvm use 18.20.4

Write-Host "Verifying Node Version"
node -v