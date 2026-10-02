<#
.SYNOPSIS
  운영 서버의 Cloudflare 빠른 터널 URL 이 바뀌었으면 프론트·콘솔을 새 주소로 재배포한다.

.DESCRIPTION
  trycloudflare URL 은 서버 재부팅·터널 재시작 때마다 바뀐다. 이 스크립트는
    1) ssh 로 서버의 현재 URL(vidshare-tunnel-url)을 읽고
    2) FrontServer/.env.production 의 NEXT_PUBLIC_API_URL 과 비교해
    3) 다르면 두 앱의 .env.production 을 고치고 `npm run deploy` 한다.
  같으면 아무것도 하지 않는다. -Register 로 작업 스케줄러에 매시간 등록한다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\windows\sync-tunnel-url.ps1
  powershell -ExecutionPolicy Bypass -File deploy\windows\sync-tunnel-url.ps1 -Register
#>
param(
  [string]$SshHost = "vidshare-vm",
  [string]$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [switch]$Register
)

$ErrorActionPreference = "Stop"

if ($Register) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
    -RepetitionInterval (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName "VidShare 터널 주소 동기화" -Action $action -Trigger $trigger `
    -Description "trycloudflare URL 이 바뀌면 프론트·콘솔 재배포" -Force | Out-Null
  Write-Host "작업 스케줄러에 등록했습니다: 매시간"
  return
}

$log = Join-Path $env:TEMP "vidshare-sync-tunnel.log"
function Log($m) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"; Write-Host $line; Add-Content -Path $log -Value $line -Encoding utf8 }

$current = ssh -o BatchMode=yes -o ConnectTimeout=15 $SshHost "vidshare-tunnel-url"
if ($LASTEXITCODE -ne 0 -or -not "$current".Trim()) { Log "서버에서 터널 URL 을 읽지 못함 (종료 코드 $LASTEXITCODE)"; exit 1 }
$current = "$current".Trim()

# 비교 기준은 .env.production 이 아니라 "두 앱 배포가 모두 성공한 URL" 기록이다.
# (.env 를 고친 뒤 배포가 실패하면 다음 실행이 '변경 없음' 으로 착각하는 것을 막는다)
$stateDir = Join-Path $env:LOCALAPPDATA "vidshare"
$stateFile = Join-Path $stateDir "deployed-api-url"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$deployed = if (Test-Path $stateFile) { (Get-Content $stateFile -Raw).Trim() } else { "" }

if ($current -eq $deployed) { Log "변경 없음: $current"; exit 0 }

Log "터널 URL 변경: '$deployed' -> '$current' — 재배포 시작"
$content = "# 운영 빌드용 API 주소 (Cloudflare Tunnel). sync-tunnel-url.ps1 이 갱신. 비밀값 아님.`nNEXT_PUBLIC_API_URL=$current`n"
foreach ($app in "FrontServer", "console") {
  [IO.File]::WriteAllText((Join-Path $Repo "$app\.env.production"), $content)
  # PowerShell 5.1 은 네이티브 명령의 stderr(경고 포함)를 2>&1 로 받으면 오류로 감싸 Stop 에서 중단된다.
  # → cmd 가 출력을 파일로 보내게 하고 종료 코드만 본다.
  $out = Join-Path $env:TEMP "vidshare-deploy-$app.log"
  cmd /c "cd /d `"$(Join-Path $Repo $app)`" && npm run deploy > `"$out`" 2>&1"
  if ($LASTEXITCODE -ne 0) { Log "$app 배포 실패 (종료 코드 $LASTEXITCODE) — 로그: $out"; exit 1 }
  Log "$app 재배포 완료"
}
[IO.File]::WriteAllText($stateFile, $current)
Log "완료: $current"
