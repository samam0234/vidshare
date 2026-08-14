import ProfilePageClient from "@/components/profile/ProfilePageClient";

type Params = Promise<{ id: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  return <ProfilePageClient id={id} />;
}
