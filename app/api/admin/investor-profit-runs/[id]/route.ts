import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { toCleanText } from "@/lib/investor";

function canApproveInvestorProfit(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investor_profit.approve");
}

function serializeRun(run: {
  id: number;
  runNumber: string;
  status: string;
  approvedAt: Date | null;
  approvedBy?: { id: string; name: string | null; email: string } | null;
  postedAt: Date | null;
  postedBy?: { id: string; name: string | null; email: string } | null;
  updatedAt: Date;
}) {
  return {
    ...run,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    postedAt: run.postedAt?.toISOString() ?? null,
    updatedAt: run.updatedAt.toISOString(),
  };
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
    if (!canApproveInvestorProfit(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const runId = Number(id);
    if (!Number.isInteger(runId) || runId <= 0) {
      return NextResponse.json({ error: "Invalid profit run id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || "").trim().toLowerCase();
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use approve or reject." }, { status: 400 });
    }
    const note = toCleanText(body.note, 500) || null;

    const existing = await prisma.investorProfitRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        runNumber: true,
        status: true,
        createdById: true,
        approvedAt: true,
        postedAt: true,
        postingNote: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Investor profit run not found." }, { status: 404 });
    }
    if (existing.status === "POSTED") {
      return NextResponse.json(
        { error: "Posted run cannot be approved or rejected." },
        { status: 400 },
      );
    }
    if (action === "approve" && existing.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only PENDING_APPROVAL runs can be approved." },
        { status: 400 },
      );
    }
    if (action === "reject" && existing.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Only PENDING_APPROVAL runs can be rejected." },
        { status: 400 },
      );
    }
    if (existing.createdById && existing.createdById === access.userId) {
      return NextResponse.json(
        { error: "Maker-checker policy: creator cannot approve/reject own profit run." },
        { status: 403 },
      );
    }

    const now = new Date();
    const updated = await prisma.investorProfitRun.update({
      where: { id: runId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedById: access.userId,
        approvedAt: now,
        ...(action === "reject" ? { postingNote: note ?? "Rejected in approval step." } : {}),
      },
      include: {
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        postedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logActivity({
      action: action === "approve" ? "approve" : "reject",
      entity: "investor_profit_run",
      entityId: updated.id,
      access,
      request,
      metadata: {
        message:
          action === "approve"
            ? `Approved investor profit run ${updated.runNumber}`
            : `Rejected investor profit run ${updated.runNumber}`,
        note,
      },
      before: {
        status: existing.status,
        approvedAt: existing.approvedAt?.toISOString() ?? null,
      },
      after: {
        status: updated.status,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
      },
    });

    return NextResponse.json({
      run: serializeRun(updated),
    });
  } catch (error: any) {
    console.error("ADMIN INVESTOR PROFIT RUN PATCH ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update investor profit run." },
      { status: 500 },
    );
  }
}
