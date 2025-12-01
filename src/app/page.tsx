import { HomePageClient } from "@/components/home-page-client";
import { getSessionContext } from "@/lib/auth/session";

export default async function HomePage() {
  const { userId } = await getSessionContext();

  return <HomePageClient userId={userId} />;
}
