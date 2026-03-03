import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params;
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.has("users.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [user, roles] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          userRoles: {
            where: { role: { deletedAt: null } },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  description: true,
                  isSystem: true,
                  isImmutable: true,
                },
              },
            },
          },
        },
      }),
      prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          label: true,
          description: true,
          isSystem: true,
          isImmutable: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        legacyRole: user.role,
        assignedRoles: user.userRoles.map((item) => item.role),
      },
      roles,
    });
  } catch (error) {
    console.error("RBAC USER ROLES GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load user roles." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await params;
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.has("users.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      roleIds?: unknown;
    };
    const roleIds = Array.isArray(body.roleIds)
      ? [
          ...new Set(
            body.roleIds.filter((value: unknown): value is string => typeof value === "string"),
          ),
        ]
      : [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const validRoles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (validRoles.length !== roleIds.length) {
      return NextResponse.json(
        { error: "One or more roles are invalid." },
        { status: 400 },
      );
    }

    const superAdminRole = validRoles.find((role) => role.name === "superadmin");
    if (superAdminRole && !access.roleNames.includes("superadmin")) {
      return NextResponse.json(
        { error: "Only superadmin can assign superadmin role." },
        { status: 403 },
      );
    }

    const persistedSuperAdminRole = await prisma.role.findUnique({
      where: { name: "superadmin" },
      select: { id: true },
    });
    if (persistedSuperAdminRole) {
      const currentlyHasSuperAdmin = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId: persistedSuperAdminRole.id,
          },
        },
        select: { userId: true },
      });

      const willHaveSuperAdmin = roleIds.includes(persistedSuperAdminRole.id);
      if (currentlyHasSuperAdmin && !willHaveSuperAdmin) {
        const superAdminCount = await prisma.userRole.count({
          where: { roleId: persistedSuperAdminRole.id },
        });
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last superadmin role assignment." },
            { status: 409 },
          );
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userRole.findMany({
        where: { userId },
        select: { roleId: true },
      });
      const existingIds = new Set(existing.map((item) => item.roleId));
      const nextIds = new Set(roleIds);

      const toRemove = [...existingIds].filter((id) => !nextIds.has(id));
      if (toRemove.length > 0) {
        await tx.userRole.deleteMany({
          where: {
            userId,
            roleId: { in: toRemove },
          },
        });
      }

      const toAdd = roleIds.filter((id) => !existingIds.has(id));
      if (toAdd.length > 0) {
        await tx.userRole.createMany({
          data: toAdd.map((roleId) => ({
            userId,
            roleId,
            assignedById: access.userId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const assignedRoles = await prisma.userRole.findMany({
      where: { userId, role: { deletedAt: null } },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            label: true,
            description: true,
            isSystem: true,
            isImmutable: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "User roles updated successfully.",
      user: {
        id: user.id,
        email: user.email,
      },
      assignedRoles: assignedRoles.map((item) => item.role),
    });
  } catch (error) {
    console.error("RBAC USER ROLES PUT ERROR:", error);
    return NextResponse.json({ error: "Failed to update user roles." }, { status: 500 });
  }
}
