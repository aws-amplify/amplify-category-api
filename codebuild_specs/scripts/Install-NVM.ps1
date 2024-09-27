Write-Host "Installing NVM"
choco install nvm -y

# Permanently set environment variables. Should be available in the new session.
Write-Host "Setting Environment Variables"
setx NVM_HOME "C:\ProgramData\nvm" /M
setx NVM_SYMLINK "C:\Program Files\nodejs" /M

# Temporarily set environment variables. Should be available in the current session. 
# Write-Host "Adding NVM to PATH"
# $env:NVM_HOME = 'C:\ProgramData\nvm'
# $env:NVM_SYMLINK = 'C:\Program Files\nodejs'
# $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";$env:NVM_HOME;$env:NVM_SYMLINK"
