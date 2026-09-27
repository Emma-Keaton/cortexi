<#
.SYNOPSIS
  Regenerates the showcase gallery in web/public/examples from examples/concepts.json.

.DESCRIPTION
  Each concept is expanded into a full storyboard (gradients, typography, motion,
  layout), sent to /api/voice for a real neural voiceover with word timings, then
  rendered by the local Remotion pipeline. A poster frame is extracted from each MP4.

  Server rendering must be enabled for this script:
      $env:CORTEXI_ENABLE_SERVER_RENDER = '1'
  (the hosted Render deployment leaves it off - users render in their browser).

.EXAMPLE
  $env:CORTEXI_ENABLE_SERVER_RENDER='1'; pnpm dev; ./build-examples.ps1
#>
$ErrorActionPreference = 'Continue'
$base    = Split-Path -Parent $MyInvocation.MyCommand.Path
$api     = 'http://localhost:8787'
$pub     = Join-Path $base 'web\public\examples'
$conceptsPath = Join-Path $base 'examples\concepts.json'
$log     = Join-Path $base 'examples-build.log'

New-Item -ItemType Directory -Force $pub | Out-Null
Set-Content -Path $log -Value ("examples build start " + (Get-Date -Format s))
function W($m) { Add-Content -Path $log -Value $m; Write-Host $m }

# Template -> motion entrance. Keeps the gallery visually varied.
$entrance = @{
  'title-card'         = 'fade-up'
  'editorial-hero'     = 'slide-left'
  'feature'            = 'fade-up'
  'split-feature'      = 'slide-left'
  'product-spotlight'  = 'zoom'
  'full-bleed'         = 'mask-reveal'
  'typography-statement' = 'fade-up'
  'logo-interstitial'  = 'zoom'
  'call-to-action'     = 'slide-right'
  'outro'              = 'fade-up'
}

# Alternating background treatments so consecutive scenes feel designed, not repetitive.
$bgModes = @('gradient', 'color', 'split', 'color')

$concepts = (Get-Content $conceptsPath -Raw -Encoding utf8 | ConvertFrom-Json).concepts
W ("loaded $($concepts.Count) concepts")

$i = 0
foreach ($c in $concepts) {
  $i++
  W ("=== [$i/$($concepts.Count)] $($c.slug) - $($c.brand) ===")

  $scenes = @()
  $n = 0
  foreach ($s in $c.scenes) {
    $n++
    $bgType = $bgModes[($i + $n) % $bgModes.Count]
    $isLast = ($n -eq $c.scenes.Count)
    $scenes += @{
      id        = "s$n"
      template  = $s.template
      eyebrow   = $s.eyebrow
      headline  = $s.headline
      body      = $s.body
      ctaLabel  = $s.ctaLabel
      animation = $entrance[$s.template]
      motion    = @{ entrance = $entrance[$s.template]; intensity = 0.5 }
      background= @{
        type           = $bgType
        secondaryColor = $c.palette.secondary
        overlayOpacity = 0.25
      }
      layout    = @{
        align     = if ($s.template -eq 'typography-statement') { 'left' } else { 'center' }
        direction = if ($s.template -eq 'editorial-hero') { 'right' } else { 'center' }
      }
      typography= @{
        font       = $null
        sizeScale  = if ($s.template -eq 'title-card') { 1.1 } else { 1 }
        weight     = 800
        tracking   = if ($s.template -eq 'typography-statement') { -1 } else { 0 }
        uppercase  = ($s.template -eq 'title-card')
      }
    }
  }

    # Zod rejects explicit nulls, so drop empty optional fields before sending.
    foreach ($sc in $scenes) {
      foreach ($k in @($sc.Keys)) {
        if ($null -eq $sc[$k]) { $sc.Remove($k) }
        elseif ($sc[$k] -is [hashtable]) {
          foreach ($ik in @($sc[$k].Keys)) { if ($null -eq $sc[$k][$ik]) { $sc[$k].Remove($ik) } }
        }
      }
    }
  $sb = @{
    title   = "$($c.brand) - $($c.tagline)"
    aspect  = $c.aspect
    fps     = 30
    style   = @{
      primaryColor    = $c.palette.primary
      backgroundColor = $c.palette.background
      textColor       = $c.palette.text
      font            = 'Inter, Arial, sans-serif'
    }
    voice   = @{ engine = $c.voice.engine; voice = $c.voice.voice }
    captions = $true
    scenes  = $scenes
  }

  # 1) Voiceover
  try {
    $voiced = Invoke-RestMethod -Uri "$api/api/voice" -Method Post -ContentType 'application/json' `
      -Body (@{ storyboard = $sb } | ConvertTo-Json -Depth 12 -Compress) -TimeoutSec 240
    W ('  voice ok: ' + (($voiced.scenes | ForEach-Object { $_.durationSec }) -join ', '))
  } catch {
    W ('  voice FAILED: ' + $_.Exception.Message)
    continue
  }

  # 2) Render
  try {
    $job = Invoke-RestMethod -Uri "$api/api/render" -Method Post -ContentType 'application/json' `
      -Body (@{ storyboard = $voiced; quality = 'final' } | ConvertTo-Json -Depth 12 -Compress) -TimeoutSec 60
    $deadline = (Get-Date).AddMinutes(10)
    do {
      Start-Sleep 5
      $j = Invoke-RestMethod -Uri "$api/api/jobs/$($job.jobId)" -TimeoutSec 30
      W "  $($j.status) $($j.progress)%"
    } while ($j.status -in @('queued', 'rendering') -and (Get-Date) -lt $deadline)

    if ($j.status -ne 'done') { W ('  RENDER FAILED: ' + ($j | ConvertTo-Json -Compress)); continue }

    $name = "$($c.slug).mp4"
    Copy-Item (Join-Path $base "assets\output\$($j.output.Split('/')[-1])") (Join-Path $pub $name) -Force
    # Poster: grab a frame from the middle so the title card is not half-faded.
    cmd /c "ffmpeg -y -ss 1.2 -i `"$pub\$name`" -frames:v 1 -q:v 3 `"$pub\$($c.slug).jpg`" > NUL 2>&1"
    W ('  DONE ' + $c.slug + ' -> ' + [math]::Round((Get-Item (Join-Path $pub $name)).Length / 1KB) + ' KB')
  } catch {
    W ('  render exception: ' + $_.Exception.Message)
  }
}

W 'examples build complete'

