<#
.SYNOPSIS
  운영 서버의 관리자 계정 찾기 · 비밀번호 재설정 (이 PC 에서 한 줄로).

.DESCRIPTION
  ssh 로 운영 서버(vidshare-vm)에 접속해 서버의 CLI 를 실행한다.
  서버 SSH 키를 가진 사람만 쓸 수 있으므로 그것이 곧 본인 확인이다.

  -List            관리자 계정 목록 (핸들을 잊었을 때)
  -Reset <handle>  비밀번호를 무작위로 재설정하고 새 비밀번호를 이 창에 한 번만 보여 준다.
                   그 계정의 기존 로그인 세션은 모두 끊긴다.

  비밀번호는 bcrypt 해시라 원래 값을 "찾는" 방법은 없다. 재설정만 가능하다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -List
  powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -Reset whil496
#>
param(
  [switch]$List,
  [string]$Reset,
  [string]$SshHost = "vidshare-vm"
)

$ErrorActionPreference = "Stop"

if (-not $List -and -not $Reset) {
  Write-Host "사용법: admin-tools.ps1 -List   또는   admin-tools.ps1 -Reset <handle>"
  exit 1
}
# 원격 셸에 그대로 들어가므로 허용 문자를 좁힌다(관리자 핸들은 영문·숫자·._ 3~20자).
if ($Reset -and $Reset -notmatch '^@?[A-Za-z0-9._]{3,20}$') {
  throw "핸들 형식이 올바르지 않습니다: $Reset"
}

$run = "set -a; . /etc/vidshare/backend.env; set +a; cd /opt/vidshare/BackendServer &&"
if ($List) {
  $cmd = "$run npm run -s list-admins"
} else {
  $cmd = "$run npm run -s reset-password -- $($Reset.TrimStart('@')) --generate"
}

# 출력에서 DB 접속 안내 줄만 걸러 보여 준다.
ssh -o BatchMode=yes $SshHost "sudo -u vidshare -H bash -c '$cmd' 2>&1 | grep -v '^  Postgres:'"
if ($LASTEXITCODE -ne 0) { throw "실패 (종료 코드 $LASTEXITCODE)" }
