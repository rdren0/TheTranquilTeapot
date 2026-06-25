# Auto-derive game-ready sprites in public/assets/cafe/derived/ from the source
# art dropped into characters_/, furniture_/ and me/. Runs automatically before
# `npm run dev` (see package.json "predev"), and can be run by hand:
#
#   powershell -ExecutionPolicy Bypass -File scripts/derive_assets.ps1
#
# Each output is skipped when its source(s) haven't changed since the last build,
# so repeat runs are near-instant. Pass -Force to rebuild everything.
#
# This covers the *custom* art the user swaps. The licensed Maygetsu pack tiles
# (tables, chairs, floors, ...) are handled separately by scripts/crop_assets.ps1.
param([switch]$Force)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$cafe = Join-Path $root "public\assets\cafe"
$pub  = Join-Path $cafe "derived"
$dist = Join-Path $root "dist\assets\cafe\derived"
New-Item -ItemType Directory -Force $pub | Out-Null

$FW = 32; $FH = 48; $PAD = 2

function NeedsBuild($outName, $sources) {
  if ($Force) { return $true }
  $outFile = Join-Path $pub "$outName.png"
  if (-not (Test-Path $outFile)) { return $true }
  $outT = (Get-Item $outFile).LastWriteTimeUtc
  foreach ($s in $sources) {
    if (-not (Test-Path $s)) { throw "Missing source: $s" }
    if ((Get-Item $s).LastWriteTimeUtc -gt $outT) { return $true }
  }
  return $false
}

function SaveBoth($bmp, $name) {
  $bmp.Save((Join-Path $pub "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  if (Test-Path $dist) { $bmp.Save((Join-Path $dist "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png) }
  Write-Host "  + $name"
}

function LoadArgb($path) {
  $orig = [System.Drawing.Image]::FromFile($path)
  $b = New-Object System.Drawing.Bitmap $orig.Width, $orig.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($b); $g.DrawImage($orig, 0, 0, $orig.Width, $orig.Height); $g.Dispose(); $orig.Dispose()
  return $b
}

# Read a bitmap into a BGRA byte buffer. When -whiteKey, near-white opaque pixels
# are made transparent (and written back). Returns the buffer + geometry.
function GetBuf($bmp, $whiteKey) {
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $mode = if ($whiteKey) { [System.Drawing.Imaging.ImageLockMode]::ReadWrite } else { [System.Drawing.Imaging.ImageLockMode]::ReadOnly }
  $data = $bmp.LockBits($rect, $mode, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = $w * $h * 4; $buf = New-Object byte[] $bytes
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $bytes)
  if ($whiteKey) {
    for ($i = 0; $i -lt $bytes; $i += 4) {
      if ($buf[$i + 3] -gt 24 -and $buf[$i] -gt 238 -and $buf[$i + 1] -gt 238 -and $buf[$i + 2] -gt 238) { $buf[$i + 3] = 0 }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $bytes)
  }
  $stride = $data.Stride; $bmp.UnlockBits($data)
  return @{ buf = $buf; stride = $stride; w = $w; h = $h }
}

