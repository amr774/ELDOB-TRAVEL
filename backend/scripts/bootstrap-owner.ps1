param(
    [Parameter(Mandatory = $true)]
    [string]$Email
)
$ErrorActionPreference = 'Stop'
$bootstrap = Join-Path $PSScriptRoot 'bootstrap-owner.cjs'
# The password is never part of a process argument, environment variable, or file.
& node $bootstrap $Email --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Creating the first local OWNER for $Email"
Write-Host 'Use a unique password: 14+ characters, maximum 72 UTF-8 bytes.'
$secret = Read-Host 'Password (hidden)' -AsSecureString
$confirmation = Read-Host 'Confirm password (hidden)' -AsSecureString
$firstPtr = [IntPtr]::Zero
$secondPtr = [IntPtr]::Zero
try {
    $firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
    $second = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
    if ($plain -cne $second) { throw 'Passwords do not match. No account created.' }
    if ($plain.Length -lt 14 -or [Text.Encoding]::UTF8.GetByteCount($plain) -gt 72) {
        throw 'Password must have at least 14 characters and at most 72 UTF-8 bytes. No account created.'
    }
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    @{ password = $plain } | ConvertTo-Json -Compress | & node $bootstrap $Email
    $result = $LASTEXITCODE
} finally {
    if ($firstPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr) }
    if ($secondPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr) }
    $plain = $null
    $second = $null
    $secret.Dispose()
    $confirmation.Dispose()
}
if ($result -ne 0) { throw 'Bootstrap did not complete successfully. Read the safe status above before retrying.' }
