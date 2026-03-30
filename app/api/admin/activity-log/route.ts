import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import {
  canAccessActivityEntity,
  getVisibleActivityEntities,
  hasFullActivityLogAccess,
  logActivity,
} from "@/lib/activity-log";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = toPositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(toPositiveInt(url.searchParams.get("pageSize"), 20), 100);
    const search = url.searchParams.get("search")?.trim() || "";
    const requestedEntity = url.searchParams.get("entity")?.trim() || "";
    const fullAccess = hasFullActivityLogAccess(access);

    if (requestedEntity && !canAccessActivityEntity(access, requestedEntity)) {
      return NextResponse.json({
        logs: [],
        total: 0,
        page,
        pageSize,
        entities: fullAccess ? [] : getVisibleActivityEntities(access),
        fullAccess,
      });
    }

    const visibleEntities = fullAccess ? [] : getVisibleActivityEntities(access);
    const where: Record<string, unknown> = {};

    if (requestedEntity) {
      where.entity = requestedEntity.toLowerCase();
    } else if (!fullAccess) {
      if (visibleEntities.length === 0) {
        return NextResponse.json({
          logs: [],
          total: 0,
          page,
          pageSize,
          entities: [],
          fullAccess: false,
        });
      }

      where.OR = visibleEntities.map((entity) => ({
        entity: {
          startsWith: entity.toLowerCase(),
        },
      }));
    }

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? (where.AND as unknown[]) : []),
        {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entity: { contains: search.toLowerCase() } },
            { entityId: { contains: search, mode: "insensitive" } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        },
      ];
    }

    const [rows, total, distinctEntities] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where: requestedEntity
          ? { entity: requestedEntity.toLowerCase() }
          : !fullAccess && visibleEntities.length > 0
            ? {
                OR: visibleEntities.map((entity) => ({
                  entity: {
                    startsWith: entity.toLowerCase(),
                  },
                })),
              }
            : undefined,
        distinct: ["entity"],
        select: { entity: true },
        orderBy: { entity: "asc" },
      }),
    ]);

    await logActivity({
      action: "view",
      entity: "activity_log",
      access,
      request,
      metadata: {
        page,
        pageSize,
        search: search || null,
        entity: requestedEntity || null,
      },
    });

    return NextResponse.json({
      logs: rows.map((row) => ({
        id: row.id.toString(),
        userId: row.userId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        metadata: row.metadata,
        ipHash: row.ipHash,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        updatetAt: row.updatetAt,
        user: row.user,
      })),
      total,
      page,
      pageSize,
      entities: distinctEntities.map((item) => item.entity),
      fullAccess,
    });
  } catch (error) {
    console.error("ACTIVITY LOG GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load activity logs." },
      { status: 500 },
    );
  }
}
