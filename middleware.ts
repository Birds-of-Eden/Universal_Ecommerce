import { NextResponse, type NextRequest } from "next/server";

// List of public paths that don't require authentication
const publicPaths = [
  '/',
  '/signin',
  '/sign-up',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/session',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/static',
];

type SessionShape = {
  user?: {
    role?: string;
    permissions?: string[];
    defaultAdminRoute?: "/admin" | "/admin/warehouse";
  };
} | null;

type PermissionRule = {
  prefix: string;
  permissions: string[];
  methods?: string[];
  excludePrefixes?: string[];
};

const adminPagePermissionRules: PermissionRule[] = [
  {
    prefix: "/admin/warehouse",
    permissions: ["dashboard.read", "inventory.manage", "orders.read_all", "shipments.manage"],
  },
  { prefix: "/admin/analytics", permissions: ["dashboard.read", "admin.panel.access"] },
  { prefix: "/admin/reports", permissions: ["reports.read"] },
  { prefix: "/admin/settings/payroll", permissions: ["payroll.manage"] },
  { prefix: "/admin/settings/rbac", permissions: ["roles.manage"] },
  { prefix: "/admin/settings/banner", permissions: ["settings.banner.manage", "settings.manage"] },
  { prefix: "/admin/settings/general", permissions: ["settings.manage"] },
  { prefix: "/admin/settings/payment", permissions: ["settings.payment.manage", "settings.manage"] },
  { prefix: "/admin/settings/warehouses", permissions: ["settings.warehouse.manage", "settings.manage"] },
  { prefix: "/admin/settings/couriers", permissions: ["settings.courier.manage", "settings.manage"] },
  { prefix: "/admin/settings/vatclasses", permissions: ["settings.vat.manage", "settings.manage"] },
  { prefix: "/admin/settings/shipping-rates", permissions: ["settings.shipping.manage", "settings.manage"] },
  {
    prefix: "/admin/settings",
    permissions: [
      "settings.manage",
      "settings.banner.manage",
      "settings.payment.manage",
      "settings.warehouse.manage",
      "settings.courier.manage",
      "settings.vat.manage",
      "settings.shipping.manage",
    ],
  },
  { prefix: "/admin/users", permissions: ["users.read", "users.manage"] },
  { prefix: "/admin/products", permissions: ["products.manage"] },
  { prefix: "/admin/orders", permissions: ["orders.read_all"] },
  { prefix: "/admin/chats", permissions: ["chats.manage"] },
  { prefix: "/admin/shipments", permissions: ["shipments.manage", "orders.read_all"] },
  { prefix: "/admin/logistics", permissions: ["logistics.manage"] },
  { prefix: "/admin/payroll", permissions: ["payroll.manage"] },
  { prefix: "/admin/management/categories", permissions: ["products.manage"] },
  { prefix: "/admin/management/brands", permissions: ["products.manage"] },
  { prefix: "/admin/management/writers", permissions: ["products.manage"] },
  { prefix: "/admin/management/publishers", permissions: ["products.manage"] },
  { prefix: "/admin/management/stock", permissions: ["inventory.manage"] },
  { prefix: "/admin/management", permissions: ["products.manage"] },
  { prefix: "/admin/blogs", permissions: ["blogs.manage"] },
  { prefix: "/admin/newsletter", permissions: ["newsletter.manage"] },
  { prefix: "/admin/coupons", permissions: ["coupons.manage"] },
  { prefix: "/admin/profile", permissions: ["profile.manage"] },
  { prefix: "/admin", permissions: ["dashboard.read", "admin.panel.access"] },
];

