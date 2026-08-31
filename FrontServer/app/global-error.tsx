"use client";

import { useEffect } from "react";

/** 루트 레이아웃 자체가 실패했을 때만 렌더된다. 별도 html/body가 필요하다. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          VidShare를 불러오지 못했습니다
        </h1>
        <p style={{ color: "#666", fontSize: "0.875rem" }}>
          잠시 후 새로고침해 주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            background: "#7c3aed",
            color: "#fff",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
