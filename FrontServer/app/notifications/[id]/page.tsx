import NotificationDetail from "@/components/notifications/NotificationDetail";

type Params = Promise<{ id: string }>;

export default async function NotificationDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return <NotificationDetail id={id} />;
}
