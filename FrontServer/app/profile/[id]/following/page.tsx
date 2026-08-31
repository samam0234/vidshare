import FollowList from "@/components/follows/FollowList";

type Params = Promise<{ id: string }>;

export const metadata = { title: "팔로잉 · VidShare" };

export default async function FollowingListPage({ params }: { params: Params }) {
  const { id } = await params;
  return <FollowList id={id} kind="following" />;
}