const apiPermissionRules: PermissionRule[] = [
  {
    prefix: "/api/admin/rbac/users",
    permissions: ["users.manage"],
  },
  {
    prefix: "/api/admin/rbac",
    permissions: ["roles.manage"],
  },
  {
    prefix: "/api/admin/coupons",
    permissions: ["coupons.manage", "settings.manage"],
  },
  {
    prefix: "/api/admin/shipping-rates",
    permissions: ["settings.shipping.manage", "settings.manage"],
  },
  {
    prefix: "/api/admindashboard",
    permissions: ["dashboard.read"],
  },
  {
    prefix: "/api/analytics/summary",
    permissions: ["dashboard.read", "admin.panel.access"],
  },
  {
    prefix: "/api/reports",
    permissions: ["reports.read"],
  },
  {
    prefix: "/api/admin/warehouse-dashboard",
    permissions: ["dashboard.read", "inventory.manage", "orders.read_all", "shipments.manage"],
  },
  {
    prefix: "/api/admin/payroll",
    permissions: ["payroll.manage"],
  },
  {
    prefix: "/api/blog",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["blogs.manage"],
  },
  {
    prefix: "/api/products",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/product-variants",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/product-attributes",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/attributes",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/attribute-values",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/categories",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/brands",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/writers",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/publishers",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/digital-assets",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["products.manage"],
  },
  {
    prefix: "/api/stock-levels",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["inventory.manage"],
  },
  {
    prefix: "/api/inventory-logs",
    permissions: ["inventory.manage"],
  },
  {
    prefix: "/api/banners",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["settings.banner.manage", "settings.manage"],
  },
  {
    prefix: "/api/vat-classes",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["settings.vat.manage", "settings.manage"],
  },
  {
    prefix: "/api/vat-rates",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["settings.vat.manage", "settings.manage"],
  },
  {
    prefix: "/api/warehouses",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["settings.warehouse.manage", "settings.manage"],
  },
  {
    prefix: "/api/couriers",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["settings.courier.manage", "settings.manage"],
  },
  {
    prefix: "/api/newsletter/subscribe",
    permissions: [],
  },
  {
    prefix: "/api/newsletter/unsubscribe",
    permissions: [],
  },
  {
    prefix: "/api/newsletter",
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    permissions: ["newsletter.manage"],
  },
  {
    prefix: "/api/newsletter/subscribers",
    permissions: ["newsletter.manage"],
  },
  {
    prefix: "/api/newsletter/",
    permissions: ["newsletter.manage"],
    excludePrefixes: ["/api/newsletter/subscribe", "/api/newsletter/unsubscribe"],
  },
];

function getPermissionKeys(session: SessionShape): string[] {
  return Array.isArray(session?.user?.permissions) ? session.user.permissions : [];
}

function hasAnyPermission(permissionKeys: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => permissionKeys.includes(permission));
}

function hasAdminPanelAccess(session: SessionShape): boolean {
  const permissionKeys = getPermissionKeys(session);
  return permissionKeys.includes("admin.panel.access");
}

function getDefaultAdminRoute(session: SessionShape): "/admin" | "/admin/warehouse" {
  return session?.user?.defaultAdminRoute === "/admin/warehouse"
    ? "/admin/warehouse"
    : "/admin";
}

function findMatchedRule(
  pathname: string,
  method: string,
  rules: PermissionRule[],
): PermissionRule | null {
  for (const rule of rules) {
    if (!(pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`))) {
      continue;
    }

    if (
      rule.excludePrefixes &&
      rule.excludePrefixes.some(
        (excluded) => pathname === excluded || pathname.startsWith(`${excluded}/`),
      )
    ) {
      continue;
    }

    if (rule.methods && !rule.methods.includes(method.toUpperCase())) {
      continue;
    }
    return rule;
  }
  return null;
}

export default async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Skip middleware for public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (pathname.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next();
  }

  let session: SessionShape = null;

  try {
    const response = await fetch(new URL('/api/auth/session', request.url), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        session = await response.json();
      }
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }

  const permissionKeys = getPermissionKeys(session);
  const adminAccess = hasAdminPanelAccess(session);
  const defaultAdminRoute = getDefaultAdminRoute(session);

  // API permission checks
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    const matchedApiRule = findMatchedRule(pathname, method, apiPermissionRules);
    if (!matchedApiRule) {
      return NextResponse.next();
    }

    if (matchedApiRule.permissions.length === 0) {
      return NextResponse.next();
    }

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasAnyPermission(permissionKeys, matchedApiRule.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Handle protected routes (admin and dashboard)
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/ecommerce/user/');

  // Handle permission-aware redirection
  if (session?.user) {
    // If user has admin panel access and trying to access user dashboard, redirect to admin
    if (adminAccess && pathname.startsWith('/ecommerce/user/')) {
      return NextResponse.redirect(new URL(defaultAdminRoute, request.url));
    }
    
    // If user does not have admin panel access and trying to access admin, redirect to dashboard
    if (!adminAccess && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/ecommerce/user/', request.url));
    }

    if (adminAccess && pathname.startsWith("/admin")) {
      if (pathname === "/admin" && defaultAdminRoute !== "/admin") {
        return NextResponse.redirect(new URL(defaultAdminRoute, request.url));
      }

      const matchedPageRule = findMatchedRule(pathname, method, adminPagePermissionRules);
      if (matchedPageRule && !hasAnyPermission(permissionKeys, matchedPageRule.permissions)) {
        if (pathname !== "/admin") {
          return NextResponse.redirect(new URL(defaultAdminRoute, request.url));
        }
        return NextResponse.redirect(new URL("/ecommerce/user/", request.url));
      }
    }
  }

  if (isProtectedRoute && !session) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages -> to /home
  const isAuthRoute = ['/signin', '/sign-up'].includes(pathname);
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|static).*)',
  ],
};
