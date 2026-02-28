param(
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

function Invoke-Sql {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$DbName,
        [Parameter(Mandatory = $true)][string]$Query
    )

    & $PsqlPath -v ON_ERROR_STOP=1 -t -A -h $DbHost -p $DbPort -U $DbUser -d $DbName -c $Query
    if ($LASTEXITCODE -ne 0) {
        throw "SQL execution failed on '$DbName'. Query: $Query"
    }
}

function Create-Database {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$DbName
    )

    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$DbName`";"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed creating database '$DbName'."
    }
}

function Drop-DatabaseForce {
    param(
        [Parameter(Mandatory = $true)][string]$PsqlPath,
        [Parameter(Mandatory = $true)][string]$DbName
    )

    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName';" | Out-Null
    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$DbName`";"
}

$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$clientDb = "kallisto_client_smoke_$stamp"
$adminDb = "kallisto_admin_smoke_$stamp"

try {
    Write-Host "Creating smoke databases..."
    Create-Database -PsqlPath $psqlPath -DbName $clientDb
    Create-Database -PsqlPath $psqlPath -DbName $adminDb

    Write-Host "Applying migrations (pass 1)..."
    & (Join-Path $PSScriptRoot "apply_migrations.ps1") -ClientDb $clientDb -AdminDb $adminDb -DbUser $DbUser -DbHost $DbHost -DbPort $DbPort -PsqlPath $PsqlPath
    if ($LASTEXITCODE -ne 0) {
        throw "Migration pass 1 failed."
    }

    Write-Host "Applying migrations (pass 2 / idempotency check)..."
    & (Join-Path $PSScriptRoot "apply_migrations.ps1") -ClientDb $clientDb -AdminDb $adminDb -DbUser $DbUser -DbHost $DbHost -DbPort $DbPort -PsqlPath $PsqlPath
    if ($LASTEXITCODE -ne 0) {
        throw "Migration pass 2 failed."
    }

    Write-Host "Running verification queries..."
    Invoke-Sql -PsqlPath $psqlPath -DbName $clientDb -Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'applications';" | Out-Null
    Invoke-Sql -PsqlPath $psqlPath -DbName $clientDb -Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profile_test_scores';" | Out-Null
    Invoke-Sql -PsqlPath $psqlPath -DbName $adminDb -Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'submitted_applications';" | Out-Null
    Invoke-Sql -PsqlPath $psqlPath -DbName $adminDb -Query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'global_settings';" | Out-Null

    Write-Host "Migration smoke test passed."
}
finally {
    Write-Host "Dropping smoke databases..."
    Drop-DatabaseForce -PsqlPath $psqlPath -DbName $clientDb
    Drop-DatabaseForce -PsqlPath $psqlPath -DbName $adminDb
}
