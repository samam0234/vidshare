import PlaylistDetail from "@/components/playlists/PlaylistDetail";

type Params = Promise<{ id: string }>;

export const metadata = { title: "재생목록 · VidShare" };

export default async function PlaylistPage({ params }: { params: Params }) {
  const { id } = await params;
  return <PlaylistDetail id={Number(id)} />;
}
