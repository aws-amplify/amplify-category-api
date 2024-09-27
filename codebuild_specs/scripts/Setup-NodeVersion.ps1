# param (
#   [string]$version
# )

# Write-Host "Installing NVM"
# choco install nvm -y

# Write-Host "Setting Environment Variables"
# setx NVM_HOME "C:\ProgramData\nvm" /M
# setx NVM_SYMLINK "C:\Program Files\nodejs" /M

# # Refresh environment variables in the current session
# $env:NVM_HOME = 'C:\ProgramData\nvm'
# $env:NVM_SYMLINK = 'C:\Program Files\nodejs'
# $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";$env:NVM_HOME;$env:NVM_SYMLINK"

# Write-Host "Installing Node.js version $version"
# nvm install $version
# nvm use $version

# Write-Host "Verifying Node Version"
# node -v

param (
    [string]$version
)

# Function to check if the script is running with administrator privileges
function Test-IsAdmin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to relaunch the script with administrator privileges
function Restart-AsAdmin {
    param (
        [string]$ScriptPath,
        [string[]]$ScriptArgs
    )

    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" " + ($ScriptArgs | ForEach-Object { "`"$_`"" }) -join ' '
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = $arguments
    $psi.Verb = "runas"  # Specifies to run the process as an administrator

    try {
        [System.Diagnostics.Process]::Start($psi) | Out-Null
        Write-Host "Relaunching script with administrator privileges..."
        exit  # Exit the current script
    }
    catch {
        Write-Error "Failed to relaunch script as administrator. $_"
        exit 1
    }
}

# Main Script Execution Starts Here

# Install NVM using Chocolatey
Write-Host "Installing NVM via Chocolatey..."
choco install nvm -y

# Refresh environment variables to include NVM's installation path
# This is necessary because the current PowerShell session may not recognize NVM immediately after installation
Write-Host "Refreshing environment variables..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + `
           [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify if NVM is installed by checking its version
try {
    Write-Host "Verifying NVM installation..."
    $nvmVersion = nvm version
    Write-Host "NVM Version: $nvmVersion"
}
catch {
    Write-Warning "'nvm' is still not recognized. Attempting to relaunch the script as admin..."
    Restart-AsAdmin -ScriptPath $MyInvocation.MyCommand.Definition -ScriptArgs $args
}

# Proceed to install and use the specified Node.js version
Write-Host "Installing Node.js version $version using NVM..."
nvm install $version

Write-Host "Switching to Node.js version $version..."
nvm use $version

# Optional: Verify Node.js installation
try {
    $nodeVersion = node -v
    Write-Host "Successfully switched to Node.js version: $nodeVersion"
}
catch {
    Write-Error "Failed to verify Node.js installation. $_"
}