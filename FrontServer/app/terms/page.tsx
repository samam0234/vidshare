import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "이용약관 — VidShare",
};

export default function TermsPage() {
  return (
    <LegalPage title="이용약관" updated="2026-09-02">
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제1조 (목적)</h2>
        <p>
          이 약관은 VidShare(이하 &quot;서비스&quot;)가 제공하는 숏폼·롱폼 영상
          공유 및 커뮤니티 기능의 이용 조건과 절차, 회사와 이용자의 권리·의무를
          정합니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제2조 (정의)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>&quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
          <li>&quot;회원&quot;이란 계정을 만들고 서비스를 이용하는 자를 말합니다.</li>
          <li>&quot;콘텐츠&quot;란 이용자가 서비스에 게시하는 영상, 글, 댓글, 메시지 등을 말합니다.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제3조 (약관의 효력과 변경)</h2>
        <p>
          약관은 서비스 화면에 게시하거나 기타 방법으로 공지함으로써 효력이
          발생합니다. 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며,
          개정 시 적용 일자와 사유를 공지합니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제4조 (계정)</h2>
        <p>
          일부 기능(업로드, 메시지, 알림, 고객센터 문의 등)은 회원만 이용할 수
          있습니다. 계정 정보의 관리 책임은 회원에게 있으며, 타인의 계정을
          사용해서는 안 됩니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제5조 (서비스의 내용)</h2>
        <p>
          서비스는 영상 시청·업로드, 커뮤니티, 메시지, 알림, 고객센터, 안내
          챗봇 등을 제공합니다. 운영상 필요에 따라 기능을 추가·변경·중단할 수
          있습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제6조 (이용자의 의무)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>법령, 이 약관, 서비스 안내를 준수해야 합니다.</li>
          <li>타인의 권리(저작권, 초상권, 명예 등)를 침해하는 콘텐츠를 올려서는 안 됩니다.</li>
          <li>음란·폭력·혐오·사기·스팸 등 불법·유해 행위를 해서는 안 됩니다.</li>
          <li>서비스의 정상적인 운영을 방해하는 자동화된 접근을 해서는 안 됩니다.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제7조 (콘텐츠)</h2>
        <p>
          이용자가 게시한 콘텐츠의 권리는 해당 이용자에게 있습니다. 서비스 운영,
          개선, 홍보를 위해 필요한 범위에서 콘텐츠를 이용할 수 있습니다. 법령
          위반이나 제3자 권리 침해가 확인되면 콘텐츠를 제한하거나 삭제할 수
          있습니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제8조 (면책)</h2>
        <p>
          서비스는 데모·소규모 운영을 전제로 제공됩니다. 천재지변, 이용자 귀책,
          외부 네트워크 장애 등 불가항력으로 인한 손해에 대해서는 법령이 허용하는
          범위에서 책임을 제한합니다.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">제9조 (준거법)</h2>
        <p>
          이 약관은 대한민국 법령을 따릅니다. 서비스 이용과 관련한 분쟁은 민사소송법
          등 관련 법령이 정한 관할 법원에 제소합니다.
        </p>
      </section>
    </LegalPage>
  );
}
