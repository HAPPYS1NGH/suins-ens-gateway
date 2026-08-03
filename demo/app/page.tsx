import { DemoShell } from "@/components/demo-shell";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getCurrentSession();

  return <DemoShell session={session} />;
}
