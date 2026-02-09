$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
npx wrangler deploy *>&1 | Tee-Object -FilePath "$PSScriptRoot\deploy-output.txt"
