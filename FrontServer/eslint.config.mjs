import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 아래는 전부 생성물이라 우리가 고칠 대상이 아니다.
    ".next-e2e/**",
    ".open-next/**",          // OpenNext 빌드 산출물 (수만 건의 경고를 만든다)
    "public/portfolio/**",    // portfolio/site 복사본 (npm run portfolio:sync)
  ]),
]);

export default eslintConfig;
