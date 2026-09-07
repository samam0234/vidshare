import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .open-next 는 OpenNext 빌드 산출물이라 우리가 고칠 대상이 아니다
  globalIgnores([".next/**", "out/**", "build/**", ".open-next/**", "next-env.d.ts"]),
]);

export default eslintConfig;
