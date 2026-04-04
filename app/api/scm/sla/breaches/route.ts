import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  buildSupplierLeadTimeIntelligence,
  supplierLeadTimeInclude,
} from "@/lib/supplier-intelligence";
import {
  evaluateSupplierSlaPolicy,
  supplierSlaPolicyInclude,
} from "@/lib/supplier-sla";

const SLA_BREACH_READ_PERMISSIONS = ["sla.read", "sla.manage"] as const;

function canRead(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return SLA_BREACH_READ_PERMISSIONS.some((permission) => access.hasGlobal(permission));
}

function toDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
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
    if (!canRead(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplierId = Number(request.nextUrl.searchParams.get("supplierId") || "");
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const onlyLatest = request.nextUrl.searchParams.get("latest") === "1";
    const days = Number(request.nextUrl.searchParams.get("days") || "180");
    const lookbackDays = Number.isInteger(days) && days > 0 ? Math.min(days, 1095) : 180;

    const rows = await prisma.supplierSlaBreach.findMany({
      where: {
        evaluationDate: { gte: toDate(lookbackDays) },
        ...(Number.isInteger(supplierId) && supplierId > 0 ? { supplierId } : {}),
        ...(status ? { status: status as Prisma.EnumSupplierSlaEvaluationStatusFilter["equals"] } : {}),
      },
      orderBy: [{ evaluationDate: "desc" }, { id: "desc" }],
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
        policy: {
          select: {
            id: true,
            targetLeadTimeDays: true,
            minimumOnTimeRate: true,
            minimumFillRate: true,
            maxOpenLatePoCount: true,
            minTrackedPoCount: true,
            evaluationWindowDays: true,
            isActive: true,
          },
        },
        evaluatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      take: 300,
    });

    if (!onlyLatest) {
      return NextResponse.json(rows);
    }

    const latestByPolicy = new Map<number, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByPolicy.has(row.supplierSlaPolicyId)) {
        latestByPolicy.set(row.supplierSlaPolicyId, row);
      }
    }
    return NextResponse.json([...latestByPolicy.values()]);
  } catch (error) {
    console.error("SCM SLA BREACHES GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load SLA breach logs." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.hasGlobal("sla.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      supplierId?: unknown;
      policyId?: unknown;
      includeInactive?: unknown;
    };

    const supplierId = Number(body.supplierId);
    const policyId = Number(body.policyId);
    const includeInactive = body.includeInactive === true;

    const policies = await prisma.supplierSlaPolicy.findMany({
      where: {
        ...(Number.isInteger(policyId) && policyId > 0 ? { id: policyId } : {}),
        ...(Number.isInteger(supplierId) && supplierId > 0 ? { supplierId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ supplier: { name: "asc" } }, { id: "asc" }],
      include: supplierSlaPolicyInclude,
    });

    if (policies.length === 0) {
      return NextResponse.json(
        { error: "No SLA policies found for evaluation." },
        { status: 400 },
      );
    }

    const createdRows: Array<Awaited<ReturnType<typeof prisma.supplierSlaBreach.create>>> = [];

    for (const policy of policies) {
      const periodEnd = new Date();
      const periodStart = toDate(policy.evaluationWindowDays);

      const supplier = await prisma.supplier.findUnique({
        where: { id: policy.supplierId },
        include: supplierLeadTimeInclude,
      });
      if (!supplier) {
        continue;
      }

      const intelligence = buildSupplierLeadTimeIntelligence(
        {
          ...supplier,
          purchaseOrders: supplier.purchaseOrders.filter(
            (purchaseOrder) => purchaseOrder.orderDate >= periodStart,
          ),
        },
        periodEnd,
      );

      const evaluation = evaluateSupplierSlaPolicy(policy, intelligence);

      const created = await prisma.supplierSlaBreach.create({
        data: {
          supplierSlaPolicyId: policy.id,
          supplierId: policy.supplierId,
          periodStart,
          periodEnd,
          trackedPoCount: evaluation.trackedPoCount,
          completedPoCount: evaluation.completedPoCount,
          openLatePoCount: evaluation.openLatePoCount,
          breachCount: evaluation.breachCount,
          status: evaluation.status,
          severity: evaluation.severity,
          observedLeadTimeDays:
            evaluation.observedLeadTimeDays === null
              ? null
              : new Prisma.Decimal(evaluation.observedLeadTimeDays),
          onTimeRatePercent:
            evaluation.onTimeRatePercent === null
              ? null
              : new Prisma.Decimal(evaluation.onTimeRatePercent),
          fillRatePercent:
            evaluation.fillRatePercent === null
              ? null
              : new Prisma.Decimal(evaluation.fillRatePercent),
          issues: evaluation.issues,
          evaluatedById: access.userId,
        },
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          policy: {
            select: {
              id: true,
              targetLeadTimeDays: true,
              minimumOnTimeRate: true,
              minimumFillRate: true,
              maxOpenLatePoCount: true,
              minTrackedPoCount: true,
              evaluationWindowDays: true,
              isActive: true,
            },
          },
          evaluatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      createdRows.push(created);

      await logActivity({
        action: "evaluate",
        entity: "supplier_sla_breach",
        entityId: created.id,
        access,
        request,
        metadata: {
          message: `Evaluated SLA policy for supplier ${created.supplier.name} (${created.supplier.code})`,
          status: created.status,
          severity: created.severity,
          breachCount: created.breachCount,
        },
      });
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      count: createdRows.length,
      rows: createdRows,
    });
  } catch (error: any) {
    console.error("SCM SLA BREACHES POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run SLA evaluation." },
      { status: 500 },
    );
  }
}
