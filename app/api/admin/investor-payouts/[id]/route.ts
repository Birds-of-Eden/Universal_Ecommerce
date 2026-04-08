import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  computeInvestorLedgerTotals,
  generateInvestorTransactionNumber,
  parseInvestorPayoutPaymentMethod,
  toCleanText,
} from "@/lib/investor";

function canApprovePayout(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investor_payout.approve");
}

function canPayPayout(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investor_payout.pay");
}

function canVoidPayout(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investor_payout.void");
}

export async function PATCH(
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

    const { id } = await params;
    const payoutId = Number(id);
    if (!Number.isInteger(payoutId) || payoutId <= 0) {
      return NextResponse.json({ error: "Invalid payout id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || "").trim().toLowerCase();

    if (!["approve", "reject", "pay", "void"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use approve/reject/pay/void." },
        { status: 400 },
      );
    }

    const payout = await prisma.investorProfitPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        payoutNumber: true,
        runId: true,
        investorId: true,
        payoutAmount: true,
        status: true,
        createdById: true,
        transactionId: true,
        currency: true,
      },
    });
    if (!payout) {
      return NextResponse.json({ error: "Payout not found." }, { status: 404 });
    }

    if (action === "approve" || action === "reject") {
      if (!canApprovePayout(access)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (payout.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only PENDING_APPROVAL payout can be approved/rejected." },
          { status: 400 },
        );
      }
      if (payout.createdById && payout.createdById === access.userId) {
        return NextResponse.json(
          { error: "Maker-checker policy: creator cannot approve/reject own payout." },
          { status: 403 },
        );
      }

      const now = new Date();
      const note = toCleanText(body.note, 500) || null;
      const updated = await prisma.investorProfitPayout.update({
        where: { id: payout.id },
        data:
          action === "approve"
            ? {
                status: "APPROVED",
                approvedById: access.userId,
                approvedAt: now,
                approvalNote: note,
                rejectedById: null,
                rejectedAt: null,
                rejectionReason: null,
              }
            : {
                status: "REJECTED",
                rejectedById: access.userId,
                rejectedAt: now,
                rejectionReason: note || "Rejected by payout approver.",
                approvedById: null,
                approvedAt: null,
              },
        select: {
          id: true,
          payoutNumber: true,
          status: true,
          approvedAt: true,
          rejectedAt: true,
        },
      });

      await logActivity({
        action,
        entity: "investor_profit_payout",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message:
            action === "approve"
              ? `Approved payout ${updated.payoutNumber}`
              : `Rejected payout ${updated.payoutNumber}`,
          note,
        },
      });

      return NextResponse.json({
        payout: {
          ...updated,
          approvedAt: updated.approvedAt?.toISOString() ?? null,
          rejectedAt: updated.rejectedAt?.toISOString() ?? null,
        },
      });
    }

    if (action === "pay") {
      if (!canPayPayout(access)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (payout.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Only APPROVED payout can be paid." },
          { status: 400 },
        );
      }

      const paymentMethod = parseInvestorPayoutPaymentMethod(body.paymentMethod);
      const bankReference = toCleanText(body.bankReference, 120) || null;
      const note = toCleanText(body.note, 500) || null;
      const paidAtInput = body.paidAt ? new Date(String(body.paidAt)) : new Date();
      if (Number.isNaN(paidAtInput.getTime())) {
        return NextResponse.json({ error: "Invalid paid date." }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const investor = await tx.investor.findUnique({
          where: { id: payout.investorId },
          select: { id: true, status: true },
        });
        if (!investor || investor.status !== "ACTIVE") {
          throw new Error("Only ACTIVE investors can receive payout settlement.");
        }

        const grouped = await tx.investorCapitalTransaction.groupBy({
          by: ["direction"],
          where: { investorId: payout.investorId },
          _sum: { amount: true },
        });
        const totals = computeInvestorLedgerTotals(
          grouped.map((item) => ({
            direction: item.direction,
            amount: item._sum.amount ?? new Prisma.Decimal(0),
          })),
        );
        if (payout.payoutAmount.gt(totals.balance)) {
          throw new Error("Payout exceeds available investor balance.");
        }

        const transactionNumber = await generateInvestorTransactionNumber(tx, paidAtInput);
        const transaction = await tx.investorCapitalTransaction.create({
          data: {
            transactionNumber,
            investorId: payout.investorId,
            transactionDate: paidAtInput,
            type: "DISTRIBUTION",
            direction: "DEBIT",
            amount: payout.payoutAmount,
            currency: payout.currency,
            note: note || `Settlement for payout ${payout.payoutNumber}.`,
            referenceType: "INVESTOR_PROFIT_PAYOUT",
            referenceNumber: payout.payoutNumber,
            productVariantId: null,
            createdById: access.userId,
          },
        });

        const updated = await tx.investorProfitPayout.update({
          where: { id: payout.id },
          data: {
            status: "PAID",
            transactionId: transaction.id,
            paidById: access.userId,
            paymentMethod,
            bankReference,
            note,
            paidAt: paidAtInput,
          },
          select: {
            id: true,
            payoutNumber: true,
            status: true,
            paidAt: true,
            transactionId: true,
          },
        });

        return {
          transactionNumber: transaction.transactionNumber,
          updated,
        };
      });

      await logActivity({
        action: "pay",
        entity: "investor_profit_payout",
        entityId: payout.id,
        access,
        request,
        metadata: {
          message: `Settled payout ${payout.payoutNumber}`,
          transactionNumber: result.transactionNumber,
        },
      });

      return NextResponse.json({
        payout: {
          ...result.updated,
          paidAt: result.updated.paidAt?.toISOString() ?? null,
        },
        transactionNumber: result.transactionNumber,
      });
    }

    if (!canVoidPayout(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["APPROVED", "PAID"].includes(payout.status)) {
      return NextResponse.json(
        { error: "Only APPROVED or PAID payout can be voided." },
        { status: 400 },
      );
    }

    const voidReason = toCleanText(body.voidReason, 500) || "Voided by authorized reviewer.";

    const voided = await prisma.$transaction(async (tx) => {
      let reversalReference: string | null = null;

      if (payout.status === "PAID") {
        const reversalNumber = await generateInvestorTransactionNumber(tx, new Date());
        await tx.investorCapitalTransaction.create({
          data: {
            transactionNumber: reversalNumber,
            investorId: payout.investorId,
            transactionDate: new Date(),
            type: "ADJUSTMENT",
            direction: "CREDIT",
            amount: payout.payoutAmount,
            currency: payout.currency,
            note: `Void reversal for payout ${payout.payoutNumber}. ${voidReason}`,
            referenceType: "INVESTOR_PAYOUT_VOID_REVERSAL",
            referenceNumber: payout.payoutNumber,
            productVariantId: null,
            createdById: access.userId,
          },
        });
        reversalReference = reversalNumber;
      }

      return tx.investorProfitPayout.update({
        where: { id: payout.id },
        data: {
          status: "VOID",
          voidedById: access.userId,
          voidedAt: new Date(),
          voidReason,
          voidReversalReference: reversalReference,
        },
        select: {
          id: true,
          payoutNumber: true,
          status: true,
          voidedAt: true,
          voidReversalReference: true,
        },
      });
    });

    await logActivity({
      action: "void",
      entity: "investor_profit_payout",
      entityId: payout.id,
      access,
      request,
      metadata: {
        message: `Voided payout ${payout.payoutNumber}`,
        voidReason,
        reversalReference: voided.voidReversalReference,
      },
    });

    return NextResponse.json({
      payout: {
        ...voided,
        voidedAt: voided.voidedAt?.toISOString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("ADMIN INVESTOR PAYOUT PATCH ERROR:", error);
    const message = String(error?.message || "");
    if (
      message.includes("Invalid") ||
      message.includes("Only") ||
      message.includes("Maker-checker") ||
      message.includes("exceeds") ||
      message.includes("ACTIVE investors")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message || "Failed to process payout action." }, { status: 500 });
  }
}