# Bounding box of opaque (alpha>24) pixels inside [x0..x1, y0..y1].
function BBox($p, $x0, $y0, $x1, $y1) {
  $minX = $x1; $maxX = $x0 - 1; $minY = $y1; $maxY = $y0 - 1
  for ($y = $y0; $y -le $y1; $y++) {
    $row = $y * $p.stride
    for ($x = $x0; $x -le $x1; $x++) {
      if ($p.buf[$row + ($x * 4) + 3] -gt 24) {
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  return @{ minX = $minX; minY = $minY; bw = ($maxX - $minX) + 1; bh = ($maxY - $minY) + 1; found = ($maxX -ge $minX) }
}

function NewCanvas($w, $h) {
  $out = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear([System.Drawing.Color]::Transparent)
  return @{ bmp = $out; g = $g }
}

# ---- A standalone prop: alpha-trim (optionally white-key), then either keep the
# trimmed pixels (propMode) or fit into a FW x FH bottom-centred sprite cell. ----
function DeriveProp($srcPath, $outName, $whiteKey, $fit, $fitW, $fitH) {
  $bmp = LoadArgb $srcPath
  $p = GetBuf $bmp $whiteKey
  $b = BBox $p 0 0 ($p.w - 1) ($p.h - 1)
  if ($fit) {
    $scale = [math]::Min(($fitH - $PAD) / $b.bh, $fitW / $b.bw)
    $dw = [math]::Max(1, [int][math]::Round($b.bw * $scale)); $dh = [math]::Max(1, [int][math]::Round($b.bh * $scale))
    $c = NewCanvas $fitW $fitH
    $dx = [int][math]::Floor(($fitW - $dw) / 2); $dy = $fitH - $dh
  } else {
    $dw = $b.bw; $dh = $b.bh
    $c = NewCanvas $dw $dh
    $dx = 0; $dy = 0
  }
  $c.g.DrawImage($bmp, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle $b.minX, $b.minY, $b.bw, $b.bh), [System.Drawing.GraphicsUnit]::Pixel)
  $c.g.Dispose(); SaveBoth $c.bmp $outName; $c.bmp.Dispose(); $bmp.Dispose()
}

# ---- An 8x2 directional grid (top row = front, bottom = back) -> two 8-frame
# 32x48 sheets, with one uniform scale + shared baseline so frames don't jitter. -
function DeriveGrid($srcPath, $frontName, $backName) {
  $bmp = LoadArgb $srcPath
  $p = GetBuf $bmp $false
  $cols = 8; $rows = 2; $cw = $p.w / $cols; $ch = $p.h / $rows
  $cells = @(); $maxH = 0; $maxW = 0
  for ($r = 0; $r -lt $rows; $r++) {
    for ($col = 0; $col -lt $cols; $col++) {
      $b = BBox $p ([int]($col * $cw)) ([int]($r * $ch)) ([int](($col + 1) * $cw) - 1) ([int](($r + 1) * $ch) - 1)
      if (-not $b.found) { continue }
      if ($b.bh -gt $maxH) { $maxH = $b.bh }; if ($b.bw -gt $maxW) { $maxW = $b.bw }
      $cells += [pscustomobject]@{ row = $r; col = $col; minX = $b.minX; minY = $b.minY; bw = $b.bw; bh = $b.bh }
    }
  }
  $scale = [math]::Min(($FH - $PAD) / $maxH, $FW / $maxW)
  foreach ($rk in @(@(0, $frontName), @(1, $backName))) {
    $c = NewCanvas ($FW * $cols) $FH
    foreach ($cell in ($cells | Where-Object { $_.row -eq $rk[0] })) {
      $dw = [math]::Max(1, [int][math]::Round($cell.bw * $scale)); $dh = [math]::Max(1, [int][math]::Round($cell.bh * $scale))
      $dx = ($cell.col * $FW) + [int][math]::Floor(($FW - $dw) / 2); $dy = $FH - $dh
      $c.g.DrawImage($bmp, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle $cell.minX, $cell.minY, $cell.bw, $cell.bh), [System.Drawing.GraphicsUnit]::Pixel)
    }
    $c.g.Dispose(); SaveBoth $c.bmp $rk[1]; $c.bmp.Dispose()
  }
  $bmp.Dispose()
}

# ---- Individually-cropped frame files -> two sheets, one uniform scale across
# *all* frames (so front and back match) + shared baseline. ----
function DeriveFrames($dir, $frontNums, $backNums, $frontName, $backName) {
  $all = @{}; $maxH = 0; $maxW = 0
  foreach ($n in ($frontNums + $backNums)) {
    $bmp = LoadArgb (Join-Path $dir "$n.png")
    $p = GetBuf $bmp $false
    $b = BBox $p 0 0 ($p.w - 1) ($p.h - 1)
    if ($b.bh -gt $maxH) { $maxH = $b.bh }; if ($b.bw -gt $maxW) { $maxW = $b.bw }
    $all[$n] = [pscustomobject]@{ bmp = $bmp; minX = $b.minX; minY = $b.minY; bw = $b.bw; bh = $b.bh }
  }
  $scale = [math]::Min(($FH - $PAD) / $maxH, $FW / $maxW)
  foreach ($pair in @(@($frontNums, $frontName), @($backNums, $backName))) {
    $nums = $pair[0]; $c = NewCanvas ($FW * $nums.Count) $FH
    for ($i = 0; $i -lt $nums.Count; $i++) {
      $f = $all[$nums[$i]]
      $dw = [math]::Max(1, [int][math]::Round($f.bw * $scale)); $dh = [math]::Max(1, [int][math]::Round($f.bh * $scale))
      $dx = ($i * $FW) + [int][math]::Floor(($FW - $dw) / 2); $dy = $FH - $dh
      $c.g.DrawImage($f.bmp, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle $f.minX, $f.minY, $f.bw, $f.bh), [System.Drawing.GraphicsUnit]::Pixel)
    }
    $c.g.Dispose(); SaveBoth $c.bmp $pair[1]; $c.bmp.Dispose()
  }
  $all.Values | ForEach-Object { $_.bmp.Dispose() }
}

