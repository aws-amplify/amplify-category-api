param (
  [string]$version
)

# Ensure the script runs with administrative privileges
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Warning "You do not have Administrator rights to run this script.`nPlease re-run this script as an Administrator."
  exit 1
}

# Define the Node.js version you want to install
$version = "18.20.4"

Write-Host "Starting Node.js setup with version $version`n"

# Step 1: Install Chocolatey (if not already installed)
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Chocolatey..."
  Set-ExecutionPolicy Bypass -Scope Process -Force
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
  Write-Host "Chocolatey is already installed."
}

# Refresh Chocolatey's environment in the script
$env:ChocolateyInstall = $env:ChocolateyInstall -ne $null ? $env:ChocolateyInstall : "C:\ProgramData\chocolatey"
Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1" -ErrorAction SilentlyContinue

# Step 2: Install NVM via Chocolatey
Write-Host "Installing NVM via Chocolatey..."
choco install nvm -y

# Step 3: Set Environment Variables Persistently
Write-Host "Setting Environment Variables..."
setx NVM_HOME "C:\ProgramData\nvm" /M
setx NVM_SYMLINK "C:\Program Files\nodejs" /M

# Append NVM directories to the system PATH if not already present
$machinePath = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
$pathsToAdd = @("C:\ProgramData\nvm", "C:\Program Files\nodejs", "C:\ProgramData\chocolatey\bin")

foreach ($path in $pathsToAdd) {
  if (-not ($machinePath -split ';' | ForEach-Object { $_.Trim() }) -contains $path) {
      $machinePath += ";$path"
  }
}

setx PATH "$machinePath" /M

# Step 4: Update Current Session's Environment Variables
$env:NVM_HOME = 'C:\ProgramData\nvm'
$env:NVM_SYMLINK = 'C:\Program Files\nodejs'
foreach ($path in $pathsToAdd) {
  if (-not ($env:PATH -split ';' | ForEach-Object { $_.Trim() }) -contains $path) {
      $env:PATH += ";$path"
  }
}

Write-Host "Updated PATH: $env:PATH`n"

# Step 5: Import Chocolatey's PowerShell Module to Access refreshenv
try {
  Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1" -ErrorAction Stop
  Write-Host "Imported Chocolatey PowerShell module successfully."
} catch {
  Write-Warning "Failed to import Chocolatey PowerShell module. Proceeding without refreshenv."
}

# Step 6: Refresh Environment Variables in Current Session
if (Get-Command refreshenv -ErrorAction SilentlyContinue) {
  Write-Host "Refreshing environment variables using refreshenv..."
  refreshenv
} else {
  Write-Warning "refreshenv is not available. Manually updating PATH in the current session."
  # Manually update PATH if refreshenv isn't available
  foreach ($path in $pathsToAdd) {
      if (-not ($env:PATH -split ';' | ForEach-Object { $_.Trim() }) -contains $path) {
          $env:PATH += ";$path"
      }
  }
}

# Step 7: Verify NVM Accessibility
Write-Host "Verifying if NVM is accessible..."
if (Get-Command nvm -ErrorAction SilentlyContinue) {
  Write-Host "NVM is accessible."
} else {
  Write-Warning "NVM is not accessible. Attempting to use the full path to nvm.exe."

  # Define the full path to nvm.exe
  $nvmPath = "C:\ProgramData\chocolatey\lib\nvm\tools\nvm.exe"

  if (Test-Path $nvmPath) {
      Write-Host "Using NVM from $nvmPath"
      & $nvmPath install $version
      & $nvmPath use $version
  } else {
      Write-Error "nvm.exe not found at $nvmPath. Installation failed."
      exit 1
  }
}

# Step 8: Install and Use Node.js via NVM
if (Get-Command nvm -ErrorAction SilentlyContinue) {
  Write-Host "Installing Node.js version $version using NVM..."
  nvm install $version
  nvm use $version
}

# Step 9: Verify Node.js Installation
Write-Host "Verifying Node.js installation..."
$nodeVersion = node -v
if ($nodeVersion) {
  Write-Host "Node.js version $nodeVersion installed successfully."
} else {
  Write-Error "Node.js installation failed."
  exit 1
}