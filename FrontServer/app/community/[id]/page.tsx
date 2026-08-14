import CommunityDetail from "@/components/community/CommunityDetail";

type Params = Promise<{ id: string }>;

export default async function CommunityDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  return <CommunityDetail id={id} />;
}
