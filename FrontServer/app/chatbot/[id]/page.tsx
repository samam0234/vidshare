import ChatbotThread from "@/components/chatbot/ChatbotThread";

type Params = Promise<{ id: string }>;

export default async function ChatbotThreadPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ChatbotThread id={id} />;
}
