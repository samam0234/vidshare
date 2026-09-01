import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "사업자 정보확인 — VidShare",
};

const rows: { label: string; value: string }[] = [
  { label: "상호", value: "VidShare" },
  { label: "대표자", value: "미등록 (개인 프로젝트)" },
  { label: "사업자등록번호", value: "미등록" },
  { label: "통신판매업 신고번호", value: "해당 없음" },
  { label: "사업장 주소", value: "미등록" },
  { label: "이메일", value: "고객센터 문의 이용" },
];

export default function BusinessPage() {
  return (
    <LegalPage title="사업자 정보확인" updated="2026-09-02">
      <p>
        전자상거래 등에서의 소비자보호에 관한 법률에 따라 사업자 정보를
        안내합니다. 현재 VidShare는 사업자등록 전의 개인 프로젝트로 운영되며,
        아래 항목은 등록 후 실제 값으로 교체합니다.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <th className="w-40 bg-[var(--bg-card)] px-4 py-3 font-medium text-[var(--text-muted)]">
                  {row.label}
                </th>
                <td className="px-4 py-3">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        사업자등록 이후에는{" "}
        <a
          href="https://www.ftc.go.kr/www/bizCommList.do?key=226"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          공정거래위원회 사업자등록정보 조회
        </a>
        에서 등록번호를 확인할 수 있습니다.
      </p>
    </LegalPage>
  );
}
