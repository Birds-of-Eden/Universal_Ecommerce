import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SYSTEM_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../lib/rbac-config";

const prisma = new PrismaClient();

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

async function main() {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123"; // change in production

  await ensurePermissionsAndRoles();

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let admin = existingAdmin;

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        role: "admin",
        passwordHash: hashedPassword,
        emailVerified: new Date(),
      },
    });
    console.log("✅ Admin created successfully");
    console.log({
      email: admin.email,
      password: adminPassword,
    });
  } else {
    console.log("✅ Admin already exists");
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "superadmin" },
    select: { id: true },
  });

  if (admin && superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    });
    console.log("✅ Superadmin role assigned to seed admin");
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
