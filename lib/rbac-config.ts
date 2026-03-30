export const SYSTEM_PERMISSIONS = [
  {
    key: "admin.panel.access",
    description: "Access admin panel UI routes.",
  },
  {
    key: "dashboard.read",
    description: "Read dashboard analytics and summary views.",
  },
  {
    key: "users.read",
    description: "Read user lists and user details.",
  },
  {
    key: "users.manage",
    description: "Create, update, delete users and reset user password.",
  },
  {
    key: "roles.manage",
    description: "Create/update roles and assign permissions.",
  },
  {
    key: "products.manage",
    description: "Manage products, variants, and product metadata.",
  },
  {
    key: "inventory.manage",
    description: "Manage stock, inventory logs, and warehouse stock movement.",
  },
  {
    key: "orders.read_all",
    description: "Read all orders across customers.",
  },
  {
    key: "orders.read_own",
    description: "Read own orders only.",
  },
  {
    key: "orders.update",
    description: "Update order status/payment metadata.",
  },
  {
    key: "shipments.manage",
    description: "Create/update/delete shipment records and sync couriers.",
  },
  {
    key: "blogs.manage",
    description: "Create/update/delete blogs.",
  },
  {
    key: "newsletter.manage",
    description: "Manage newsletter and subscriber operations.",
  },
  {
    key: "coupons.manage",
    description: "Create/update/delete coupons and coupon settings.",
  },
  {
    key: "settings.manage",
    description: "Access settings areas with elevated configuration privileges.",
  },
  {
    key: "settings.banner.manage",
    description: "Manage homepage and promotional banners.",
  },
  {
    key: "settings.payment.manage",
    description: "Manage payment settings and methods.",
  },
  {
    key: "settings.shipping.manage",
    description: "Manage shipping rates and shipping configuration.",
  },
  {
    key: "settings.vat.manage",
    description: "Manage VAT class and VAT rate configuration.",
  },
  {
    key: "settings.courier.manage",
    description: "Manage courier configuration.",
  },
  {
    key: "settings.warehouse.manage",
    description: "Manage warehouse configuration.",
  },
  {
    key: "settings.activitylog.read",
    description: "Read admin activity logs based on allowed scope.",
  },
  {
    key: "chats.manage",
    description: "Read/respond/assign/close all support chats.",
  },
  {
    key: "chats.respond",
    description: "Respond as customer in own support chats.",
  },
  {
    key: "reports.read",
    description: "Read financial and operational reports.",
  },
  {
    key: "profile.manage",
    description: "Manage own account profile and password.",
  },
  {
    key: "storefront.access",
    description: "Access storefront buyer experience.",
  },
  {
    key: "cart.manage",
    description: "Manage own cart.",
  },
  {
    key: "wishlist.manage",
    description: "Manage own wishlist.",
  },
  {
    key: "logistics.manage",
    description: "Manage logistics operations and coordination.",
  },
  {
    key: "payroll.manage",
    description: "Manage payroll and employee compensation.",
  },
  {
    key: "delivery-men.manage",
    description: "Onboard and manage delivery personnel.",
  },
] as const;

export type PermissionKey = (typeof SYSTEM_PERMISSIONS)[number]["key"];

const ALL_PERMISSION_KEYS = SYSTEM_PERMISSIONS.map((permission) => permission.key);

export const SYSTEM_ROLE_DEFINITIONS: Array<{
  name: string;
  label: string;
  description: string;
  immutable: boolean;
  permissions: PermissionKey[];
}> = [
  {
    name: "superadmin",
    label: "Super Admin",
    description: "System owner role with unrestricted access.",
    immutable: true,
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    name: "admin",
    label: "Admin",
    description: "Full operational admin role.",
    immutable: false,
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    name: "support",
    label: "Support Agent",
    description: "Customer support and order visibility role.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "orders.read_all",
      "chats.manage",
      "chats.respond",
      "profile.manage",
    ],
  },
  {
    name: "catalog",
    label: "Catalog Manager",
    description: "Product and inventory management role.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "products.manage",
      "inventory.manage",
      "profile.manage",
    ],
  },
  {
    name: "logistics",
    label: "Logistics",
    description: "Shipment and operational logistics role.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "orders.read_all",
      "shipments.manage",
      "logistics.manage",
      "settings.shipping.manage",
      "settings.courier.manage",
      "settings.warehouse.manage",
      "profile.manage",
    ],
  },
  {
    name: "content",
    label: "Content Manager",
    description: "Blog/newsletter/banner operations.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "blogs.manage",
      "newsletter.manage",
      "settings.banner.manage",
      "profile.manage",
    ],
  },
  {
    name: "finance",
    label: "Finance Manager",
    description: "Finance and reporting focused role.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "orders.read_all",
      "orders.update",
      "coupons.manage",
      "reports.read",
      "profile.manage",
    ],
  },
  {
    name: "hr",
    label: "HR Manager",
    description: "Human resources and payroll management role.",
    immutable: false,
    permissions: [
      "admin.panel.access",
      "dashboard.read",
      "users.read",
      "users.manage",
      "payroll.manage",
      "profile.manage",
    ],
  },
];

const ROLE_TEMPLATE_FALLBACKS = Object.fromEntries(
  SYSTEM_ROLE_DEFINITIONS.map((definition) => [definition.name, [...definition.permissions]]),
) as Record<string, PermissionKey[]>;

export const LEGACY_ROLE_FALLBACKS: Record<string, PermissionKey[]> = {
  ...ROLE_TEMPLATE_FALLBACKS,
  user: [
    "storefront.access",
    "orders.read_own",
    "profile.manage",
    "cart.manage",
    "wishlist.manage",
    "chats.respond",
  ],
};

export const ADMIN_PANEL_ACCESS_FALLBACK_PERMISSIONS: PermissionKey[] = [
  "dashboard.read",
  "users.read",
  "users.manage",
  "roles.manage",
  "products.manage",
  "inventory.manage",
  "orders.read_all",
  "orders.update",
  "shipments.manage",
  "blogs.manage",
  "newsletter.manage",
  "coupons.manage",
  "settings.manage",
  "settings.banner.manage",
  "settings.payment.manage",
  "settings.shipping.manage",
  "settings.vat.manage",
  "settings.courier.manage",
  "settings.warehouse.manage",
  "settings.activitylog.read",
  "chats.manage",
  "reports.read",
];

export function isPermissionKey(value: string): value is PermissionKey {
  return SYSTEM_PERMISSIONS.some((permission) => permission.key === value);
}

export function getAllPermissionKeys(): PermissionKey[] {
  return [...ALL_PERMISSION_KEYS];
}
