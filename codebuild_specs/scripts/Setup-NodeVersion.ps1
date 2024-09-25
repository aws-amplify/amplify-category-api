param (
  [string]$version
)

Write-Host "Installing NVM and setting Node.js version to $version"

# Install Chocolatey if not already installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
  Set-ExecutionPolicy Bypass -Scope Process -Force;
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12;
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install nvm-windows
choco install nvm -y

# Add nvm to the session path
$env:PATH += ";$($env:ProgramFiles)\nvm"

# Install and use the specified Node.js version
nvm install $version
nvm use $version

# Verify the Node.js version in use
Write-Host "Node.js version in use:"
node -v
