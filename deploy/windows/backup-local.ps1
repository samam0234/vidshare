<#
.SYNOPSIS
  로컬 vidshare DB 를 pg_dump(커스텀 포맷)로 D:\vidshare-data\backups\local 에 백업하고 오래된 것은 지운다.

.DESCRIPTION
  비밀번호는 %APPDATA%\postgresql\pgpass.conf 에 두는 것을 권한다(작업 스케줄러에서 묻지 않게):
    localhost:5432:vidshare:vidshare:<비밀번호>

  -Register 를 주면 매일 03:30 에 이 스크립트를 실행하는 작업 스케줄러 작업을 만든다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\windows\backup-local.ps1
  powershell -ExecutionPolicy Bypass -File deploy\windows\backup-local.ps1 -Register
#>
param(
  [string]$PgBin = "D:\PostgreSQL\16\bin",
  [string]$DataRoot = "D:\vidshare-data",
  [string]$Database = "vidshare",
  [string]$User = "vidshare",
  [int]$KeepDays = 14,
  [switch]$Register
)

$ErrorActionPreference = "Stop"

if ($Register) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $trigger = New-ScheduledTaskTrigger -Daily -At "03:30"
  Register-ScheduledTask -TaskName "VidShare 로컬 DB 백업" -Action $action -Trigger $trigger `
    -Description "pg_dump vidshare -> $DataRoot\backups\local" -Force | Out-Null
  Write-Host "작업 스케줄러에 등록했습니다: 매일 03:30"
  return
}

$pgDump = Join-Path $PgBin "pg_dump.exe"
$outDir = Join-Path $DataRoot "backups\local"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$out = Join-Path $outDir "$Database-$stamp.dump"
& $pgDump -h localhost -U $User -d $Database -Fc -f $out
if ($LASTEXITCODE -ne 0) { throw "pg_dump 실패 (종료 코드 $LASTEXITCODE)" }
Write-Host "백업: $out ($([math]::Round((Get-Item $out).Length / 1KB)) KB)"

Get-ChildItem -Path $outDir -Filter "$Database-*.dump" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
  ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "삭제(보관 $KeepDays 일 초과): $($_.Name)" }
