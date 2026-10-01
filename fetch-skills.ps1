$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$h = @{ 'User-Agent' = 'ps'; 'Accept' = 'application/vnd.github+json' }
$targets = @{
  'data-animation-skills' = @('animated-infographic','chart-animation')
  'web-animation-skills'  = @('lottie-animation','svg-animation','micro-interaction','60fps-animation','accessible-animation')
  'motion-design-skills'  = @('animation-principles','motion-art-direction','shot-composition','color-motion','logo-animation','motion-background','remotion-video','beat-sync-editing')
  'javascript-animation-skills' = @('javascript-animation')
  'kinetic-typography-skills'   = @('kinetic-typography')
  'explainer-video-skills'      = @('diagram-animation','explainer-video')
  'ad-video-skills'             = @('ad-creative-video','launch-video')
}
$root = 'E:\Projects\cortexi\skills-src'
foreach ($repo in $targets.Keys) {
  foreach ($skill in $targets[$repo]) {
    $dir = Join-Path $root "$repo\$skill"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    try {
      $items = Invoke-RestMethod "https://api.github.com/repos/iart-ai/$repo/contents/skills/$skill" -Headers $h -TimeoutSec 25
      foreach ($it in $items) {
        if ($it.type -eq 'file' -and $it.name -like '*.md') {
          Invoke-WebRequest "https://raw.githubusercontent.com/iart-ai/$repo/main/skills/$skill/$($it.name)" -OutFile (Join-Path $dir $it.name) -Headers $h -TimeoutSec 25
        } elseif ($it.type -eq 'dir') {
          $subs = Invoke-RestMethod "https://api.github.com/repos/iart-ai/$repo/contents/skills/$skill/$($it.name)" -Headers $h -TimeoutSec 25
          New-Item -ItemType Directory -Force -Path (Join-Path $dir $it.name) | Out-Null
          foreach ($s in $subs) {
            if ($s.type -eq 'file' -and $s.name -like '*.md') {
              Invoke-WebRequest "https://raw.githubusercontent.com/iart-ai/$repo/main/skills/$skill/$($it.name)/$($s.name)" -OutFile (Join-Path $dir "$($it.name)\$($s.name)") -Headers $h -TimeoutSec 25
            }
          }
        }
      }
    } catch { Add-Content "$root\_errors.log" "$repo/$skill FAIL $($_.Exception.Message)" }
  }
}
'SKILL DOWNLOAD DONE' | Add-Content "$root\_errors.log"
