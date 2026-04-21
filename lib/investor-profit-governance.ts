import { Prisma } from "@/generated/prisma";

function asDecimal(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

export function summarizeInvestorProfitRunExceptions(input: {
  variantLines: Array<{
    id: number;
    unallocatedSharePct: Prisma.Decimal;
    netProfit: Prisma.Decimal;
  }>;
  allocationLines: Array<{
    id: number;
    allocatedNetProfit: Prisma.Decimal;
    sourceAllocationId: number | null;
    sourceAllocation?: { status: string } | null;
  }>;
}) {
  const variantsWithUnallocated = input.variantLines.filter((line) =>
    asDecimal(line.unallocatedSharePct).gt(0),
  );
  const missingSourceAllocationCount = input.allocationLines.filter(
    (line) => !line.sourceAllocationId,
  ).length;
  const inactiveSourceAllocationCount = input.allocationLines.filter(
    (line) => line.sourceAllocation && line.sourceAllocation.status !== "ACTIVE",
  ).length;
  const negativeDistributionCount = input.allocationLines.filter((line) =>
    asDecimal(line.allocatedNetProfit).lt(0),
  ).length;

  const unallocatedShareTotal = variantsWithUnallocated.reduce(
    (total, line) => total.plus(line.unallocatedSharePct),
    new Prisma.Decimal(0),
  );

  return {
    variantLineCount: input.variantLines.length,
    allocationLineCount: input.allocationLines.length,
    variantsWithUnallocatedCount: variantsWithUnallocated.length,
    unallocatedShareTotal: unallocatedShareTotal.toString(),
    missingSourceAllocationCount,
    inactiveSourceAllocationCount,
    negativeDistributionCount,
    blockingIssues: [
      ...(input.variantLines.length === 0 ? ["No variant lines exist for this run."] : []),
      ...(input.allocationLines.length === 0 ? ["No investor allocation snapshot exists for this run."] : []),
      ...(variantsWithUnallocated.length > 0
        ? ["One or more variants still have unallocated investor share."]
        : []),
    ],
  };
}
