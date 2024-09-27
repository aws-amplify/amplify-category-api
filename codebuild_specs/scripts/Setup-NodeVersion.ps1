param (
  [string]$version
)

# Define Variables
$nodeVersion = "18.20.4"
$githubApiUrl = "https://api.github.com/repos/coreybutler/nvm-windows/releases/latest"
$installerTempPath = "$env:TEMP\nvm-setup.exe"

Write-Host "========================================================"
Write-Host "Starting installation of the latest nvm-windows and Node.js $nodeVersion"
Write-Host "========================================================`n"

# Step 1: Uninstall Existing nvm and nvm.install via Chocolatey (if any)
Write-Host "Uninstalling existing 'nvm' and 'nvm.install' Chocolatey packages (if any)..."
choco uninstall nvm -y | Out-Null
choco uninstall nvm.install -y | Out-Null
Write-Host "Uninstallation completed.`n"

# Step 2: Fetch Latest nvm-windows Release Information from GitHub
Write-Host "Fetching the latest nvm-windows release information from GitHub..."
try {
    $response = Invoke-RestMethod -Uri $githubApiUrl -Headers @{
        "User-Agent" = "PowerShell"
    } -ErrorAction Stop
} catch {
    Write-Error "Failed to fetch release information from GitHub. $_"
    exit 1
}

# Extract the download URL for nvm-setup.exe
$nvmInstallerAsset = $response.assets | Where-Object { $_.name -eq "nvm-setup.exe" }

if (-not $nvmInstallerAsset) {
    Write-Error "nvm-setup.exe asset not found in the latest release."
    exit 1
}

$nvmInstallerUrl = $nvmInstallerAsset.browser_download_url

Write-Host "Latest nvm-windows version: $($response.tag_name)"
Write-Host "Download URL: $nvmInstallerUrl`n"

# Step 3: Download the nvm-windows Installer
Write-Host "Downloading nvm-windows installer to $installerTempPath..."
try {
    Invoke-WebRequest -Uri $nvmInstallerUrl -OutFile $installerTempPath -UseBasicParsing -ErrorAction Stop
    Write-Host "Download completed: $installerTempPath`n"
} catch {
    Write-Error "Failed to download nvm-windows installer. $_"
    exit 1
}

# Step 4: Install nvm-windows Silently
Write-Host "Installing nvm-windows silently..."
try {
    Start-Process -FilePath $installerTempPath -ArgumentList "/S" -Wait -ErrorAction Stop
    Write-Host "nvm-windows installation completed.`n"
} catch {
    Write-Error "Failed to install nvm-windows. $_"
    exit 1
}

# Optional: Remove the installer after installation
Write-Host "Removing the installer file..."
Remove-Item $installerTempPath -Force
Write-Host "Installer removed.`n"

# Step 5: Set Environment Variables Persistently Using setx
Write-Host "Setting Environment Variables..."
# Define installation paths
$nvmHome = "C:\Program Files\nvm"
$nvmSymlink = "C:\Program Files\nodejs"

# Set NVM_HOME and NVM_SYMLINK
setx NVM_HOME "$nvmHome" /M
setx NVM_SYMLINK "$nvmSymlink" /M

# Append NVM directories to the system PATH if not already present
Write-Host "Appending NVM directories to system PATH if not already present..."
$machinePath = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
$pathsToAdd = @($nvmHome, $nvmSymlink)

foreach ($path in $pathsToAdd) {
    if (-not ($machinePath -split ';' | ForEach-Object { $_.Trim() }) -contains $path) {
        $machinePath += ";$path"
    }
}

setx PATH "$machinePath" /M
Write-Host "Environment Variables set successfully.`n"

# Step 6: Update Current PowerShell Session's Environment Variables
Write-Host "Updating current PowerShell session's environment variables..."
$env:NVM_HOME = $nvmHome
$env:NVM_SYMLINK = $nvmSymlink

foreach ($path in $pathsToAdd) {
    if (-not ($env:PATH -split ';' | ForEach-Object { $_.Trim() }) -contains $path)) {
        $env:PATH += ";$path"
    }
}

Write-Host "Current session PATH updated: $env:PATH`n"

# Step 7: Verify nvm Accessibility
Write-Host "Verifying if nvm is accessible..."
if (Get-Command nvm -ErrorAction SilentlyContinue) {
    Write-Host "nvm is accessible.`n"
} else {
    Write-Warning "nvm is not accessible. Attempting to use the full path to nvm.exe."
    $nvmPath = "$nvmHome\nvm.exe"
    if (Test-Path $nvmPath) {
        Write-Host "Found nvm.exe at $nvmPath"
        # Add nvm to PATH for current session
        $env:PATH += ";$nvmHome"
    } else {
        Write-Error "nvm.exe not found at $nvmPath. Installation failed."
        exit 1
    }
}

# Step 8: Install and Use the Desired Node.js Version
Write-Host "Installing Node.js version $nodeVersion using nvm..."
try {
    nvm install $nodeVersion
    nvm use $nodeVersion
    Write-Host "Node.js version $nodeVersion installed and set as default.`n"
} catch {
    Write-Error "Failed to install or use Node.js version $nodeVersion. $_"
    exit 1
}

# Step 9: Verify Node.js Installation
Write-Host "Verifying Node.js installation..."
$installedNodeVersion = node -v
if ($installedNodeVersion) {
    Write-Host "Node.js version $installedNodeVersion installed successfully."
} else {
    Write-Error "Node.js installation verification failed."
    exit 1
}

# Optional: Clean Up Environment Variables Duplication (Avoid Duplicates in PATH)
Write-Host "`nCleaning up duplicate entries in PATH (if any)..."
$env:PATH = ($env:PATH -split ';' | Select-Object -Unique) -join ';'
setx PATH "$env:PATH" /M
Write-Host "Cleanup completed.`n"

Write-Host "========================================================"
Write-Host "nvm-windows and Node.js installation completed successfully!"
Write-Host "========================================================"