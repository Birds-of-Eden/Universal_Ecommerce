import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveInvestorRequestContext } from "@/app/api/investor/shared";
import {
  INVESTOR_DOCUMENT_TYPES,
  getMissingInvestorDocumentTypes,
  isInvestorDocumentType,
} from "@/lib/investor-documents";
import {
  getInvestorDocumentReadSummary,
  syncInvestorKycStatus,
} from "@/lib/investor-document-service";

function toCleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  try {
    const resolved = await resolveInvestorRequestContext();

    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    if (!resolved.context.access.has("investor.portal.documents.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = await getInvestorDocumentReadSummary(resolved.context.investorId);
    return NextResponse.json({
      requiredDocumentTypes: INVESTOR_DOCUMENT_TYPES,
      investor: summary.investor,
      documents: summary.documents,
      missingDocumentTypes: getMissingInvestorDocumentTypes(summary.documents),
    });
  } catch (error) {
    console.error("INVESTOR PORTAL DOCUMENTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load investor document center." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveInvestorRequestContext();

    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    if (!resolved.context.access.has("investor.portal.documents.submit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : "";
    const fileUrl = toCleanText(body.fileUrl, 2000);

    if (!isInvestorDocumentType(type)) {
      return NextResponse.json({ error: "Valid document type is required." }, { status: 400 });
    }
    if (!fileUrl.startsWith("/api/upload/investor-kyc/")) {
      return NextResponse.json({ error: "Invalid investor document upload URL." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.investorDocument.upsert({
        where: {
          investorId_type: {
            investorId: resolved.context.investorId,
            type,
          },
        },
        create: {
          investorId: resolved.context.investorId,
          type,
          fileUrl,
          fileName: toCleanText(body.fileName, 255) || null,
          mimeType: toCleanText(body.mimeType, 120) || null,
          fileSize:
            body.fileSize === null || body.fileSize === undefined || body.fileSize === ""
              ? null
              : Number(body.fileSize),
          documentNumber: toCleanText(body.documentNumber, 120) || null,
          issuedAt: parseOptionalDate(body.issuedAt),
          expiresAt: parseOptionalDate(body.expiresAt),
          status: "PENDING",
          reviewNote: toCleanText(body.reviewNote, 500) || null,
          uploadedById: resolved.context.userId,
          reviewedById: null,
          reviewedAt: null,
        },
        update: {
          fileUrl,
          fileName: toCleanText(body.fileName, 255) || null,
          mimeType: toCleanText(body.mimeType, 120) || null,
          fileSize:
            body.fileSize === null || body.fileSize === undefined || body.fileSize === ""
              ? null
              : Number(body.fileSize),
          documentNumber: toCleanText(body.documentNumber, 120) || null,
          issuedAt: parseOptionalDate(body.issuedAt),
          expiresAt: parseOptionalDate(body.expiresAt),
          status: "PENDING",
          reviewNote: toCleanText(body.reviewNote, 500) || null,
          uploadedById: resolved.context.userId,
          reviewedById: null,
          reviewedAt: null,
        },
      });
      await syncInvestorKycStatus(tx, resolved.context.investorId);
    });

    const summary = await getInvestorDocumentReadSummary(resolved.context.investorId);
    return NextResponse.json({
      investor: summary.investor,
      documents: summary.documents,
      missingDocumentTypes: getMissingInvestorDocumentTypes(summary.documents),
    });
  } catch (error: any) {
    console.error("INVESTOR PORTAL DOCUMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload investor document." },
      { status: 500 },
    );
  }
}
