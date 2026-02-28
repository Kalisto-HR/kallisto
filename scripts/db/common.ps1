Set-StrictMode -Version Latest

function Resolve-PsqlCommand {
    param(
        [string]$PsqlPath = ""
    )

    if (-not [string]::IsNullOrWhiteSpace($PsqlPath)) {
        if (Test-Path -LiteralPath $PsqlPath) {
            return (Resolve-Path -LiteralPath $PsqlPath).Path
        }
        throw "Provided -PsqlPath does not exist: $PsqlPath"
    }

    if (-not [string]::IsNullOrWhiteSpace($env:PSQL_PATH)) {
        if (Test-Path -LiteralPath $env:PSQL_PATH) {
            return (Resolve-Path -LiteralPath $env:PSQL_PATH).Path
        }
    }

    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidateRoots = @("$env:ProgramFiles\PostgreSQL", "$env:ProgramFiles(x86)\PostgreSQL")
    foreach ($root in $candidateRoots) {
        if (-not (Test-Path -LiteralPath $root)) {
            continue
        }
        $versions = Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name -Descending
        foreach ($version in $versions) {
            $candidate = Join-Path $version.FullName "bin\psql.exe"
            if (Test-Path -LiteralPath $candidate) {
                return $candidate
            }
        }
    }

    throw "psql is not available in PATH. Pass -PsqlPath 'C:\Program Files\PostgreSQL\<version>\bin\psql.exe' or set PSQL_PATH."
}
