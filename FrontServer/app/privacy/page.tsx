import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "개인정보처리방침 — VidShare",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" updated="2026-09-02">
      <p>
        VidShare(이하 &quot;서비스&quot;)는 「대한민국헌법」 제10조(인간의 존엄과
        가치·행복추구권) 및 제17조(사생활의 비밀과 자유), 헌법재판소가 이로부터
        도출한 개인정보자기결정권, 그리고 「개인정보 보호법」에 따라 이용자의
        개인정보를 처리합니다. 이 방침은 같은 법 제30조(개인정보 처리방침의 수립
        및 공개)에 따라 공개합니다.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제1조 (개인정보의 정의)</h2>
        <p>
          「개인정보 보호법」 제2조 제1호에 따라, 개인정보란 살아 있는 개인에
          관한 정보로서 성명·영상 등을 통하여 개인을 알아볼 수 있는 정보와, 해당
          정보만으로는 알아볼 수 없더라도 다른 정보와 쉽게 결합하여 알아볼 수
          있는 정보를 말합니다. 서비스에서 다루는 핸들, 이름, 프로필, 이용자가
          올린 영상·글·댓글·메시지, 고객센터 문의는 이에 해당할 수 있습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제2조 (처리 원칙)</h2>
        <p>
          같은 법 제3조에 따라 개인정보는 처리 목적에 필요한 범위에서 최소한으로
          수집하고, 그 목적 외로 활용하지 않으며, 안전하게 관리합니다. 주민등록번호
          등 고유식별정보(제24조)와 사상·건강 등 민감정보(제23조)는 수집하지
          않습니다. 비밀번호는 복호화할 수 없는 해시로만 저장합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제3조 (수집 항목과 수집·이용)</h2>
        <p>
          제15조 제1항(정보주체의 동의, 계약의 체결·이행에 필요한 경우 등)에
          근거하여 다음을 처리합니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 가입·로그인: 핸들, 이름, 비밀번호(해시), 세션 쿠키</li>
          <li>서비스 이용: 업로드 영상·이미지, 게시글, 댓글, 메시지, 알림, 고객센터 문의, 프로필 소개</li>
          <li>기기·설정: 테마 등 기기에 저장되는 설정(개인 식별에 쓰이지 않음)</li>
        </ul>
        <p>
          회원가입 및 로그인 시 이 방침과 이용약관에 동의하는 것으로 제15조·제22조의
          동의를 갈음하는 안내를 합니다. 필수 항목을 제공하지 않으면 회원 기능을
          이용할 수 없습니다. 비회원은 공개 열람만 가능합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제4조 (이용 목적)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별, 로그인 유지, 부정 이용 방지</li>
          <li>콘텐츠 게시·조회·신고·차단 등 서비스 제공(계약 이행)</li>
          <li>고객 문의 응대</li>
          <li>챗봇 이용 시 질의 처리(제5조)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제5조 (제3자 제공 및 목적 외 이용 제한)</h2>
        <p>
          제17조·제18조에 따라, 법령에 근거하거나 정보주체가 별도로 동의한 경우가
          아니면 개인정보를 제3자에게 제공하거나 수집 목적 외로 이용하지 않습니다.
        </p>
        <p>
          다만 회원이 챗봇을 사용하는 경우, 해당 대화·첨부 내용이 질의 처리에
          필요한 범위에서 외부 AI 제공자(Google, Groq 등)로 전송될 수 있습니다.
          이는 제17조 제1항 제1호(정보주체의 동의) 및 제15조 제1항 제4호(계약
          이행)에 따른 처리로 보며, 챗봇을 쓰지 않으면 전송되지 않습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제6조 (보유 기간과 파기)</h2>
        <p>
          제21조에 따라 보유 기간이 경과하거나 처리 목적이 달성되면 지체 없이
          파기합니다. 현재 운영에서는 SQLite 파일과 업로드 디스크에 저장되며,
          회원 탈퇴·관리자 삭제·이용자 요청 시 해당 범위의 개인정보를 삭제합니다.
          관계 법령에 보존 의무가 있으면 그 기간 동안만 보관합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제7조 (쿠키 등 자동 수집 장치)</h2>
        <p>
          로그인 유지를 위해 HttpOnly 세션 쿠키를 사용합니다. 브라우저에서 쿠키를
          거부할 수 있으나, 그 경우 회원 기능을 이용하지 못할 수 있습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제8조 (정보주체의 권리)</h2>
        <p>
          헌법상 개인정보자기결정권과 「개인정보 보호법」 제35조(열람), 제36조
          (정정·삭제), 제37조(처리정지)에 따라, 이용자는 자신의 개인정보에 대해
          열람·정정·삭제·처리정지를 요구할 수 있습니다. 서비스 내 고객센터 문의
          또는 계정 기능으로 요청해 주세요. 법령상 보관이 필요한 정보는 그 범위에서
          삭제가 제한될 수 있습니다(제35조 제4항, 제37조 제2항).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제9조 (안전성 확보조치)</h2>
        <p>
          제29조에 따라 비밀번호 해시, 세션 쿠키의 HttpOnly, 업로드 파일의 형식·용량
          제한 등을 적용합니다. 다만 소규모 데모 운영이므로 전용 망분리·암호화
          저장 등 대규모 사업자에 요구되는 수준의 조치는 갖추지 않았습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">제10조 (개인정보 보호 책임 및 문의)</h2>
        <p>
          개인정보 관련 문의는 서비스 내 고객센터를 이용합니다. 권익 침해에 대한
          상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118) 등
          「개인정보 보호법」이 정한 기관에 할 수 있습니다.
        </p>
      </section>
    </LegalPage>
  );
}
