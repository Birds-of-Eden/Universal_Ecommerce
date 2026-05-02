import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcrypt";
import {
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLE_DEFINITIONS,
} from "../lib/rbac-config";

const prisma = new PrismaClient();

const DEFAULT_SUPPLIER_CATEGORIES = [
  {
    code: "APPAREL",
    name: "Apparel",
    description:
      "Garments, uniforms, fabric items, and stitched textile supply.",
  },
  {
    code: "PACKAGING",
    name: "Packaging",
    description:
      "Cartons, polybags, labels, wraps, and related packaging materials.",
  },
  {
    code: "ELECTRICAL",
    name: "Electrical",
    description:
      "Electrical goods, wiring items, fittings, and related maintenance supply.",
  },
  {
    code: "IT_EQUIPMENT",
    name: "IT Equipment",
    description:
      "Computers, networking devices, peripherals, and technology equipment.",
  },
  {
    code: "OFFICE_SUPPLIES",
    name: "Office Supplies",
    description:
      "Stationery, print consumables, filing, and day-to-day office materials.",
  },
  {
    code: "FURNITURE",
    name: "Furniture",
    description:
      "Office furniture, fixtures, storage, and workspace setup items.",
  },
  {
    code: "PRINTING",
    name: "Printing",
    description:
      "Printed materials, branding collateral, forms, and publication services.",
  },
  {
    code: "LOGISTICS_SERVICES",
    name: "Logistics Services",
    description:
      "Transport, courier, forwarding, and other delivery-related services.",
  },
  {
    code: "FACILITY_MAINTENANCE",
    name: "Facility Maintenance",
    description:
      "Repair, cleaning, maintenance, and facility support services.",
  },
  {
    code: "GENERAL_SERVICES",
    name: "General Services",
    description:
      "Professional or operational services not covered by a specific supply category.",
  },
] as const;

async function ensurePermissionsAndRoles() {
  for (const permission of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        description: permission.description,
      },
      create: {
        key: permission.key,
        description: permission.description,
      },
    });
  }

  for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        label: roleDef.label,
        description: roleDef.description,
        isSystem: true,
        isImmutable: roleDef.immutable,
      },
      create: {
        name: roleDef.name,
        label: roleDef.label,
        description: roleDef.description,
        isSystem: true,
        isImmutable: roleDef.immutable,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: {
        key: { in: roleDef.permissions },
      },
      select: {
        id: true,
      },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }
}

async function ensureDefaultSupplierCategories(createdById?: string | null) {
  for (const category of DEFAULT_SUPPLIER_CATEGORIES) {
    await prisma.supplierCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: true,
        createdById: createdById ?? null,
      },
    });
  }
}

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";

  await ensurePermissionsAndRoles();

  // Create admin user
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin User",
      role: "admin",
      passwordHash: hashedAdminPassword,
      emailVerified: new Date(),
      banned: null,
      banReason: null,
      banExpires: null,
      note: null,
    },
    create: {
      email: adminEmail,
      name: "Admin User",
      role: "admin",
      passwordHash: hashedAdminPassword,
      emailVerified: new Date(),
      banned: null,
      banReason: null,
      banExpires: null,
      note: null,
    },
  });

  console.log("✅ Admin user ensured:", {
    id: admin.id,
    email: admin.email,
    password: adminPassword,
    role: admin.role,
  });

  await ensureDefaultSupplierCategories(admin?.id ?? null);
  console.log("✅ Default supplier categories ensured");

  const investorPortalUsers = [
    {
      email: "yousuf@z.shoes.com",
      name: "Yousuf",
      phone: null,
      password: "yousuf123",
    },
    {
      email: "mahin@z.shoes.com",
      name: "Mahin",
      phone: null,
      password: "mahin123",
    },
    {
      email: "salehin@z.shoes.com",
      name: "Salehin",
      phone: null,
      password: "salehin123",
    },
  ];

  for (const investorUser of investorPortalUsers) {
    const hashedPassword = await bcrypt.hash(investorUser.password, 10);

    const user = await prisma.user.upsert({
      where: {
        email: investorUser.email,
      },
      update: {
        name: investorUser.name,
        role: "investor_portal",
        phone: investorUser.phone,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
        banned: null,
        banReason: null,
        banExpires: null,
        note: null,
      },
      create: {
        email: investorUser.email,
        name: investorUser.name,
        role: "investor_portal",
        phone: investorUser.phone,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
        banned: null,
        banReason: null,
        banExpires: null,
        note: null,
      },
    });

    console.log("✅ Investor portal user ensured:", {
      id: user.id,
      email: user.email,
      password: investorUser.password,
      role: user.role,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
