import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";
import {
  buildSupplierLeadTimeIntelligence,
  supplierLeadTimeInclude,
  type SupplierLeadTimeIntelligence,
} from "@/lib/supplier-intelligence";

const ACTIVE_ACTION_STATUSES: Prisma.SupplierSlaActionStatus[] = ["OPEN", "IN_PROGRESS"];

function roundToTwo(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function clampDueDays(value: number, fallback: number) {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(60, Math.max(1, value));
}

function toDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

export const supplierSlaPolicyInclude = Prisma.validator<Prisma.SupplierSlaPolicyInclude>()({
  supplier: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      leadTimeDays: true,
      paymentTermsDays: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  breaches: {
    orderBy: [{ evaluationDate: "desc" }, { id: "desc" }],
    take: 5,
    select: {
      id: true,
      evaluationDate: true,
      status: true,
      severity: true,
      breachCount: true,
      trackedPoCount: true,
      completedPoCount: true,
      openLatePoCount: true,
      observedLeadTimeDays: true,
      onTimeRatePercent: true,
      fillRatePercent: true,
      actionStatus: true,
      ownerUserId: true,
      dueDate: true,
      startedAt: true,
      resolvedAt: true,
      resolvedById: true,
      resolutionNote: true,
      alertTriggeredAt: true,
      alertAcknowledgedAt: true,
      issues: true,
      periodStart: true,
      periodEnd: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
});

export const supplierSlaBreachInclude = Prisma.validator<Prisma.SupplierSlaBreachInclude>()({
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
      autoEvaluationEnabled: true,
      warningActionDueDays: true,
      breachActionDueDays: true,
      isActive: true,
    },
  },
  owner: {
    select: { id: true, name: true, email: true },
  },
  resolvedBy: {
    select: { id: true, name: true, email: true },
  },
  evaluatedBy: {
    select: { id: true, name: true, email: true },
  },
});

export type SupplierSlaPolicyWithRelations = Prisma.SupplierSlaPolicyGetPayload<{
  include: typeof supplierSlaPolicyInclude;
}>;

export type SupplierSlaBreachWithRelations = Prisma.SupplierSlaBreachGetPayload<{
  include: typeof supplierSlaBreachInclude;
}>;

export type SupplierSlaEvaluationResult = {
  status: "OK" | "WARNING" | "BREACH";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breachCount: number;
  issues: string[];
  observedLeadTimeDays: number | null;
  onTimeRatePercent: number | null;
  fillRatePercent: number | null;
  trackedPoCount: number;
  completedPoCount: number;
  openLatePoCount: number;
};

export type RunSupplierSlaEvaluationInput = {
  supplierId?: number | null;
  policyId?: number | null;
  includeInactive?: boolean;
  autoOnly?: boolean;
  actorUserId?: string | null;
  access?: AccessContext | null;
  request?: Request | null;
};

export type RunSupplierSlaEvaluationResult = {
  generatedAt: string;
  count: number;
  rows: SupplierSlaBreachWithRelations[];
};

export function evaluateSupplierSlaPolicy(
  policy: {
    minTrackedPoCount: number;
    targetLeadTimeDays: number;
    minimumOnTimeRate: Prisma.Decimal | number | string;
    minimumFillRate: Prisma.Decimal | number | string;
    maxOpenLatePoCount: number;
  },
  intelligence: SupplierLeadTimeIntelligence,
): SupplierSlaEvaluationResult {
  const issues: string[] = [];
  let breachCount = 0;

  const trackedPoCount = intelligence.metrics.trackedPoCount;
  const completedPoCount = intelligence.metrics.completedPoCount;
  const openLatePoCount = intelligence.metrics.openLatePoCount;
  const observedLeadTimeDays = roundToTwo(intelligence.metrics.averageFinalReceiptLeadTimeDays);
  const onTimeRatePercent = roundToTwo(intelligence.metrics.onTimeRatePercent);
  const fillRatePercent = roundToTwo(intelligence.metrics.averageFillRatePercent);

  if (trackedPoCount < policy.minTrackedPoCount) {
    issues.push(
      `Insufficient sample size (${trackedPoCount}) for reliable SLA scoring. Minimum required is ${policy.minTrackedPoCount}.`,
    );
  }

  if (observedLeadTimeDays !== null && observedLeadTimeDays > policy.targetLeadTimeDays) {
    breachCount += 1;
    issues.push(
      `Observed lead time ${observedLeadTimeDays}d exceeded SLA target ${policy.targetLeadTimeDays}d.`,
    );
  }

  const minimumOnTimeRate = Number(policy.minimumOnTimeRate);
  if (onTimeRatePercent !== null && onTimeRatePercent < minimumOnTimeRate) {
    breachCount += 1;
    issues.push(
      `On-time rate ${onTimeRatePercent}% is below SLA minimum ${minimumOnTimeRate}%.`,
    );
  }

  const minimumFillRate = Number(policy.minimumFillRate);
  if (fillRatePercent !== null && fillRatePercent < minimumFillRate) {
    breachCount += 1;
    issues.push(`Fill rate ${fillRatePercent}% is below SLA minimum ${minimumFillRate}%.`);
  }

  if (openLatePoCount > policy.maxOpenLatePoCount) {
    breachCount += 1;
    issues.push(
      `Open late PO count ${openLatePoCount} exceeded SLA threshold ${policy.maxOpenLatePoCount}.`,
    );
  }

  let status: SupplierSlaEvaluationResult["status"] = "OK";
  if (breachCount >= 2) {
    status = "BREACH";
  } else if (breachCount === 1 || trackedPoCount < policy.minTrackedPoCount) {
    status = "WARNING";
  }

  let severity: SupplierSlaEvaluationResult["severity"] = "LOW";
  if (status === "WARNING") {
    severity = breachCount === 0 ? "LOW" : "MEDIUM";
  } else if (status === "BREACH") {
    severity = breachCount >= 3 ? "CRITICAL" : "HIGH";
  }

  return {
    status,
    severity,
    breachCount,
    issues,
    observedLeadTimeDays,
    onTimeRatePercent,
    fillRatePercent,
    trackedPoCount,
    completedPoCount,
    openLatePoCount,
  };
}

function buildAlertMessage(
  supplierName: string,
  status: SupplierSlaEvaluationResult["status"],
  severity: SupplierSlaEvaluationResult["severity"],
  issues: string[],
) {
  if (status === "OK") return null;
  const topIssue = issues[0] ?? "SLA threshold exceeded.";
  return `[${severity}] ${supplierName} SLA ${status}: ${topIssue}`.slice(0, 500);
}

export async function runSupplierSlaEvaluation({
  supplierId = null,
  policyId = null,
  includeInactive = false,
  autoOnly = false,
  actorUserId = null,
  access = null,
  request = null,
}: RunSupplierSlaEvaluationInput): Promise<RunSupplierSlaEvaluationResult> {
  const policies = await prisma.supplierSlaPolicy.findMany({
    where: {
      ...(Number.isInteger(policyId) && (policyId as number) > 0 ? { id: policyId as number } : {}),
      ...(Number.isInteger(supplierId) && (supplierId as number) > 0
        ? { supplierId: supplierId as number }
        : {}),
      ...(includeInactive ? {} : { isActive: true }),
      ...(autoOnly ? { autoEvaluationEnabled: true } : {}),
    },
    orderBy: [{ supplier: { name: "asc" } }, { id: "asc" }],
    include: supplierSlaPolicyInclude,
  });

  if (policies.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      count: 0,
      rows: [],
    };
  }

  const createdRows: SupplierSlaBreachWithRelations[] = [];

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
    const dueDays =
      evaluation.status === "BREACH"
        ? clampDueDays(policy.breachActionDueDays, 3)
        : clampDueDays(policy.warningActionDueDays, 7);

    const previousOpenBreach = await prisma.supplierSlaBreach.findFirst({
      where: {
        supplierSlaPolicyId: policy.id,
        actionStatus: { in: ACTIVE_ACTION_STATUSES },
      },
      orderBy: [{ evaluationDate: "desc" }, { id: "desc" }],
      select: { ownerUserId: true },
    });

    const actionStatus: Prisma.SupplierSlaActionStatus =
      evaluation.status === "OK" ? "NOT_REQUIRED" : "OPEN";
    const ownerUserId = actionStatus === "NOT_REQUIRED" ? null : previousOpenBreach?.ownerUserId ?? null;
    const dueDate = actionStatus === "NOT_REQUIRED" ? null : addDays(periodEnd, dueDays);
    const alertMessage = buildAlertMessage(
      supplier.name,
      evaluation.status,
      evaluation.severity,
      evaluation.issues,
    );

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
        actionStatus,
        ownerUserId,
        dueDate,
        alertTriggeredAt: alertMessage ? periodEnd : null,
        alertMessage,
        issues: evaluation.issues,
        evaluatedById: actorUserId,
      },
      include: supplierSlaBreachInclude,
    });

    createdRows.push(created);

    await logActivity({
      action: "evaluate",
      entity: "supplier_sla_breach",
      entityId: created.id,
      access,
      userId: actorUserId,
      request,
      metadata: {
        message: `Evaluated SLA policy for supplier ${created.supplier.name} (${created.supplier.code})`,
        status: created.status,
        severity: created.severity,
        breachCount: created.breachCount,
      },
    });

    if (created.alertTriggeredAt) {
      await logActivity({
        action: "alert",
        entity: "supplier_sla_alert",
        entityId: created.id,
        access,
        userId: actorUserId,
        request,
        metadata: {
          message: created.alertMessage || "Supplier SLA alert generated.",
          status: created.status,
          severity: created.severity,
          dueDate: created.dueDate?.toISOString() ?? null,
        },
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    count: createdRows.length,
    rows: createdRows,
  };
}

export function toSupplierSlaPolicyLogSnapshot(policy: SupplierSlaPolicyWithRelations) {
  return {
    id: policy.id,
    supplierId: policy.supplierId,
    supplierCode: policy.supplier.code,
    supplierName: policy.supplier.name,
    isActive: policy.isActive,
    effectiveFrom: policy.effectiveFrom.toISOString(),
    effectiveTo: policy.effectiveTo?.toISOString() ?? null,
    evaluationWindowDays: policy.evaluationWindowDays,
    minTrackedPoCount: policy.minTrackedPoCount,
    targetLeadTimeDays: policy.targetLeadTimeDays,
    minimumOnTimeRate: policy.minimumOnTimeRate.toString(),
    minimumFillRate: policy.minimumFillRate.toString(),
    maxOpenLatePoCount: policy.maxOpenLatePoCount,
    autoEvaluationEnabled: policy.autoEvaluationEnabled,
    warningActionDueDays: policy.warningActionDueDays,
    breachActionDueDays: policy.breachActionDueDays,
    note: policy.note ?? null,
  };
}
