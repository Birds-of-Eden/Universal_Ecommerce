import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { DeliveryDashboardClient } from "@/components/delivery/DeliveryDashboardClient";
import { authOptions } from "@/lib/auth";
import { getAccessContext } from "@/lib/rbac";

export default async function DeliveryDashboardPage() {
  const session = await getServerSession(authOptions);
  const access = await getAccessContext(
    session?.user as { id?: string; role?: string } | undefined,
  );

  if (!access.userId) {
    redirect("/signin?returnUrl=/delivery/dashboard");
  }

  if (!access.has("delivery.dashboard.access")) {
    redirect("/");
  }

  return <DeliveryDashboardClient />;
}
