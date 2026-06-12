param(
  [ValidateSet('patch', 'minor', 'major')]
  [string]$Bump = 'patch',

  [string]$Registry = 'https://registry.npmjs.org/',

  [string]$InstallRegistry,

  [string]$NpmToken,

  [ValidateSet('public', 'restricted')]
  [string]$Access = 'public',

  [switch]$DryRun,

  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found in PATH."
  }
}

function Read-PackageJson([string]$PackageJsonPath) {
  return Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
}

function Invoke-Npm([string]$WorkingDirectory, [string[]]$Arguments, [string]$UserConfig = $null) {
  Push-Location $WorkingDirectory
  try {
    if (-not [string]::IsNullOrWhiteSpace($UserConfig)) {
      & npm --userconfig $UserConfig @Arguments
    }
    else {
      & npm @Arguments
    }

    if ($LASTEXITCODE -ne 0) {
      throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Get-NpmRegistryAuthKey([string]$TargetRegistry) {
  $normalized = $TargetRegistry.Trim()
  if (-not $normalized.Contains('://')) {
    if ($normalized.StartsWith('//')) {
      $normalized = "https:$normalized"
    }
    else {
      $normalized = "https://$normalized"
    }
  }

  $uri = [uri]$normalized
  return "//$($uri.Host)/"
}

function New-PublishUserConfig([string]$Token, [string]$TargetRegistry) {
  $authKey = Get-NpmRegistryAuthKey -TargetRegistry $TargetRegistry
  $configPath = Join-Path $env:TEMP ("dtp-solid-publish-{0}.npmrc" -f ([Guid]::NewGuid().ToString('n')))

  @(
    '@arminmajerie:registry=' + $TargetRegistry
    'registry=' + $TargetRegistry
    "${authKey}:_authToken=$Token"
  ) | Set-Content -LiteralPath $configPath -Encoding ascii

  return $configPath
}

function Resolve-PublishToken([string]$ExplicitToken) {
  if (-not [string]::IsNullOrWhiteSpace($ExplicitToken)) {
    return $ExplicitToken.Trim()
  }

  if (-not [string]::IsNullOrWhiteSpace($env:NPM_TOKEN)) {
    return $env:NPM_TOKEN.Trim()
  }

  return $null
}

function Assert-PublishAuth([string]$UserConfig, [string]$TargetRegistry) {
  Step "Verifying npm publish credentials"
  & npm --userconfig $UserConfig whoami --registry $TargetRegistry
  if ($LASTEXITCODE -ne 0) {
    throw @"
npm whoami failed for registry $TargetRegistry.

Check your granular access token:
  - Permissions: Read and Write for @arminmajerie/*
  - Bypass two-factor authentication (2FA): enabled
  - Token copied into NPM_TOKEN (or pass -NpmToken)
"@
  }
}

function Get-WorkspacePackageJsons([string]$WorkspaceRoot) {
  $excludedDirectoryNames = @(
    '.git',
    'coverage',
    'dist',
    'node_modules',
    'out',
    'target',
    'tmp',
    'vendor'
  )

  $directories = New-Object System.Collections.Generic.Queue[string]
  $packageJsons = New-Object System.Collections.Generic.List[System.IO.FileInfo]
  $directories.Enqueue($WorkspaceRoot)

  while ($directories.Count -gt 0) {
    $directory = $directories.Dequeue()

    foreach ($packageFile in Get-ChildItem -LiteralPath $directory -File -Filter 'package.json') {
      $packageJsons.Add($packageFile)
    }

    foreach ($childDirectory in Get-ChildItem -LiteralPath $directory -Directory) {
      if ($excludedDirectoryNames -contains $childDirectory.Name) {
        continue
      }

      $directories.Enqueue($childDirectory.FullName)
    }
  }

  return $packageJsons
}

function Get-NotePropertyValue([object]$Object, [string]$PropertyName) {
  if ($null -eq $Object) {
    return $null
  }

  foreach ($property in @($Object.PSObject.Properties)) {
    if ($property.Name -eq $PropertyName) {
      return $property.Value
    }
  }

  return $null
}

function Get-DependencyReferences([string]$WorkspaceRoot, [string]$DependencyName) {
  $sections = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
  $references = New-Object System.Collections.Generic.List[object]

  foreach ($packageFile in Get-WorkspacePackageJsons -WorkspaceRoot $WorkspaceRoot) {
    $package = Read-PackageJson -PackageJsonPath $packageFile.FullName

    foreach ($section in $sections) {
      $dependencySection = Get-NotePropertyValue -Object $package -PropertyName $section
      if ($null -eq $dependencySection -or $dependencySection -isnot [System.Management.Automation.PSCustomObject]) {
        continue
      }

      $currentVersion = Get-NotePropertyValue -Object $dependencySection -PropertyName $DependencyName
      if ($null -ne $currentVersion) {
        $references.Add([pscustomobject]@{
          PackageJsonPath = $packageFile.FullName
          PackageDirectory = $packageFile.DirectoryName
          Section = $section
          CurrentVersion = $currentVersion
        })
      }
    }
  }

  return $references | Sort-Object PackageJsonPath, Section
}

function Test-RegistryConsumerVersion([string]$Version) {
  if ([string]::IsNullOrWhiteSpace($Version)) {
    return $false
  }

  if ($Version -eq '*') {
    return $false
  }

  foreach ($prefix in @('workspace:', 'file:', 'link:', 'npm:')) {
    if ($Version.StartsWith($prefix, [System.StringComparison]::Ordinal)) {
      return $false
    }
  }

  return $true
}

function Get-RegistryConsumerVersion([string]$CurrentVersion, [string]$NewVersion) {
  if (-not (Test-RegistryConsumerVersion -Version $CurrentVersion)) {
    return $null
  }

  if ($CurrentVersion.StartsWith('^', [System.StringComparison]::Ordinal)) {
    return "^$NewVersion"
  }

  if ($CurrentVersion.StartsWith('~', [System.StringComparison]::Ordinal)) {
    return "~$NewVersion"
  }

  if ($CurrentVersion.StartsWith('>=', [System.StringComparison]::Ordinal)) {
    return ">=$NewVersion"
  }

  return $NewVersion
}

function Invoke-ConsumerInstallRefresh(
  [string]$InstallRoot,
  [string[]]$InstallArgs,
  [int]$MaxAttempts = 6
) {
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    if ($attempt -gt 1) {
      Write-Host "  retrying npm install ($attempt/$MaxAttempts) after registry propagation delay..." -ForegroundColor DarkYellow
      Start-Sleep -Seconds 10
    }

    try {
      Invoke-Npm -WorkingDirectory $InstallRoot -Arguments $InstallArgs
      return
    }
    catch {
      if ($attempt -eq $MaxAttempts) {
        throw
      }
    }
  }

  throw "npm install failed in $InstallRoot after $MaxAttempts attempts"
}

function Get-NpmInstallRoot([string]$PackageDirectory) {
  $directory = [System.IO.Path]::GetFullPath($PackageDirectory)

  if (Test-Path -LiteralPath (Join-Path $directory 'package-lock.json')) {
    return $directory
  }

  $packageJsonPath = Join-Path $directory 'package.json'
  if (Test-Path -LiteralPath $packageJsonPath) {
    $package = Read-PackageJson -PackageJsonPath $packageJsonPath
    $workspaces = Get-NotePropertyValue -Object $package -PropertyName 'workspaces'
    if ($null -ne $workspaces) {
      return $directory
    }
  }

  return $null
}

Assert-Command npm

$monorepoRoot = $PSScriptRoot
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$packageDirectory = Join-Path $PSScriptRoot 'packages\dtp-solid'
$packageJsonPath = Join-Path $packageDirectory 'package.json'
$dependencyName = '@arminmajerie/date-time-picker-solid'

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
  throw "package.json not found: $packageJsonPath"
}

$libraryPackage = Read-PackageJson -PackageJsonPath $packageJsonPath
$libraryPackageName = Get-NotePropertyValue -Object $libraryPackage -PropertyName 'name'
if ($libraryPackageName -ne $dependencyName) {
  throw "Expected package name '$dependencyName' but found '$libraryPackageName'"
}

$references = @(Get-DependencyReferences -WorkspaceRoot $workspaceRoot -DependencyName $dependencyName)

$publishRegistry = $Registry.Trim()
if (-not $publishRegistry.EndsWith('/')) {
  $publishRegistry += '/'
}

$publishToken = Resolve-PublishToken -ExplicitToken $NpmToken
$publishUserConfig = $null

if ($DryRun) {
  if (-not [string]::IsNullOrWhiteSpace($publishToken)) {
    Write-Host 'Dry run: skipping publish auth setup' -ForegroundColor DarkGray
  }
}
elseif ([string]::IsNullOrWhiteSpace($publishToken)) {
  throw @"
NPM_TOKEN is not set.

Set your granular access token before publishing:
  `$env:NPM_TOKEN = 'npm_...'
  .\pushNPM.ps1

Or pass it explicitly:
  .\pushNPM.ps1 -NpmToken 'npm_...'

The script ignores ~/.npmrc on purpose so a stale classic token cannot override NPM_TOKEN.
"@
}
else {
  $publishUserConfig = New-PublishUserConfig -Token $publishToken -TargetRegistry $publishRegistry
  Assert-PublishAuth -UserConfig $publishUserConfig -TargetRegistry $publishRegistry
}

Push-Location $packageDirectory
try {
  Step "Bumping $dependencyName version ($Bump)"
  & npm version $Bump --no-git-tag-version
  if ($LASTEXITCODE -ne 0) {
    throw "npm version failed with exit code $LASTEXITCODE"
  }

  $currentPackage = Read-PackageJson -PackageJsonPath $packageJsonPath
  $newVersion = $currentPackage.version

  Step "Building $dependencyName@$newVersion"
  Invoke-Npm -WorkingDirectory $monorepoRoot -Arguments @(
    'run',
    'build',
    '-w',
    $dependencyName
  )

  if ($DryRun) {
    Step "Dry run: packing $dependencyName@$newVersion"
    & npm pack
    if ($LASTEXITCODE -ne 0) {
      throw "npm pack failed with exit code $LASTEXITCODE"
    }

    Write-Host "[OK] Packed $dependencyName@$newVersion (consumer package.json files were not changed in dry-run mode)" -ForegroundColor Green
    return
  }

  Step "Publishing $dependencyName@$newVersion to $publishRegistry"
  $publishArgs = @('publish', '--access', $Access, '--registry', $publishRegistry)

  try {
    if ($publishUserConfig) {
      & npm --userconfig $publishUserConfig @publishArgs
    }
    else {
      & npm @publishArgs
    }

    if ($LASTEXITCODE -ne 0) {
      throw "npm publish failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    if ($publishUserConfig -and (Test-Path -LiteralPath $publishUserConfig)) {
      Remove-Item -LiteralPath $publishUserConfig -Force -ErrorAction SilentlyContinue
    }
  }

  $updatedReferences = New-Object System.Collections.Generic.List[object]

  if ($references.Count -gt 0) {
    Step "Updating consumer dependency entries to $newVersion"
    $monorepoPackagesRoot = Join-Path $monorepoRoot 'packages'
    foreach ($reference in $references) {
      if ($reference.PackageDirectory.StartsWith($monorepoPackagesRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Host "  skipped $($reference.PackageJsonPath) [same monorepo workspace]" -ForegroundColor DarkGray
        continue
      }

      $nextVersion = Get-RegistryConsumerVersion -CurrentVersion ([string]$reference.CurrentVersion) -NewVersion $newVersion
      if ($null -eq $nextVersion) {
        Write-Host "  skipped $($reference.PackageJsonPath) [$($reference.Section)=$($reference.CurrentVersion)]" -ForegroundColor DarkGray
        continue
      }

      if ($nextVersion -eq [string]$reference.CurrentVersion) {
        Write-Host "  unchanged $($reference.PackageJsonPath) [$($reference.Section)=$($reference.CurrentVersion)]" -ForegroundColor DarkGray
        continue
      }

      Invoke-Npm -WorkingDirectory $reference.PackageDirectory -Arguments @(
        'pkg',
        'set',
        "$($reference.Section).$dependencyName=$nextVersion"
      )
      $updatedReferences.Add($reference)
      Write-Host "  updated $($reference.PackageJsonPath) [$($reference.Section): $($reference.CurrentVersion) -> $nextVersion]" -ForegroundColor DarkGray
    }
  }
  else {
    Step 'No consumer package.json files reference the package'
  }

  if (-not $SkipInstall -and $updatedReferences.Count -gt 0) {
    $installRoots = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($reference in $updatedReferences) {
      $installRoot = Get-NpmInstallRoot -PackageDirectory $reference.PackageDirectory
      if (-not [string]::IsNullOrWhiteSpace($installRoot)) {
        [void]$installRoots.Add($installRoot)
      }
    }

    foreach ($installRoot in ($installRoots | Sort-Object)) {
      Step "Refreshing install metadata in $installRoot (npm install)"
      $installArgs = @('install')
      if (-not [string]::IsNullOrWhiteSpace($InstallRegistry)) {
        $installArgs += @('--registry', $InstallRegistry)
      }

      Invoke-ConsumerInstallRefresh -InstallRoot $installRoot -InstallArgs $installArgs
    }
  }
  elseif (-not $SkipInstall) {
    Step 'Skipping install refresh (no registry-pinned consumer dependencies were changed)'
  }

  Write-Host "[OK] Published $dependencyName@$newVersion" -ForegroundColor Green
}
finally {
  Pop-Location
}
