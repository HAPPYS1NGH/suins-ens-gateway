import { Hero } from "@/components/hero";
import { NameWorkspace } from "@/components/name-workspace";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getCurrentSession();

  return session ? <NameWorkspace /> : <Hero />;
}
