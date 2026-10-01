# Oracle Cloud VM 구축 절차서

**대상**: OCI 콘솔을 처음 써 보는 사람
**결과**: `https://api.example.com/api/health` 가 `{"db":"ok"}` 로 응답
**스크립트**: [deploy/oracle/](../../deploy/oracle/) · 개요는 [deployment.md](../deployment.md) 4장

> Always Free 한도·유휴 인스턴스 회수 정책은 바뀔 수 있습니다. 만들기 전에 OCI 문서에서 현재 조건을 확인하세요.

---

## 1. 준비물

- OCI 계정 (홈 리전: 서울 `ap-seoul-1` 또는 춘천 `ap-chuncheon-1`)
- 도메인 하나 (`example.com`) — `api.` 를 VM 에, `app.` `console.` 을 Workers 에 연결
- 내 PC 의 SSH 키: `ssh-keygen -t ed25519 -f $HOME\.ssh\oci_vidshare`

## 2. 네트워크

1. **Networking → Virtual Cloud Networks → Start VCN Wizard → "Create VCN with Internet Connectivity"**
2. 만들어진 VCN → **Security Lists → Default Security List** → Ingress Rules:

   | Source | Protocol | Port | 용도 |
   |--------|----------|------|------|
   | `0.0.0.0/0` | TCP | 80 | Let's Encrypt HTTP 검증 · HTTPS 리다이렉트 |
   | `0.0.0.0/0` | TCP | 443 | API |
   | `<내 공인 IP>/32` | TCP | 22 | SSH (기본 `0.0.0.0/0` 규칙은 지운다) |

   5432(Postgres)는 **열지 않습니다.**

## 3. 인스턴스

1. **Compute → Instances → Create instance**
2. Image: **Canonical Ubuntu 24.04** (aarch64 는 A1 용)
3. Shape: **VM.Standard.A1.Flex** — 1~2 OCPU, 6~12 GB
   - "Out of capacity" 가 나면 시간대를 바꿔 다시 시도하거나 다른 AD 를 고른다.
   - 끝내 안 되면 `VM.Standard.E2.1.Micro` (RAM 1GB) 로 시작할 수 있지만 Postgres + Node 에는 빠듯하다.
4. Networking: 2장의 VCN · public subnet, **Assign a public IPv4 address** 체크
5. SSH keys: `oci_vidshare.pub` 업로드
6. Boot volume: 50 GB

## 4. 예약 공인 IP

인스턴스 → **Attached VNICs → Primary VNIC → IPv4 Addresses → Edit**
→ "Reserved public IP" → 새로 만들기. VM 을 다시 만들어도 IP 가 유지된다.

## 5. 블록 볼륨

1. **Storage → Block Volumes → Create** — 100 GB, 같은 AD
2. 인스턴스 → **Attached block volumes → Attach** — Attachment type **Paravirtualized** (iSCSI 명령이 필요 없다)
3. VM 에서 `lsblk` 로 새 장치 확인 (보통 `sdb`, 파티션 없음)

## 6. DNS

`api.example.com` **A** → 예약 IP. Cloudflare DNS 라면 **프록시 끔(DNS only)** — Caddy 가 직접 인증서를 받는다.

```powershell
nslookup api.example.com    # 예약 IP 가 나와야 다음 단계로
```

## 7. 접속과 설정 스크립트

`~/.ssh/config` (내 PC):

```
Host vidshare-vm
  HostName <예약 IP>
  User ubuntu
  IdentityFile ~/.ssh/oci_vidshare
```

```bash
ssh vidshare-vm
git clone https://github.com/samam0234/vidshare.git ~/vidshare   # 비공개 저장소면 배포 키/토큰 필요
sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb --format
sudo nano /etc/vidshare/backend.env     # GOOGLE_API_KEY / GROQ_API_KEY
```

스크립트가 물어보는 것: `vidshare` DB 비밀번호 (영문·숫자·`_-` 12자 이상).

## 8. 데이터 옮기기 → 배포

[deployment.md 5장](../deployment.md) 으로 로컬 데이터를 옮긴 뒤:

```bash
sudo bash /opt/vidshare/deploy/oracle/deploy.sh
curl https://api.example.com/api/health
```

## 9. SSH 하드닝

`/etc/ssh/sshd_config.d/90-vidshare.conf`:

```
PasswordAuthentication no
PermitRootLogin no
```

```bash
sudo systemctl reload ssh
```

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| 브라우저에서 접속 안 됨 | 보안 목록 80/443 · `sudo iptables -L INPUT -n --line-numbers` 에서 ACCEPT 80/443 이 REJECT 보다 위인지 |
| Caddy 인증서 실패 | `journalctl -u caddy -n 50` · DNS 가 IP 를 가리키는지 · 80 이 열렸는지 |
| `/api/health` 503 `db: down` | `systemctl status postgresql@16-main` · `mountpoint /mnt/vidshare-data` |
| 서비스가 안 뜸 | `journalctl -u vidshare-backend -n 100 --no-pager` · `/etc/vidshare/backend.env` 의 `DATABASE_URL` |
| 재부팅 후 DB 가 비어 보임 | 볼륨 마운트 실패 — `lsblk`, `/etc/fstab` UUID. 서비스들은 `RequiresMountsFor` 로 마운트 없이는 시작하지 않는다 |
| 로그인 후 바로 401 | 쿠키 도메인 — [deployment.md 3장](../deployment.md) |
| SSE 알림이 늦게 옴 | Caddyfile 의 `flush_interval -1` 확인 |