# ---- A cols x rows grid -> ONE sheet of cols*rows frames in reading order, each
# alpha-trimmed, one uniform scale + shared baseline, into a cw x ch cell. Empty
# cells are kept (transparent) so frame indices stay aligned with the grid. ----
function DeriveSheet($srcPath, $cols, $rows, $cw, $ch, $outName) {
  $bmp = LoadArgb $srcPath
  $p = GetBuf $bmp $false
  $scw = $p.w / $cols; $sch = $p.h / $rows
  $cells = @(); $maxH = 0; $maxW = 0
  for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
      $b = BBox $p ([int]($c * $scw)) ([int]($r * $sch)) ([int](($c + 1) * $scw) - 1) ([int](($r + 1) * $sch) - 1)
      $cells += $b
      if ($b.found) { if ($b.bh -gt $maxH) { $maxH = $b.bh }; if ($b.bw -gt $maxW) { $maxW = $b.bw } }
    }
  }
  $scale = [math]::Min(($ch - $PAD) / $maxH, $cw / $maxW)
  $n = $cells.Count
  $canvas = NewCanvas ($cw * $n) $ch
  for ($i = 0; $i -lt $n; $i++) {
    $cell = $cells[$i]
    if (-not $cell.found) { continue }
    $dw = [math]::Max(1, [int][math]::Round($cell.bw * $scale)); $dh = [math]::Max(1, [int][math]::Round($cell.bh * $scale))
    $dx = ($i * $cw) + [int][math]::Floor(($cw - $dw) / 2); $dy = $ch - $dh
    $canvas.g.DrawImage($bmp, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle $cell.minX, $cell.minY, $cell.bw, $cell.bh), [System.Drawing.GraphicsUnit]::Pixel)
  }
  $canvas.g.Dispose(); SaveBoth $canvas.bmp $outName; $canvas.bmp.Dispose(); $bmp.Dispose()
}

