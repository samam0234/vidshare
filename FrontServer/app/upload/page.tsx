import LongformForm from "@/components/longform/LongformForm";
import UploadForm from "@/components/upload/UploadForm";
import UploadTabs from "@/components/upload/UploadTabs";
import { parseUploadTab } from "@/lib/upload-tabs";

type SearchParams = Promise<{ type?: string | string[] }>;

export default async function UploadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type } = await searchParams;
  const tab = parseUploadTab(type);

  return (
    <>
      <UploadTabs active={tab} />
      {tab === "longform" ? <LongformForm /> : <UploadForm />}
    </>
  );
}
