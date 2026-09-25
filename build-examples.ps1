$ErrorActionPreference = 'Continue'
$base = 'E:\Projects\cortexi'
$log = "$base\examples-build.log"
function W($m) { Add-Content -Path $log -Value $m }
Set-Content -Path $log -Value 'examples build start'
$pub = "$base\web\public\examples"
New-Item -ItemType Directory -Force $pub | Out-Null

function New-Sb($title, $aspect, $scenes) {
  @{
    title = $title; aspect = $aspect; fps = 30
    style   = @{ primaryColor = '#7C3AED'; backgroundColor = '#0A0A0E'; textColor = '#FFFFFF'; font = 'Inter' }
    voice   = @{ engine = 'edge-tts'; voice = 'en-US-AriaNeural' }
    captions = $true
    scenes  = $scenes
  } | ConvertTo-Json -Depth 12
}

$examples = @(
  @{
    file = 'aurora-coffee'
    sb   = @{
      title = 'Aurora Coffee — Weekly Fresh Beans'; aspect = '16:9'; fps = 30
      style = @{ primaryColor = '#7C3AED'; backgroundColor = '#0A0A0E'; textColor = '#FFFFFF'; font = 'Inter' }
      voice = @{ engine = 'edge-tts'; voice = 'en-US-AriaNeural' }
      captions = $true
      scenes = @(
        @{ id = 's1'; template = 'title-card'; headline = 'Aurora Coffee Club'; body = 'Freshly roasted beans, delivered every single week.'; animation = 'zoom'; durationSec = 4 },
        @{ id = 's2'; template = 'feature'; headline = 'Roasted to Order'; body = 'Every bag ships within twenty four hours of roasting.'; animation = 'fade-up'; durationSec = 4 },
        @{ id = 's3'; template = 'feature'; headline = 'Yours, Your Way'; body = 'Pick your roast, your grind and your rhythm. Pause anytime.'; animation = 'slide-left'; durationSec = 4 },
        @{ id = 's4'; template = 'outro'; headline = 'Start Your Ritual'; body = 'Join the club today and taste the difference freshness makes.'; animation = 'fade-up'; durationSec = 4 }
      )
    }
  },
  @{
    file = 'novafit-app'
    sb   = @{
      title = 'NovaFit — Your Pocket Coach'; aspect = '16:9'; fps = 30
      style = @{ primaryColor = '#F59E0B'; backgroundColor = '#14141B'; textColor = '#F4F4F6'; font = 'Inter' }
      voice = @{ engine = 'edge-tts'; voice = 'en-US-GuyNeural' }
      captions = $true
      scenes = @(
        @{ id = 's1'; template = 'title-card'; headline = 'Meet NovaFit'; body = 'The pocket coach that adapts to your day.'; animation = 'fade-up'; durationSec = 4 },
        @{ id = 's2'; template = 'feature'; headline = 'Smart Plans'; body = 'Workouts that reshape themselves around your schedule.'; animation = 'zoom'; durationSec = 4 },
        @{ id = 's3'; template = 'feature'; headline = 'Real Progress'; body = 'Clear charts show every rep, every week, every win.'; animation = 'slide-left'; durationSec = 4 },
        @{ id = 's4'; template = 'outro'; headline = 'Train Smarter'; body = 'Download NovaFit and move today.'; animation = 'zoom'; durationSec = 4 }
      )
    }
  },
  @{
    file = 'bytebite-reel'
    sb   = @{
      title = 'ByteBite — Snack Smarter'; aspect = '9:16'; fps = 30
      style = @{ primaryColor = '#10B981'; backgroundColor = '#0A0A0E'; textColor = '#FFFFFF'; font = 'Inter' }
      voice = @{ engine = 'edge-tts'; voice = 'en-US-JennyNeural' }
      captions = $true
      scenes = @(
        @{ id = 's1'; template = 'title-card'; headline = 'Snack Smarter'; body = 'ByteBite fuels your day the honest way.'; animation = 'zoom'; durationSec = 4 },
        @{ id = 's2'; template = 'feature'; headline = 'Real Ingredients'; body = 'No fillers. No guilt. Just food that works.'; animation = 'fade-up'; durationSec = 4 },
        @{ id = 's3'; template = 'outro'; headline = 'Grab a Box'; body = 'Your first box ships free. Tap in.'; animation = 'fade-up'; durationSec = 4 }
      )
    }
  }
)

foreach ($ex in $examples) {
  W ('=== ' + $ex.file + ' ===')
  $sb = $ex.sb | ConvertTo-Json -Depth 12
  W 'voice...'
  try {
    $voiced = Invoke-RestMethod -Uri http://localhost:8787/api/voice -Method Post -ContentType 'application/json' -Body (@{ storyboard = $sb } | ConvertTo-Json -Depth 12) -TimeoutSec 180
    W ('voice ok: ' + (($voiced.scenes | ForEach-Object { $_.durationSec }) -join ','))
  } catch {
    W ('voice FAILED: ' + $_.Exception.Message + ' — rendering silent')
    $voiced = $sb | ConvertFrom-Json
    $voiced.scenes | ForEach-Object { $_.durationSec = 4 }
  }
  W 'render (final)...'
  try {
    $job = Invoke-RestMethod -Uri http://localhost:8787/api/render -Method Post -ContentType 'application/json' -Body (@{ storyboard = $voiced; quality = 'final' } | ConvertTo-Json -Depth 12) -TimeoutSec 30
    W ('job=' + $job.jobId)
    $deadline = (Get-Date).AddMinutes(6)
    do {
      Start-Sleep 6
      $j = Invoke-RestMethod -Uri ('http://localhost:8787/api/jobs/' + $job.jobId)
      W ('  ' + $j.status + ' ' + $j.progress + '%')
    } while ($j.status -in @('queued', 'rendering') -and (Get-Date) -lt $deadline)
    if ($j.status -eq 'done') {
      $out = "$base\assets\output\$($j.output.Split('/')[-1])"
      Copy-Item $out "$pub\$($ex.file).mp4" -Force
      cmd /c "ffmpeg -y -ss 1 -i $pub\$($ex.file).mp4 -frames:v 1 -q:v 3 $pub\$($ex.file).jpg > NUL 2>&1"
      W ('DONE ' + $ex.file + ' size=' + (Get-Item "$pub\$($ex.file).mp4").Length)
    } else { W ('FAILED: ' + ($j | ConvertTo-Json -Compress)) }
  } catch { W ('render exception: ' + $_.Exception.Message) }
}
W 'examples build complete'
