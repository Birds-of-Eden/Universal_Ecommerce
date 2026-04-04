import { Prisma } from "@/generated/prisma";
import type { SupplierLeadTimeIntelligence } from "@/lib/supplier-intelligence";

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
      issues: true,
      periodStart: true,
      periodEnd: true,
    },
  },
});

export type SupplierSlaPolicyWithRelations = Prisma.SupplierSlaPolicyGetPayload<{
  include: typeof supplierSlaPolicyInclude;
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

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function roundToTwo(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

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

  if (
    observedLeadTimeDays !== null &&
    observedLeadTimeDays > policy.targetLeadTimeDays
  ) {
    breachCount += 1;
    issues.push(
      `Observed lead time ${observedLeadTimeDays}d exceeded SLA target ${policy.targetLeadTimeDays}d.`,
    );
  }

  const minimumOnTimeRate = Number(policy.minimumOnTimeRate);
  if (
    onTimeRatePercent !== null &&
    onTimeRatePercent < minimumOnTimeRate
  ) {
    breachCount += 1;
    issues.push(
      `On-time rate ${onTimeRatePercent}% is below SLA minimum ${minimumOnTimeRate}%.`,
    );
  }

  const minimumFillRate = Number(policy.minimumFillRate);
  if (fillRatePercent !== null && fillRatePercent < minimumFillRate) {
    breachCount += 1;
    issues.push(
      `Fill rate ${fillRatePercent}% is below SLA minimum ${minimumFillRate}%.`,
    );
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
    note: policy.note ?? null,
  };
}
