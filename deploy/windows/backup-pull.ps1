<#
.SYNOPSIS
  Oracle VM 의 최신 DB 백업과 업로드 파일을 내 PC D:\vidshare-data\backups\prod 로 가져온다.

.DESCRIPTION
  - Windows 기본 OpenSSH(scp/ssh)를 쓴다. ~/.ssh/config 에 VM 별칭을 만들어 두면 편하다:
      Host vidshare-vm
        HostName <예약 공인 IP>
        User ubuntu
        IdentityFile ~/.ssh/oci_vidshare
  - DB: VM 의 /mnt/vidshare-data/backups 에서 가장 최근 .dump 한 개를 받는다.
  - 업로드: /mnt/vidshare-data/uploads 를 통째로 받는다(rsync 가 없어 매번 전체 복사).
  - -Register 를 주면 매일 04:30 에 실행하는 작업 스케줄러 작업을 만든다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\windows\backup-pull.ps1 -SshHost vidshare-vm
#>
param(
  [Parameter(Mandatory = $true)][string]$SshHost,
  [string]$DataRoot = "D:\vidshare-data",
  [string]$RemoteRoot = "/mnt/vidshare-data",
  [int]$KeepDays = 30,
  [switch]$SkipUploads,
  [switch]$Register
)

$ErrorActionPreference = "Stop"

if ($Register) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -SshHost $SshHost"
  $trigger = New-ScheduledTaskTrigger -Daily -At "04:30"
  Register-ScheduledTask -TaskName "VidShare 운영 백업 가져오기" -Action $action -Trigger $trigger `
    -Description "$SshHost -> $DataRoot\backups\prod" -Force | Out-Null
  Write-Host "작업 스케줄러에 등록했습니다: 매일 04:30"
  return
}

$dbDir = Join-Path $DataRoot "backups\prod\db"
$upDir = Join-Path $DataRoot "backups\prod\uploads"
New-Item -ItemType Directory -Force -Path $dbDir, $upDir | Out-Null

$listing = ssh -o BatchMode=yes $SshHost "ls -1t $RemoteRoot/backups/*.dump 2>/dev/null | head -n 1"
if ($LASTEXITCODE -ne 0) { throw "ssh $SshHost 접속 실패 (종료 코드 $LASTEXITCODE). ~/.ssh/config 와 키 권한을 확인하세요." }
$latest = "$listing".Trim()
if (-not $latest) { throw "VM 에 백업 파일이 없습니다: $RemoteRoot/backups" }
$name = Split-Path $latest -Leaf
$local = Join-Path $dbDir $name
if (Test-Path $local) {
  Write-Host "이미 받은 백업입니다: $name"
} else {
  scp "${SshHost}:$latest" $local
  if ($LASTEXITCODE -ne 0) { throw "scp 실패 (DB 백업)" }
  Write-Host "DB 백업: $local"
}

if (-not $SkipUploads) {
  scp -r "${SshHost}:$RemoteRoot/uploads/." $upDir
  if ($LASTEXITCODE -ne 0) { throw "scp 실패 (uploads)" }
  Write-Host "업로드 사본: $upDir"
}

Get-ChildItem -Path $dbDir -Filter "*.dump" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
  ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "삭제(보관 $KeepDays 일 초과): $($_.Name)" }
