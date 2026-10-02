/**
 * 관리자 계정 목록 CLI — 콘솔에 로그인할 핸들을 잊었을 때.
 *
 *   npm run list-admins
 *
 * 비밀번호는 bcrypt 해시라 보여 줄 수 없다. 잊었다면 npm run reset-password -- <handle>.
 */
import "dotenv/config";
import { closeDb, initDb } from "../src/db/client";
import { listAdminAccounts } from "../src/auth/accounts";

async function main() {
  await initDb();
  try {
    const admins = await listAdminAccounts();
    if (!admins.length) {
      console.log("관리자 계정이 없습니다. 만들기: npm run create-admin -- <handle> <password>");
      return;
    }
    console.log(`관리자 ${admins.length}명`);
    console.table(
      admins.map((a) => ({
        handle: a.handle,
        name: a.name,
        id: a.id,
        정지: a.suspended ? "예" : "",
        생성: a.createdAt.slice(0, 10),
      }))
    );
    console.log("비밀번호를 잊었다면: npm run reset-password -- <handle> --generate");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
