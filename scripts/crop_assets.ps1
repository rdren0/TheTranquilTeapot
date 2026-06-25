# Regenerate derived game tiles from the Maygetsu "Cozy Cafe Interior" pack.
#
# The pack sheets have multi-tile objects and non-32-divisible heights, so we
# crop exactly the pieces the game needs into public/assets/cafe/derived/.
# Re-run this if you re-download or update the pack.
#
#   powershell -File scripts/crop_assets.ps1
#
# The raw pack + derived crops are gitignored (licensed, not redistributable).

Add-Type -AssemblyName System.Drawing
$base = Join-Path $PSScriptRoot "..\public\assets\cafe"
$envP = "$base\tiles_environment_\cozy_cafe_environment.png"
$furP = "$base\furniture_\cozy_cafe_furniture.png"
$decP = "$base\decor_props_\cozy_cafe_decor_props.png"
$chrP = "$base\characters_\cozy_cafe_characters.png"
$out  = "$base\derived"
New-Item -ItemType Directory -Force $out | Out-Null
$imgs = @{
  env = [System.Drawing.Image]::FromFile($envP)
  fur = [System.Drawing.Image]::FromFile($furP)
  dec = [System.Drawing.Image]::FromFile($decP)
  chr = [System.Drawing.Image]::FromFile($chrP)
}
function Crop($srcKey, $x, $y, $w, $h, $name) {
  $src = $imgs[$srcKey]
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), (New-Object System.Drawing.Rectangle($x, $y, $w, $h)), [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save("$out\$name.png"); $g.Dispose(); $bmp.Dispose()
}
# Tiles (32x32)
Crop env 224 1056 32 32 "floor_brick"
Crop env 288 1056 32 32 "floor_plank"
Crop env 32 1056 32 32 "floor_tile"
Crop env 64 32 32 32 "wall_top"
Crop env 64 64 32 32 "wall_fill"
# Furniture
Crop fur 26 34 44 62 "table_round"
Crop fur 32 150 32 44 "chair_front"
Crop fur 32 182 32 44 "chair_back"
Crop fur 192 150 32 44 "chair_side"
Crop fur 32 288 32 66 "counter"
Crop fur 448 384 96 66 "display_case"
Crop fur 192 416 32 64 "shelf_tall"
# Decor
Crop dec 28 34 40 62 "plant_tree"
Crop dec 32 98 32 60 "plant_hanging"
Crop dec 320 162 32 62 "pendant_light"
Crop dec 320 226 64 46 "wall_shelf"
Crop dec 32 160 64 64 "menu_board"
Crop dec 96 160 36 64 "aframe_sign"
Crop dec 32 288 28 28 "teacup"
# Window + door
Crop env 28 1118 40 58 "window"
Crop env 60 1182 44 94 "door"
# Characters: 4 down-walk frames each -> 128x48 sheet (frameWidth 32, frameHeight 48)
function CharSheet($xs, $y, $name) {
  $bmp = New-Object System.Drawing.Bitmap(128, 48)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  for ($i = 0; $i -lt 4; $i++) {
    $g.DrawImage($imgs.chr, (New-Object System.Drawing.Rectangle(($i * 32), 0, 32, 48)), (New-Object System.Drawing.Rectangle($xs[$i], $y, 32, 48)), [System.Drawing.GraphicsUnit]::Pixel)
  }
  $bmp.Save("$out\$name.png"); $g.Dispose(); $bmp.Dispose()
}
CharSheet @(192, 224, 256, 288) 96 "player"   # brown-haired barista
CharSheet @(32, 64, 96, 128)   32 "cust0"     # blonde bun
CharSheet @(192, 224, 256, 288) 32 "cust1"    # pink bun
CharSheet @(352, 384, 416, 448) 32 "cust2"    # orange apron
CharSheet @(32, 64, 96, 128)   96 "cust3"     # spiky red
CharSheet @(352, 384, 416, 448) 96 "cust4"    # blonde ponytail
$imgs.Values | ForEach-Object { $_.Dispose() }
Write-Host ("Wrote derived assets to " + $out)
