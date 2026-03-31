type DashboardUserLike = {
  role?: string | null;
  permissions?: string[] | null;
  defaultAdminRoute?: "/admin" | "/admin/warehouse" | null;
} | null | undefined;

export const USER_DASHBOARD_ROUTE = "/ecommerce/user/";
export const DELIVERY_DASHBOARD_ROUTE = "/delivery/dashboard";

const AUTH_ROUTES = ["/signin", "/sign-up"];

function normalizeRole(role?: string | null) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export function hasAdminDashboardAccess(user?: DashboardUserLike) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return (
    permissions.includes("admin.panel.access") ||
    normalizeRole(user?.role) === "admin"
  );
}

export function hasDeliveryDashboardAccess(user?: DashboardUserLike) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const role = normalizeRole(user?.role);
  return (
    permissions.includes("delivery.dashboard.access") ||
    role === "delivery_man" ||
    role === "deliveryman"
  );
}

export function getDashboardRoute(user?: DashboardUserLike) {
  if (hasAdminDashboardAccess(user)) {
    return user?.defaultAdminRoute === "/admin/warehouse"
      ? "/admin/warehouse"
      : "/admin";
  }

  if (hasDeliveryDashboardAccess(user)) {
    return DELIVERY_DASHBOARD_ROUTE;
  }

  return USER_DASHBOARD_ROUTE;
}

export function sanitizeReturnUrl(returnUrl?: string | null) {
  const value = String(returnUrl || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  const pathOnly = value.split("?")[0]?.split("#")[0] || value;
  if (AUTH_ROUTES.includes(pathOnly)) {
    return null;
  }

  return value;
}

export function resolvePostAuthRoute(
  user?: DashboardUserLike,
  returnUrl?: string | null,
) {
  return sanitizeReturnUrl(returnUrl) ?? getDashboardRoute(user);
}
