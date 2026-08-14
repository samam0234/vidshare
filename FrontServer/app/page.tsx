import ShortsFeed from "@/components/shorts/ShortsFeed";

type SearchParams = Promise<{ q?: string; id?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return <ShortsFeed query={params.q} focusId={params.id} />;
}
