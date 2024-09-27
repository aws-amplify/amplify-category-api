param (
  [string]$version
)

# # Function to ensure the script runs with Administrator privileges
# function Ensure-Administrator {
#   $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
#   if (-not $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
#     Write-Warning "Administrator privileges are required. Attempting to restart as Administrator..."

#     # Retrieve the script path dynamically
#     $scriptPath = $PSCommandPath

#     if (-not (Test-Path $scriptPath)) {
#       Write-Error "Script path not found: $scriptPath"
#       exit 1
#     }

#     # Create a new process with elevated privileges
#     Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -version `"$version`"" -Verb RunAs

#     # Exit the current non-elevated script
#     exit
#   }
# }

# # Call the self-elevation function
# Write-Host "Elevating script to Administrator privileges"
# Ensure-Administrator

# Write-Host "Starting Node.js setup with version $version`n"

# Write-Host "Installing NVM"
# choco install nvm -y

# Write-Host "Setting Environment Variables"
# setx NVM_HOME "C:\ProgramData\nvm" /M
# setx NVM_SYMLINK "C:\Program Files\nodejs" /M

# # Refresh environment variables in the current session
# $env:NVM_HOME = 'C:\ProgramData\nvm'
# $env:NVM_SYMLINK = 'C:\Program Files\nodejs'
# $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";$env:NVM_HOME;$env:NVM_SYMLINK"

Write-Host "PATH: "
$env:PATH

Write-Host "NVM_HOME: "
Get-ChildItem Env:NVM_HOME

Write-Host "NVM_SYMLINK: "
Get-ChildItem Env:NVM_SYMLINK

Write-Host "Installing Node.js version $version"
nvm install $version
nvm use $version

Write-Host "Verifying Node Version"
node -v