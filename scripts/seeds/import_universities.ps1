param(
    [string]$AdminDb = "admin_db",
    [string]$ClientDb = "client_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$PsqlPath = "",
    [string]$DataFile = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$sharedDbScriptRoot = Join-Path (Split-Path $PSScriptRoot -Parent) "db"
. (Join-Path $sharedDbScriptRoot "common.ps1")

function ConvertTo-SqlText {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return "NULL"
    }

    $text = [string]$Value
    return "'" + $text.Replace("'", "''") + "'"
}

function ConvertTo-SqlNumber {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return "NULL"
    }

    $invariant = [System.Globalization.CultureInfo]::InvariantCulture
    return [System.Convert]::ToString($Value, $invariant)
}

function ConvertTo-SqlBool {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return "NULL"
    }

    if ($Value -is [bool]) {
        return $(if ($Value) { "TRUE" } else { "FALSE" })
    }

    $normalized = ([string]$Value).Trim().ToLowerInvariant()
    if ($normalized -in @("true", "t", "1", "yes", "y")) {
        return "TRUE"
    }
    if ($normalized -in @("false", "f", "0", "no", "n")) {
        return "FALSE"
    }

    throw "Could not parse boolean value '$Value'."
}

function ConvertTo-SqlDate {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return "NULL"
    }

    $dateValue = [datetime]::Parse([string]$Value, [System.Globalization.CultureInfo]::InvariantCulture)
    return "'" + $dateValue.ToString("yyyy-MM-dd") + "'"
}

function ConvertTo-SqlJsonb {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return "NULL"
    }

    $json = if ($Value -is [string]) { [string]$Value } else { $Value | ConvertTo-Json -Depth 30 -Compress }
    return "'" + $json.Replace("'", "''") + "'::jsonb"
}

function Build-UpsertStatements {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Universities
    )

    $columns = @(
        "id",
        "name",
        "description",
        "province",
        "city",
        "country",
        "ranking",
        "application_fee",
        "acceptance_rate",
        "tuition_fee",
        "application_deadline",
        "ielts_min",
        "toefl_min",
        "scholarship_available",
        "city_type",
        "campus_vibe",
        "application_schema",
        "metadata"
    )

    $updateColumns = $columns | Where-Object { $_ -ne "id" }
    $updateSql = ($updateColumns | ForEach-Object { "$_ = EXCLUDED.$_" }) -join ",`n    "
    $columnSql = $columns -join ", "

    $statements = New-Object System.Collections.Generic.List[string]

    foreach ($u in $Universities) {
        if (-not $u.id) {
            throw "A university row is missing 'id'."
        }
        if (-not $u.name) {
            throw "University '$($u.id)' is missing required field 'name'."
        }

        $values = @(
            (ConvertTo-SqlText $u.id),
            (ConvertTo-SqlText $u.name),
            (ConvertTo-SqlText $u.description),
            (ConvertTo-SqlText $u.province),
            (ConvertTo-SqlText $u.city),
            (ConvertTo-SqlText $u.country),
            (ConvertTo-SqlNumber $u.ranking),
            (ConvertTo-SqlNumber $u.applicationFee),
            (ConvertTo-SqlNumber $u.acceptanceRate),
            (ConvertTo-SqlNumber $u.tuitionFee),
            (ConvertTo-SqlDate $u.applicationDeadline),
            (ConvertTo-SqlNumber $u.ieltsMin),
            (ConvertTo-SqlNumber $u.toeflMin),
            (ConvertTo-SqlBool $u.scholarshipAvailable),
            (ConvertTo-SqlText $u.cityType),
            (ConvertTo-SqlText $u.campusVibe),
            (ConvertTo-SqlJsonb $u.applicationSchema),
            (ConvertTo-SqlJsonb $u.metadata)
        )

        $statement = @"
INSERT INTO universities ($columnSql)
VALUES (
    $($values -join ",`n    ")
)
ON CONFLICT (id) DO UPDATE SET
    $updateSql;
"@
        $statements.Add($statement.Trim())
    }

    return ($statements -join "`n`n")
}

