import InquiryDetail from "@/components/support/InquiryDetail";

type Params = Promise<{ id: string }>;

export default async function SupportInquiryPage({ params }: { params: Params }) {
  const { id } = await params;
  return <InquiryDetail id={id} />;
}
