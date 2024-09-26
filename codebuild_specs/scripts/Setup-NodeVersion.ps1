param (
  [string]$version
)

Write-Host "Starting Node.js setup with version $version`n"

try {
  # Set execution policy
  Set-ExecutionPolicy Bypass -Scope Process -Force

  # Install Chocolatey if not already installed
  if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing Chocolatey..."
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    if (Get-Command choco -ErrorAction SilentlyContinue) {
      Write-Host "Chocolatey installed successfully.`n"
    } else {
      Write-Error "Chocolatey installation failed."
      exit 1
    }
  } else {
    Write-Host "Chocolatey is already installed.`n"
  }

  # List installed Node.js versions using Chocolatey
  choco list nodejs.install --all

  # Install the specified Node.js version using Chocolatey
  Write-Host "Installing Node.js version $version using Chocolatey..."
  choco install nodejs.install --version $version -y --no-progress
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install Node.js version $version."
    exit 1
  } else {
    Write-Host "Node.js version $version installed successfully.`n"
  }

  # Ensure Node.js is added to PATH
  $nodePath = "${env:ProgramFiles}\nodejs"
  if (!(Test-Path $nodePath)) {
    Write-Error "Node.js installation directory not found at $nodePath."
    exit 1
  }
  $env:Path = "$nodePath;$env:Path"

  # Verify the Node.js version in use
  Write-Host "Verifying Node.js installation..."
  $nodeVersion = node -v
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Node.js version in use: $nodeVersion`n"
  } else {
    Write-Error "Failed to retrieve Node.js version."
    exit 1
  }

  # Verify NPM installation
  $npmVersion = npm -v
  if ($LASTEXITCODE -eq 0) {
    Write-Host "NPM version in use: $npmVersion`n"
  } else {
    Write-Error "Failed to retrieve NPM version."
    exit 1
  }

} catch {
  Write-Error "An unexpected error occurred: $_"
  exit 1
}
