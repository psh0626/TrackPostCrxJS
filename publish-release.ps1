$ErrorActionPreference = "Stop"

function Set-JsonVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Version
    )

    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    $updated = $content -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$Version`""
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

function Open-NotesEditor {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-Error "VS Code CLI 'code' is required. Install it from VS Code Command Palette: Shell Command: Install 'code' command in PATH"
        exit 1
    }

    & code --wait $FilePath
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or not available in PATH."
    exit 1
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is not installed or not available in PATH."
    exit 1
}

$packagePath = Join-Path $scriptRoot "package.json"
$manifestPath = Join-Path $scriptRoot "manifest.json"
$packageJson = Get-Content -Path $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Output "Current version: $currentVersion"
$keepVersionAnswer = Read-Host "Keep this version? (y/n)"

if ($keepVersionAnswer -match "^(n|no)$") {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait($currentVersion)
    $newVersion = Read-Host "Enter new version"
    if ([string]::IsNullOrWhiteSpace($newVersion)) {
        Write-Error "Version cannot be empty."
        exit 1
    }

    Set-JsonVersion -Path $packagePath -Version $newVersion
    Set-JsonVersion -Path $manifestPath -Version $newVersion
    $currentVersion = $newVersion
    Write-Output "Updated version to $currentVersion in package.json and manifest.json"
}

Write-Output "Running build..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit 1
}

$tag = "v$currentVersion"
$defaultTitle = "TrackPost $tag"
$assetPath = Join-Path $scriptRoot "pre-publish\dist.zip"

if (-not (Test-Path -Path $assetPath)) {
    Write-Error "Asset not found: $assetPath"
    Write-Output "Check postbuild script output."
    exit 1
}

$titleInput = Read-Host "Release title (Enter for default: $defaultTitle)"
if ([string]::IsNullOrWhiteSpace($titleInput)) {
    $titleInput = $defaultTitle
}

$existingTagReleaseBody = ""
$latestReleaseBody = ""
$lastTag = ""
$recentCommitLines = @()

Push-Location "publish"
try {
    gh release view $tag --json body --jq ".body" *> $null
    if ($LASTEXITCODE -eq 0) {
        $existingTagReleaseBody = gh release view $tag --json body --jq ".body"
    }

    gh release view --json body --jq ".body" *> $null
    if ($LASTEXITCODE -eq 0) {
        $latestReleaseBody = gh release view --json body --jq ".body"
    }

    $lastTag = (git describe --tags --abbrev=0 2>$null)
    if (-not [string]::IsNullOrWhiteSpace($lastTag)) {
        $recentCommitLines = @(git log "$lastTag..HEAD" --pretty=format:"- %h %s")
    }
    else {
        $recentCommitLines = @(git log -n 15 --pretty=format:"- %h %s")
    }
}
finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace(($recentCommitLines -join ""))) {
    $recentCommitLines = @("- No recent commits found.")
}

$commitRangeTitle = "Commits since last tag"
if (-not [string]::IsNullOrWhiteSpace($lastTag)) {
    $commitRangeTitle = "Commits since $lastTag"
}

$templateHeader = @(
    "## Added",
    "- ",
    "",
    "## Changed",
    "- ",
    "",
    "## Fixed",
    "- ",
    "",
    "## Commit Summary",
    "",
    "### $commitRangeTitle",
    "",
    $recentCommitLines
)

if ([string]::IsNullOrWhiteSpace($existingTagReleaseBody)) {
    $notesDraft = @(
        $templateHeader,
        "",
        "<!--",
        "Reference: latest release note",
        "",
        $latestReleaseBody,
        "-->"
    )
}
else {
    $notesDraft = @(
        "<!-- Existing release note for this tag (editable) -->",
        "",
        $existingTagReleaseBody,
        "",
        "---",
        "",
        "<!-- Suggested template (optional) -->",
        "",
        $templateHeader,
        "",
        "<!--",
        "Reference: latest release note",
        "",
        $latestReleaseBody,
        "-->"
    )
}

$draftPath = Join-Path $scriptRoot ".release-notes-draft.md"
$notesDraft -join "`r`n" | Set-Content -Path $draftPath -Encoding UTF8

Write-Output "Opening release notes file in VS Code. Save and close editor to continue."
Open-NotesEditor -FilePath $draftPath

$notes = Get-Content -Path $draftPath -Raw
if ([string]::IsNullOrWhiteSpace($notes)) {
    Write-Error "Release notes are empty."
    exit 1
}

try {
    Push-Location "publish"
    try {
        gh release view $tag --json tagName *> $null
        $releaseExists = ($LASTEXITCODE -eq 0)

        if ($releaseExists) {
            Write-Output "Existing release found for $tag. Updating notes and replacing dist.zip."
            gh release upload $tag ".\dist.zip" --clobber
            gh release edit $tag --title $titleInput --notes $notes
        }
        else {
            Write-Output "Creating new release $tag."
            gh release create $tag ".\dist.zip" --title $titleInput --notes $notes
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if (Test-Path -Path $draftPath) {
        Remove-Item -Path $draftPath -Force
    }
}

Write-Output "Release flow completed."
