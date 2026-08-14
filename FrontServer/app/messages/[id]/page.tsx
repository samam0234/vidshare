import MessageThread from "@/components/messages/MessageThread";

type Params = Promise<{ id: string }>;

export default async function MessageThreadPage({ params }: { params: Params }) {
  const { id } = await params;
  return <MessageThread id={id} />;
}
