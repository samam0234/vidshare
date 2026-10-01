<#
.SYNOPSIS
  내 PC(D 드라이브)의 PostgreSQL 16 에 VidShare 전용 계정·DB 를 만들고 데이터 폴더를 준비한다.

.DESCRIPTION
  - Postgres 는 이미 D:\PostgreSQL\16 에 설치되어 있고 데이터 디렉터리도 D:\PostgreSQL\16\data 다.
    새 클러스터를 만들지 않고 그 서비스(postgresql-x64-16)에 vidshare 계정과 DB 만 추가한다.
  - D:\vidshare-data 아래에 uploads / backups / logs 폴더를 만든다.
  - 예전 SQLite 파일이 있으면 backups\sqlite-final 로 복사해 둔다(되돌리기용 원본).
  - 여러 번 실행해도 안전하다(이미 있는 계정·DB·폴더는 건드리지 않고 비밀번호만 다시 설정).

  실행 중 postgres(슈퍼유저) 비밀번호를 psql 이 한 번 묻는다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\windows\setup-postgres-d.ps1
#>
param(
  [string]$PgBin = "D:\PostgreSQL\16\bin",
  [string]$ServiceName = "postgresql-x64-16",
  [string]$DataRoot = "D:\vidshare-data",
  [string]$SuperUser = "postgres",
  [string]$AppUser = "vidshare",
  [string]$SqlitePath = (Join-Path $PSScriptRoot "..\..\BackendServer\data\vidshare.sqlite")
)

$ErrorActionPreference = "Stop"
$psql = Join-Path $PgBin "psql.exe"
if (-not (Test-Path $psql)) { throw "psql.exe 를 찾을 수 없습니다: $psql  (-PgBin 으로 지정)" }

# 1) 서비스와 데이터 디렉터리 확인
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) { throw "서비스 $ServiceName 이 없습니다. PostgreSQL 16 설치를 먼저 확인하세요." }
if ($svc.Status -ne "Running") {
  Write-Host "서비스를 시작합니다: $ServiceName"
  Start-Service -Name $ServiceName
}
$cfg = (sc.exe qc $ServiceName) -join "`n"
if ($cfg -match '-D\s+"([^"]+)"') {
  $dataDir = $Matches[1]
  Write-Host "Postgres 데이터 디렉터리: $dataDir"
  if (-not $dataDir.ToUpper().StartsWith("D:")) {
    Write-Warning "데이터 디렉터리가 D 드라이브가 아닙니다. plan.md 9장을 확인하세요."
  }
}

# 2) D:\vidshare-data 폴더
$dirs = @(
  "uploads",
  "backups\local",
  "backups\prod\db",
  "backups\prod\uploads",
  "backups\sqlite-final",
  "logs"
)
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot $d) | Out-Null
}
Write-Host "데이터 폴더 준비: $DataRoot"

# 3) 예전 SQLite 원본 보관 (있을 때만, 이미 보관본이 있으면 건너뜀)
$sqliteFinal = Join-Path $DataRoot "backups\sqlite-final"
if ((Test-Path $SqlitePath) -and -not (Test-Path (Join-Path $sqliteFinal "vidshare.sqlite"))) {
  Get-ChildItem -Path "$SqlitePath*" | Copy-Item -Destination $sqliteFinal
  Write-Host "SQLite 원본을 보관했습니다: $sqliteFinal"
}

# 4) 앱 계정 비밀번호
$secure = Read-Host -AsSecureString "vidshare 계정에 쓸 비밀번호 (새로 정함, 영문·숫자·_- 12자 이상)"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
# DATABASE_URL 에 그대로 넣으므로 URL 인코딩이 필요한 문자는 받지 않는다.
if ($appPassword -notmatch '^[A-Za-z0-9_-]{12,}$') { throw "비밀번호는 영문·숫자·_- 로 12자 이상이어야 합니다." }

# 5) 계정·DB 생성. 비밀번호는 psql 변수로 넘겨 SQL 파일에 남기지 않는다.
$sql = @"
SELECT 'CREATE ROLE $AppUser LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$AppUser')\gexec
ALTER ROLE $AppUser WITH LOGIN PASSWORD :'app_password';
SELECT 'CREATE DATABASE vidshare OWNER $AppUser ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidshare')\gexec
SELECT 'CREATE DATABASE vidshare_test OWNER $AppUser ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidshare_test')\gexec
"@
$tmp = New-TemporaryFile
try {
  Set-Content -Path $tmp -Value $sql -Encoding ascii
  & $psql -h localhost -U $SuperUser -d postgres -v ON_ERROR_STOP=1 -v "app_password=$appPassword" -f $tmp
  if ($LASTEXITCODE -ne 0) { throw "psql 실행 실패 (종료 코드 $LASTEXITCODE)" }
} finally {
  Remove-Item $tmp -Force
}

$uploads = Join-Path $DataRoot "uploads"
Write-Host ""
Write-Host "완료. BackendServer\.env 에 아래를 넣으세요:" -ForegroundColor Green
Write-Host "  DATABASE_URL=postgres://${AppUser}:<비밀번호>@localhost:5432/vidshare"
Write-Host "  DATABASE_URL_TEST=postgres://${AppUser}:<비밀번호>@localhost:5432/vidshare_test"
Write-Host "  UPLOADS_PATH=$uploads"
Write-Host ""
Write-Host "그다음 (BackendServer 폴더에서):"
Write-Host "  npm run db:import-sqlite   # 예전 SQLite 데이터 옮기기 (선택)"
Write-Host "  npm run dev"
