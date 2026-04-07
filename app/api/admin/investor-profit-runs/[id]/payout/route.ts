import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  computeInvestorLedgerTotals,
  generateInvestorProfitPayoutNumber,
  generateInvestorTransactionNumber,
  toCleanText,
  toDecimalAmount,
} from "@/lib/investor";

function canManageInvestorPayout(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investor_payout.manage");
}

type PayoutCandidate = {
  investorId: number;
  grossProfitAmount: Prisma.Decimal;
  payoutAmount: Prisma.Decimal;
  holdbackAmount: Prisma.Decimal;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageInvestorPayout(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const runId = Number(id);
    if (!Number.isInteger(runId) || runId <= 0) {
      return NextResponse.json({ error: "Invalid profit run id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payoutPercent = toDecimalAmount(body.payoutPercent ?? 100, "Payout percent");
    const holdbackPercent = toDecimalAmount(body.holdbackPercent ?? 0, "Holdback percent");
    const note = toCleanText(body.note, 500) || null;
    const currency = toCleanText(body.currency, 3).toUpperCase() || "BDT";
    if (payoutPercent.lte(0) || payoutPercent.gt(100)) {
      return NextResponse.json({ error: "Payout percent must be between 0 and 100." }, { status: 400 });
    }
    if (holdbackPercent.lt(0) || holdbackPercent.gt(100)) {
      return NextResponse.json({ error: "Holdback percent must be between 0 and 100." }, { status: 400 });
    }

    const run = await prisma.investorProfitRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        runNumber: true,
        status: true,
      },
    });
    if (!run) {
      return NextResponse.json({ error: "Investor profit run not found." }, { status: 404 });
    }
    if (run.status !== "POSTED") {
      return NextResponse.json(
        { error: "Run must be POSTED before creating payouts." },
        { status: 400 },
      );
    }

    const [profitByInvestor, paidByInvestor] = await Promise.all([
      prisma.investorProfitRunAllocation.groupBy({
        by: ["investorId"],
        where: {
          runId,
          allocatedNetProfit: { gt: 0 },
        },
        _sum: {
          allocatedNetProfit: true,
        },
      }),
      prisma.investorProfitPayout.groupBy({
        by: ["investorId"],
        where: {
          runId,
          status: "PAID",
        },
        _sum: {
          payoutAmount: true,
        },
      }),
    ]);

    const paidMap = new Map<number, Prisma.Decimal>();
    for (const row of paidByInvestor) {
      paidMap.set(row.investorId, row._sum.payoutAmount ?? new Prisma.Decimal(0));
    }

    const payoutFactor = payoutPercent.div(100);
    const holdbackFactor = holdbackPercent.div(100);

    const candidates: PayoutCandidate[] = [];
    for (const row of profitByInvestor) {
      const totalProfit = row._sum.allocatedNetProfit ?? new Prisma.Decimal(0);
      const alreadyPaid = paidMap.get(row.investorId) ?? new Prisma.Decimal(0);
      const remaining = totalProfit.minus(alreadyPaid);
      if (remaining.lte(0)) continue;

      const grossProfitAmount = remaining.mul(payoutFactor);
      if (grossProfitAmount.lte(0)) continue;

      const holdbackAmount = grossProfitAmount.mul(holdbackFactor);
      const payoutAmount = grossProfitAmount.minus(holdbackAmount);
      if (payoutAmount.lte(0)) continue;

      candidates.push({
        investorId: row.investorId,
        grossProfitAmount,
        payoutAmount,
        holdbackAmount,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No payable investor profit is available for payout." },
        { status: 400 },
      );
    }

    const investorIds = candidates.map((item) => item.investorId);
    const created = await prisma.$transaction(async (tx) => {
      const activeInvestors = await tx.investor.findMany({
        where: { id: { in: investorIds } },
        select: { id: true, status: true },
      });
      const inactive = activeInvestors.find((item) => item.status !== "ACTIVE");
      if (inactive) {
        throw new Error("Only ACTIVE investors can receive payouts.");
      }

      const groups = await tx.investorCapitalTransaction.groupBy({
        by: ["investorId", "direction"],
        where: { investorId: { in: investorIds } },
        _sum: {
          amount: true,
        },
      });
      for (const candidate of candidates) {
        const totals = computeInvestorLedgerTotals(
          groups
            .filter((item) => item.investorId === candidate.investorId)
            .map((item) => ({
              direction: item.direction,
              amount: item._sum.amount ?? new Prisma.Decimal(0),
            })),
        );
        if (candidate.payoutAmount.gt(totals.balance)) {
          throw new Error(
            `Payout exceeds available investor balance for investor #${candidate.investorId}.`,
          );
        }
      }

      const paidAt = new Date();
      const payouts: Array<{
        id: number;
        payoutNumber: string;
        investorId: number;
        payoutAmount: string;
        transactionNumber: string;
      }> = [];

      for (const candidate of candidates) {
        const payoutNumber = await generateInvestorProfitPayoutNumber(tx, paidAt);
        const transactionNumber = await generateInvestorTransactionNumber(tx, paidAt);
        const transaction = await tx.investorCapitalTransaction.create({
          data: {
            transactionNumber,
            investorId: candidate.investorId,
            transactionDate: paidAt,
            type: "DISTRIBUTION",
            direction: "DEBIT",
            amount: candidate.payoutAmount,
            currency,
            note: note || `Payout from investor profit run ${run.runNumber}.`,
            referenceType: "INVESTOR_PROFIT_PAYOUT",
            referenceNumber: payoutNumber,
            productVariantId: null,
            createdById: access.userId,
          },
        });

        const payout = await tx.investorProfitPayout.create({
          data: {
            payoutNumber,
            runId: run.id,
            investorId: candidate.investorId,
            transactionId: transaction.id,
            currency,
            payoutPercent,
            holdbackPercent,
            grossProfitAmount: candidate.grossProfitAmount,
            holdbackAmount: candidate.holdbackAmount,
            payoutAmount: candidate.payoutAmount,
            status: "PAID",
            note,
            paidAt,
            createdById: access.userId,
          },
        });

        payouts.push({
          id: payout.id,
          payoutNumber: payout.payoutNumber,
          investorId: payout.investorId,
          payoutAmount: payout.payoutAmount.toString(),
          transactionNumber: transaction.transactionNumber,
        });
      }

      return {
        paidAt,
        payouts,
      };
    });

    await logActivity({
      action: "payout",
      entity: "investor_profit_payout",
      entityId: run.id,
      access,
      request,
      metadata: {
        message: `Created investor payouts from run ${run.runNumber}`,
        payoutCount: created.payouts.length,
        payoutPercent: payoutPercent.toString(),
        holdbackPercent: holdbackPercent.toString(),
      },
    });

    return NextResponse.json({
      runId: run.id,
      runNumber: run.runNumber,
      paidAt: created.paidAt.toISOString(),
      payoutCount: created.payouts.length,
      payouts: created.payouts,
    });
  } catch (error: any) {
    console.error("ADMIN INVESTOR PAYOUT ERROR:", error);
    const message = String(error?.message || "");
    if (
      message.includes("must be") ||
      message.includes("No payable") ||
      message.includes("Run must be POSTED") ||
      message.includes("available investor balance") ||
      message.includes("ACTIVE investors")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message || "Failed to create payout." }, { status: 500 });
  }
}
