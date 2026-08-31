import FollowList from "@/components/follows/FollowList";

type Params = Promise<{ id: string }>;

export const metadata = { title: "팔로워 · VidShare" };

export default async function FollowersPage({ params }: { params: Params }) {
  const { id } = await params;
  return <FollowList id={id} kind="followers" />;
}