function Write-SeedSqlFromTemplate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TemplateFile,
        [Parameter(Mandatory = $true)]
        [string]$UpsertStatements,
        [Parameter(Mandatory = $true)]
        [string]$OutFile
    )

    $template = Get-Content -LiteralPath $TemplateFile -Raw
    $sql = $template.Replace("{{UPSERT_STATEMENTS}}", $UpsertStatements)

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($OutFile, $sql, $utf8NoBom)
}

function Invoke-PsqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PsqlPath,
        [Parameter(Mandatory = $true)]
        [string]$DbName,
        [Parameter(Mandatory = $true)]
        [string]$SqlFile
    )

    & $PsqlPath -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SqlFile
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for database '$DbName'."
    }
}

function Get-DbCount {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PsqlPath,
        [Parameter(Mandatory = $true)]
        [string]$DbName
    )

    $result = & $PsqlPath -t -A -h $DbHost -p $DbPort -U $DbUser -d $DbName -c "SELECT COUNT(*) FROM universities;"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read row count for '$DbName'."
    }
    return ($result | Out-String).Trim()
}

$seedRoot = $PSScriptRoot
$resolvedDataFile = if ([string]::IsNullOrWhiteSpace($DataFile)) {
    Join-Path $seedRoot "data\universities.v1.json"
} else {
    $DataFile
}

if (-not (Test-Path -LiteralPath $resolvedDataFile)) {
    throw "Seed data file not found: $resolvedDataFile"
}

$adminTemplate = Join-Path $seedRoot "sql\upsert_admin_universities.sql.tpl"
$clientTemplate = Join-Path $seedRoot "sql\upsert_client_universities.sql.tpl"

if (-not (Test-Path -LiteralPath $adminTemplate)) {
    throw "Missing SQL template: $adminTemplate"
}
if (-not (Test-Path -LiteralPath $clientTemplate)) {
    throw "Missing SQL template: $clientTemplate"
}

$universities = Get-Content -LiteralPath $resolvedDataFile -Raw | ConvertFrom-Json
if (-not $universities) {
    throw "No universities were loaded from $resolvedDataFile"
}

if ($universities -isnot [System.Array]) {
    throw "Seed data must be a JSON array."
}

$upsertStatements = Build-UpsertStatements -Universities $universities

$adminSqlFile = Join-Path $env:TEMP "kallisto_seed_admin_universities.sql"
$clientSqlFile = Join-Path $env:TEMP "kallisto_seed_client_universities.sql"

Write-SeedSqlFromTemplate -TemplateFile $adminTemplate -UpsertStatements $upsertStatements -OutFile $adminSqlFile
Write-SeedSqlFromTemplate -TemplateFile $clientTemplate -UpsertStatements $upsertStatements -OutFile $clientSqlFile

if ($DryRun) {
    Write-Host "Dry run successful."
    Write-Host "Parsed universities: $($universities.Count)"
    Write-Host "Generated SQL:"
    Write-Host "  $adminSqlFile"
    Write-Host "  $clientSqlFile"
    exit 0
}

$psqlPath = Resolve-PsqlCommand -PsqlPath $PsqlPath

try {
    Invoke-PsqlFile -PsqlPath $psqlPath -DbName $AdminDb -SqlFile $adminSqlFile
    Invoke-PsqlFile -PsqlPath $psqlPath -DbName $ClientDb -SqlFile $clientSqlFile

    $adminCount = Get-DbCount -PsqlPath $psqlPath -DbName $AdminDb
    $clientCount = Get-DbCount -PsqlPath $psqlPath -DbName $ClientDb

    Write-Host "Seed import complete."
    Write-Host "Upserted rows from dataset: $($universities.Count)"
    Write-Host "admin_db.universities total rows: $adminCount"
    Write-Host "client_db.universities total rows: $clientCount"
}
finally {
    if (Test-Path -LiteralPath $adminSqlFile) {
        Remove-Item -LiteralPath $adminSqlFile -Force
    }
    if (Test-Path -LiteralPath $clientSqlFile) {
        Remove-Item -LiteralPath $clientSqlFile -Force
    }
}
