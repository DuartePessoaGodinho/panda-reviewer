Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
$pngOut = Join-Path $assets 'icon.png'
$icoOut = Join-Path $assets 'icon.ico'
$sizes = @(16, 24, 32, 48, 64, 128, 256)

function New-Path {
  param([scriptblock] $Build)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  & $Build $path
  return $path
}

function Add-RoundedRect {
  param(
    [System.Drawing.Drawing2D.GraphicsPath] $Path,
    [float] $X,
    [float] $Y,
    [float] $W,
    [float] $H,
    [float] $R
  )

  $d = $R * 2
  $Path.AddArc($X, $Y, $d, $d, 180, 90)
  $Path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $Path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $Path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $Path.CloseFigure()
}

function Add-EllipsePath {
  param(
    [System.Drawing.Drawing2D.GraphicsPath] $Path,
    [float] $Cx,
    [float] $Cy,
    [float] $Rx,
    [float] $Ry,
    [float] $Angle
  )

  $matrix = New-Object System.Drawing.Drawing2D.Matrix
  $matrix.RotateAt($Angle, [System.Drawing.PointF]::new($Cx, $Cy))
  $Path.AddEllipse($Cx - $Rx, $Cy - $Ry, $Rx * 2, $Ry * 2)
  $Path.Transform($matrix)
  $matrix.Dispose()
}

function New-PandaBitmap {
  param([int] $Size)

  $scale = $Size / 1024.0
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.ScaleTransform($scale, $scale)

  $bg = New-Path { param($p) Add-RoundedRect $p 0 0 1024 1024 232 }
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new(168, 120),
    [System.Drawing.PointF]::new(856, 904),
    [System.Drawing.Color]::FromArgb(255, 159, 46),
    [System.Drawing.Color]::FromArgb(226, 67, 41)
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(255, 159, 46),
    [System.Drawing.Color]::FromArgb(252, 109, 38),
    [System.Drawing.Color]::FromArgb(226, 67, 41)
  )
  $blend.Positions = @(0.0, 0.52, 1.0)
  $bgBrush.InterpolationColors = $blend
  $g.FillPath($bgBrush, $bg)

  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(46, 100, 28, 18))
  $shadow = New-Path {
    param($p)
    $p.AddBezier(210, 703, 278, 824, 386, 877, 512, 877)
    $p.AddBezier(512, 877, 638, 877, 746, 824, 814, 703)
    $p.AddBezier(814, 703, 734, 740, 610, 752, 512, 752)
    $p.AddBezier(512, 752, 414, 752, 290, 740, 210, 703)
    $p.CloseFigure()
  }
  $g.FillPath($shadowBrush, $shadow)

  $black = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(17, 24, 39))
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 250, 252))
  $muzzle = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255))
  $highlight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 230, 242))
  $soft = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(32, 17, 24, 39), 24)
  $soft.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $soft.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $g.FillEllipse($black, 172, 203, 268, 268)
  $g.FillEllipse($black, 584, 203, 268, 268)

  $face = New-Path {
    param($p)
    $p.AddBezier(802, 553, 802, 743, 672, 857, 512, 857)
    $p.AddBezier(512, 857, 352, 857, 222, 743, 222, 553)
    $p.AddBezier(222, 553, 222, 380, 341, 255, 512, 255)
    $p.AddBezier(512, 255, 683, 255, 802, 380, 802, 553)
    $p.CloseFigure()
  }
  $g.FillPath($white, $face)

  $muzzlePath = New-Path {
    param($p)
    Add-EllipsePath $p 512 663 205 162 0
  }
  $g.FillPath($muzzle, $muzzlePath)

  $leftPatch = New-Path { param($p) Add-EllipsePath $p 397 526 101 122 24 }
  $rightPatch = New-Path { param($p) Add-EllipsePath $p 627 526 101 122 -24 }
  $g.FillPath($black, $leftPatch)
  $g.FillPath($black, $rightPatch)

  $g.FillEllipse($muzzle, 383, 499, 58, 58)
  $g.FillEllipse($muzzle, 583, 499, 58, 58)
  $g.FillEllipse($highlight, 413, 506, 20, 20)
  $g.FillEllipse($highlight, 591, 506, 20, 20)

  $nose = New-Path {
    param($p)
    Add-EllipsePath $p 512 636 67 48 0
  }
  $g.FillPath($black, $nose)

  $mouthPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(17, 24, 39), 24)
  $mouthPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mouthPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($mouthPen, 512, 673, 512, 709)
  $g.DrawBezier($mouthPen, 447, 725, 478, 754, 546, 754, 577, 725)

  $g.DrawBezier($soft, 346, 414, 389, 386, 442, 379, 489, 402)
  $g.DrawBezier($soft, 535, 402, 582, 379, 635, 386, 678, 414)

  foreach ($item in @($bg, $shadow, $face, $muzzlePath, $leftPatch, $rightPatch, $nose)) { $item.Dispose() }
  foreach ($item in @($bgBrush, $shadowBrush, $black, $white, $muzzle, $highlight, $soft, $mouthPen, $g)) { $item.Dispose() }

  return $bmp
}

function Get-PngBytes {
  param([System.Drawing.Bitmap] $Bitmap)
  $stream = New-Object System.IO.MemoryStream
  $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $stream.ToArray()
  $stream.Dispose()
  return $bytes
}

$large = New-PandaBitmap 1024
$large.Save($pngOut, [System.Drawing.Imaging.ImageFormat]::Png)
$large.Dispose()

$pngs = @()
foreach ($size in $sizes) {
  $bmp = New-PandaBitmap $size
  $pngs += [pscustomobject]@{ Size = $size; Bytes = Get-PngBytes $bmp }
  $bmp.Dispose()
}

$header = New-Object byte[] 6
[BitConverter]::GetBytes([uint16]0).CopyTo($header, 0)
[BitConverter]::GetBytes([uint16]1).CopyTo($header, 2)
[BitConverter]::GetBytes([uint16]$pngs.Count).CopyTo($header, 4)

$offset = 6 + ($pngs.Count * 16)
$entries = New-Object System.Collections.Generic.List[byte[]]
foreach ($png in $pngs) {
  $entry = New-Object byte[] 16
  $entry[0] = if ($png.Size -eq 256) { 0 } else { [byte]$png.Size }
  $entry[1] = if ($png.Size -eq 256) { 0 } else { [byte]$png.Size }
  $entry[2] = 0
  $entry[3] = 0
  [BitConverter]::GetBytes([uint16]1).CopyTo($entry, 4)
  [BitConverter]::GetBytes([uint16]32).CopyTo($entry, 6)
  [BitConverter]::GetBytes([uint32]$png.Bytes.Length).CopyTo($entry, 8)
  [BitConverter]::GetBytes([uint32]$offset).CopyTo($entry, 12)
  $entries.Add($entry)
  $offset += $png.Bytes.Length
}

$out = New-Object System.IO.MemoryStream
$out.Write($header, 0, $header.Length)
foreach ($entry in $entries) { $out.Write($entry, 0, $entry.Length) }
foreach ($png in $pngs) { $out.Write($png.Bytes, 0, $png.Bytes.Length) }
[System.IO.File]::WriteAllBytes($icoOut, $out.ToArray())
$out.Dispose()

Write-Host "Wrote assets/icon.png"
Write-Host "Wrote assets/icon.ico"
