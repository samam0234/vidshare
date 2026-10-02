/**
 * 계정 비밀번호 재설정 CLI (관리자 포함).
 *
 *   npm run reset-password -- <handle>              # 터미널에서 새 비밀번호를 두 번 입력(화면에 안 보임)
 *   npm run reset-password -- <handle> --generate   # 무작위 비밀번호를 만들어 한 번만 출력
 *   echo "<새 비밀번호>" | npm run reset-password -- <handle> --stdin
 *
 * bcrypt 해시는 단방향이라 원래 비밀번호를 "찾는" 방법은 없다. 서버에 접속할 수 있는 사람(=운영자)이
 * 새 비밀번호로 바꾸는 것이 유일한 복구 경로다. 웹에 "비밀번호 찾기"를 두지 않는 이유:
 * 이메일 등 본인 확인 수단이 없어 아무나 관리자 비밀번호를 바꿀 수 있게 된다.
 *
 * 재설정하면 그 계정의 모든 세션이 끊긴다(이미 로그인해 있던 브라우저 포함).
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { closeDb, initDb } from "../src/db/client";
import { findAccount, normalizeHandle, setAccountPassword } from "../src/auth/accounts";

// routes/auth.ts 의 회원가입 검증과 같은 기준.
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72; // bcrypt 는 72바이트 이후를 무시한다

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

/** 영문 대소문자·숫자 16자. 헷갈리는 0/O/1/l/I 는 뺀다. */
function generatePassword(length = 16) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length * 2);
  let out = "";
  for (const b of bytes) {
    if (b >= 256 - (256 % alphabet.length)) continue; // 모듈로 편향 제거
    out += alphabet[b % alphabet.length];
    if (out.length === length) break;
  }
  return out;
}

/** 입력이 화면에 보이지 않는 프롬프트. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const argv = process.argv.slice(2);
  const generate = argv.includes("--generate");
  const fromStdin = argv.includes("--stdin");
  const [handleRaw] = argv.filter((a) => !a.startsWith("--"));
  if (!handleRaw) {
    fail("사용법: npm run reset-password -- <handle> [--generate | --stdin]");
  }

  let password: string;
  if (generate) {
    password = generatePassword();
  } else if (fromStdin) {
    password = await readStdin();
  } else if (process.stdin.isTTY) {
    password = await promptHidden("새 비밀번호: ");
    const again = await promptHidden("한 번 더: ");
    if (password !== again) fail("두 입력이 다릅니다.");
  } else {
    fail("터미널이 아닙니다. --generate 또는 --stdin 을 쓰세요.");
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fail(`비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.`);
  }

  await initDb();
  try {
    const account = await findAccount(normalizeHandle(handleRaw));
    if (!account) fail(`@${normalizeHandle(handleRaw)} 계정이 없습니다. (npm run list-admins 로 관리자 목록 확인)`);

    const result = await setAccountPassword(account.id, password);
    if (!result) fail("재설정에 실패했습니다.");

    console.log(`✔ @${account.handle} (${account.role}) 비밀번호를 재설정했습니다.`);
    console.log(`  로그인 세션 ${result.revokedSessions}개를 끊었습니다.`);
    if (account.suspended) console.log("  ⚠ 이 계정은 정지 상태입니다 — 로그인하려면 정지를 풀어야 합니다.");
    if (generate) {
      console.log("");
      console.log(`  새 비밀번호: ${password}`);
      console.log("  (이 화면에서 한 번만 보여 줍니다. 안전한 곳에 보관하세요.)");
    }
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
