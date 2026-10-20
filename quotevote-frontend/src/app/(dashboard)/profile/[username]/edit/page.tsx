import type { Metadata } from "next";
import EditProfilePageClient from "./EditProfilePageClient";

interface Props {
  params: Promise<{ username: string }>;
}

export const metadata: Metadata = {
  title: "Edit profile — Quote.Vote",
  description: "Change your photo, name, username, About and banner.",
};

export const dynamic = "force-dynamic";

export default async function EditProfilePage({ params }: Props) {
  const { username } = await params;
  return <EditProfilePageClient username={decodeURIComponent(username)} />;
}
