import { redirect } from "next/navigation";
import { DELIVERY_DASHBOARD_ROUTE } from "@/lib/dashboard-route";

export default function AdminDeliveryIndexPage() {
  redirect(DELIVERY_DASHBOARD_ROUTE);
}
