import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  parseInvestorKycStatus,
  parseInvestorStatus,
  toCleanText,
  toInvestorSnapshot,
} from "@/lib/investor";

function canManageInvestors(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("investors.manage");
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
    if (!canManageInvestors(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const investorId = Number(id);
    if (!Number.isInteger(investorId) || investorId <= 0) {
      return NextResponse.json({ error: "Invalid investor id." }, { status: 400 });
    }

    const existing = await prisma.investor.findUnique({
      where: { id: investorId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        kycStatus: true,
        email: true,
        phone: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Investor not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = body.name !== undefined ? toCleanText(body.name, 120) : undefined;
    const legalName = body.legalName !== undefined ? toCleanText(body.legalName, 160) : undefined;
    const email = body.email !== undefined ? toCleanText(body.email, 160) : undefined;
    const phone = body.phone !== undefined ? toCleanText(body.phone, 40) : undefined;
    const notes = body.notes !== undefined ? toCleanText(body.notes, 500) : undefined;
    const kycReference =
      body.kycReference !== undefined ? toCleanText(body.kycReference, 120) : undefined;
    const status = body.status !== undefined ? parseInvestorStatus(body.status) : undefined;
    const kycStatus =
      body.kycStatus !== undefined ? parseInvestorKycStatus(body.kycStatus) : undefined;

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: "Investor name cannot be empty." }, { status: 400 });
      }
      data.name = name;
    }
    if (legalName !== undefined) data.legalName = legalName || null;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (notes !== undefined) data.notes = notes || null;
    if (kycReference !== undefined) data.kycReference = kycReference || null;
    if (status !== undefined) data.status = status;
    if (kycStatus !== undefined) {
      data.kycStatus = kycStatus;
      data.kycVerifiedAt = kycStatus === "VERIFIED" ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const updated = await prisma.investor.update({
      where: { id: investorId },
      data,
    });

    await logActivity({
      action: "update",
      entity: "investor",
      entityId: updated.id,
      access,
      request,
      metadata: {
        message: `Updated investor ${updated.name} (${updated.code})`,
      },
      before: toInvestorSnapshot(existing),
      after: toInvestorSnapshot(updated),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("ADMIN INVESTORS PATCH ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update investor." },
      { status: 500 },
    );
  }
}
