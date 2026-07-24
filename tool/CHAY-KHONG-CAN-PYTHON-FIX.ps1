<#
TOOL DONG BO KHONG CAN PYTHON - Fix loi Run as Admin
#>
# Luon lay duong dan folder chua file ps1 nay
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $scriptDir

Write-Host "Dang chay tai: $scriptDir"

$folderNames = @("KIEN-THUC", "kien-thuc", "Kien-thuc")
$folder = $null
foreach ($n in $folderNames) {
  $p = Join-Path $scriptDir $n
  if (Test-Path $p) { $folder = $p; break }
}
if (-not $folder) { $folder = Join-Path $scriptDir "kien-thuc" }

Write-Host "FOLDER=$folder"

$master = Join-Path $folder "moi-bi-den-co-phun-duoc-khong.html"
if (-not (Test-Path $master)) {
  $master = Join-Path $scriptDir "moi-bi-den-co-phun-duoc-khong.html"
}

Write-Host "MASTER=$master exists=$(Test-Path $master)"

if (-not (Test-Path $master)) {
  Write-Host "LOI: Khong thay file mau moi-bi-den-co-phun-duoc-khong.html"
  Write-Host "Thu muc hien tai: $(Get-Location)"
  Get-ChildItem $scriptDir | Write-Host
  pause
  exit
}

$masterHtml = Get-Content $master -Raw -Encoding UTF8

$styleMatch = [regex]::Match($masterHtml, "<style>(.*?)</style>", "Singleline")
$styleNew = if ($styleMatch.Success) { $styleMatch.Groups[1].Value } else { "" }

$sidebarMatch = [regex]::Match($masterHtml, '<aside class="article-side">.*?</aside>', "Singleline")
$sidebarNew = if ($sidebarMatch.Success) { $sidebarMatch.Value } else { "" }

$bookingMatch = [regex]::Match($masterHtml, '(<div class="booking-popover" id="bookingPopover".*?</section>\s*</div>)', "Singleline")
$bookingNew = if ($bookingMatch.Success) { $bookingMatch.Groups[1].Value } else { "" }

$count = 0
Get-ChildItem -Path $folder -Filter "*.html" | ForEach-Object {
  if ($_.Name -eq "moi-bi-den-co-phun-duoc-khong.html") { return }
  $path = $_.FullName
  $txt = Get-Content $path -Raw -Encoding UTF8
  $orig = $txt

  if ($styleNew) {
    $txt = [regex]::Replace($txt, "<style>.*?</style>", "<style>`n$styleNew`n    </style>", "Singleline")
  }
  if ($sidebarNew) {
    if ($txt -match '<aside class="article-side">') {
      $txt = [regex]::Replace($txt, '<aside class="article-side">.*?</aside>', $sidebarNew, "Singleline")
    }
  }
  if ($bookingNew) {
    if ($txt -match 'bookingPopover') {
      $txt = [regex]::Replace($txt, '<div class="booking-popover".*?</section>\s*</div>', $bookingNew, "Singleline")
    }
  }

  if ($txt -ne $orig) {
    Set-Content -Path $path -Value $txt -Encoding UTF8
    Write-Host "OK: $($_.Name)"
    $count++
  } else {
    Write-Host "SKIP: $($_.Name)"
  }
}

Write-Host "DONE: $count files updated"
pause
