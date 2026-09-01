import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "개인정보처리방침 — VidShare",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" updated="2026-09-02">
      <section className="space-y-2">
        <h2 className="text-base font-semibold">1. 수집하는 개인정보</h2>
        <p>서비스 제공을 위해 아래 정보를 수집합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원: 핸들, 이름, 비밀번호(해시), 프로필 소개</li>
          <li>이용 과정에서 생성: 세션, 업로드 파일, 게시글, 댓글, 메시지, 알림, 고객센터 문의</li>
          <li>기기: 접속 로그, 쿠키(로그인 세션, 테마 설정)</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">2. 이용 목적</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별 및 로그인 유지</li>
          <li>콘텐츠 게시·조회·신고 처리 등 서비스 제공</li>
          <li>고객 문의 응대, 부정 이용 방지</li>
          <li>챗봇 이용 시 대화 처리(연동된 외부 AI 제공자에 질의 내용이 전달될 수 있음)</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">3. 보유 기간</h2>
        <p>
          회원 탈퇴 또는 수집 목적 달성 시 지체 없이 파기합니다. 다만 관계 법령에
          따라 일정 기간 보관이 필요한 경우에는 해당 기간 동안만 보관합니다.
          현재 데모 운영에서는 데이터가 서버 디스크(SQLite·업로드 폴더)에
          저장됩니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">4. 제3자 제공</h2>
        <p>
          법령에 근거하거나 이용자의 동의가 있는 경우를 제외하고 개인정보를
          제3자에게 제공하지 않습니다. 챗봇 기능을 쓰는 경우 대화·첨부 내용이
          선택한 AI 제공자(예: Google, Groq)로 전송될 수 있습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">5. 쿠키</h2>
        <p>
          로그인 유지를 위한 HttpOnly 세션 쿠키와, 화면 테마처럼 기기에 저장되는
          설정을 사용합니다. 브라우저에서 쿠키를 차단하면 로그인이 유지되지 않을
          수 있습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">6. 이용자의 권리</h2>
        <p>
          이용자는 자신의 개인정보 열람·정정·삭제를 요청할 수 있습니다. 고객센터
          문의 또는 계정 관련 기능을 통해 요청해 주세요.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">7. 문의</h2>
        <p>
          개인정보 관련 문의는 서비스 내 고객센터를 이용해 주세요.
        </p>
      </section>
    </LegalPage>
  );
}
