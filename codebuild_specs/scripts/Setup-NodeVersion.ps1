param (
  [string]$version
)

# Function to ensure the script runs with Administrator privileges
function Ensure-Administrator {
  $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
      Write-Warning "Administrator privileges are required. Attempting to restart as Administrator..."

      # Retrieve the script path dynamically
      $scriptPath = $PSCommandPath

      if (-not (Test-Path $scriptPath)) {
          Write-Error "Script path not found: $scriptPath"
          exit 1
      }

      # Create a new process with elevated privileges
      Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -version `"$version`"" -Verb RunAs

      # Exit the current non-elevated script
      exit
  }
}

# Call the self-elevation function
Ensure-Administrator

Write-Host "Starting Node.js setup with version $version`n" -ForegroundColor Cyan

Write-Host "Installing NVM"
choco install nvm -y

nvm install 18.20.4
nvm use 18.20.4

Write-Host "Verifying Node Version"
node -v