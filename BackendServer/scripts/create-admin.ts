/**
 * 관리자 계정 생성/승격 CLI.
 *
 *   npm run create-admin -- <handle> <password> [name] [--promote]
 *
 * 비밀번호를 소스나 시드에 남기지 않기 위해, 관리자 계정은 시드가 아니라
 * 이 스크립트로 각 환경에서 직접 만든다.
 *
 * - 핸들이 없으면: 새 계정을 만들고 role='admin' 으로 저장
 * - 이미 있고 일반 유저면: `--promote` 가 있어야 승격 (비밀번호는 건드리지 않음)
 * - 이미 관리자면: 아무것도 바꾸지 않고 안내만 출력 (멱등)
 */
import { closeDb, initDb } from "../src/db/client";
import {
  createAccount,
  findAccount,
  normalizeHandle,
  setAccountRole,
} from "../src/auth/accounts";

// routes/auth.ts 의 회원가입 검증과 같은 기준을 쓴다.
const HANDLE_RE = /^[a-z0-9._]{3,20}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const promote = argv.includes("--promote");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [handleRaw, password, nameRaw] = positional;

  if (!handleRaw || !password) {
    console.error(
      "사용법: npm run create-admin -- <handle> <password> [name] [--promote]"
    );
    process.exit(1);
  }

  const handle = normalizeHandle(handleRaw);
  if (!HANDLE_RE.test(handle)) {
    fail("핸들은 영문·숫자·._ 3~20자여야 합니다.");
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fail(`비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.`);
  }

  initDb();
  try {
    const existing = findAccount(handle);

    if (!existing) {
      const account = createAccount({
        handle,
        name: (nameRaw ?? handle).trim(),
        password,
        role: "admin",
      });
      console.log(`✔ 관리자 계정을 만들었습니다: @${account.handle} (${account.id})`);
      return;
    }

    if (existing.role === "admin") {
      console.log(`= 이미 관리자입니다: @${existing.handle} (${existing.id})`);
      return;
    }

    if (!promote) {
      fail(
        `@${existing.handle} 은(는) 이미 있는 일반 계정입니다.\n` +
          "  기존 계정을 관리자로 올리려면 --promote 를 붙여 다시 실행하세요.\n" +
          "  (이 경우 비밀번호는 변경되지 않고 기존 것을 그대로 씁니다.)"
      );
    }

    setAccountRole(existing.id, "admin");
    console.log(
      `✔ 관리자로 승격했습니다: @${existing.handle} (${existing.id})\n` +
        "  비밀번호는 기존 계정 것을 그대로 사용합니다."
    );
  } finally {
    closeDb();
  }
}

main();