# ---- Per-direction strip files (each a single row of $fpr frames) -> one sheet
# in the given order, one uniform scale + shared baseline across all frames. ----
function DeriveStrips($dir, $order, $fpr, $cw, $ch, $outName) {
  $strips = @(); $maxH = 0; $maxW = 0
  foreach ($name in $order) {
    $bmp = LoadArgb (Join-Path $dir "$name.png")
    $p = GetBuf $bmp $false
    $sw = $p.w / $fpr
    $frames = @()
    for ($f = 0; $f -lt $fpr; $f++) {
      $b = BBox $p ([int]($f * $sw)) 0 ([int](($f + 1) * $sw) - 1) ($p.h - 1)
      $frames += $b
      if ($b.found) { if ($b.bh -gt $maxH) { $maxH = $b.bh }; if ($b.bw -gt $maxW) { $maxW = $b.bw } }
    }
    $strips += [pscustomobject]@{ bmp = $bmp; frames = $frames }
  }
  $scale = [math]::Min(($ch - $PAD) / $maxH, $cw / $maxW)
  $total = $order.Count * $fpr
  $canvas = NewCanvas ($cw * $total) $ch
  $i = 0
  foreach ($strip in $strips) {
    foreach ($cell in $strip.frames) {
      if ($cell.found) {
        $dw = [math]::Max(1, [int][math]::Round($cell.bw * $scale)); $dh = [math]::Max(1, [int][math]::Round($cell.bh * $scale))
        $dx = ($i * $cw) + [int][math]::Floor(($cw - $dw) / 2); $dy = $ch - $dh
        $canvas.g.DrawImage($strip.bmp, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle $cell.minX, $cell.minY, $cell.bw, $cell.bh), [System.Drawing.GraphicsUnit]::Pixel)
      }
      $i++
    }
  }
  $canvas.g.Dispose(); SaveBoth $canvas.bmp $outName; $canvas.bmp.Dispose()
  $strips | ForEach-Object { $_.bmp.Dispose() }
}

Write-Host "Deriving custom assets ->"
$chr = Join-Path $cafe "characters_"
$fur = Join-Path $cafe "furniture_"
$dec = Join-Path $cafe "decor_props_"
$me  = Join-Path $cafe "me"

# Combined display-case + counter (one piece, transparent bg): alpha-trim only.
if (NeedsBuild "full_counter" @("$fur\fullCounter.png")) {
  DeriveProp "$fur\fullCounter.png" "full_counter" $false $false 0 0
}
# Entry-way runner rug (transparent bg): alpha-trim only.
if (NeedsBuild "green_rug" @("$dec\greenRug.png")) {
  DeriveProp "$dec\greenRug.png" "green_rug" $false $false 0 0
}
# Hank (customers): 8x2 directional grid -> front/back walk sheets.
if ((NeedsBuild "hank_front" @("$chr\Hank.png")) -or (NeedsBuild "hank_back" @("$chr\Hank.png"))) {
  DeriveGrid "$chr\Hank.png" "hank_front" "hank_back"
}
# Hank seated NPCs (white bg): white-key + fit a 40x48 cell.
if (NeedsBuild "hank_seated_left" @("$chr\HankLeftSeated.png")) {
  DeriveProp "$chr\HankLeftSeated.png" "hank_seated_left" $true $true 40 48
}
if (NeedsBuild "hank_seated_right" @("$chr\HankRightSeated.png")) {
  DeriveProp "$chr\HankRightSeated.png" "hank_seated_right" $true $true 40 48
}
# Player ("me"): 14 individually-cropped directional poses -> front (1-7) / back (8-14).
$meSrcs = (1..14 | ForEach-Object { "$me\$_.png" })
if ((NeedsBuild "player_front" $meSrcs) -or (NeedsBuild "player_back" $meSrcs)) {
  DeriveFrames $me @(1, 2, 3, 4, 5, 6, 7) @(8, 9, 10, 11, 12, 13, 14) "player_front" "player_back"
}
# Cat: per-direction strip files in cat/ (each a 4-frame row) -> one 32-frame
# sheet ordered N,NW,W,SW,S,SE,E,NE so rows map to the scene's direction anims.
$catDir = Join-Path $chr "cat"
$catOrder = @("N", "NW", "W", "SW", "S", "SE", "E", "NE")
$catSrcs = ($catOrder | ForEach-Object { Join-Path $catDir "$_.png" })
if (NeedsBuild "cat_dirs" $catSrcs) {
  DeriveStrips $catDir $catOrder 4 64 48 "cat_dirs"
}
# Cat pounce: 5x5 = 25 frames (wider cell for the leap).
if (NeedsBuild "cat_pounce" @("$chr\catPounce.png")) {
  DeriveSheet "$chr\catPounce.png" 5 5 96 48 "cat_pounce"
}

Write-Host "Done."
