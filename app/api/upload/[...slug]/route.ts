import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAccessContext } from "@/lib/rbac";
import { resolveSupplierPortalContext } from "@/lib/supplier-portal";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rootUploadDir = path.join(process.cwd(), "public", "upload");
const SCM_PROPOSAL_PREFIX = "scm-proposals";

function guessContentType(ext: string) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function isScmProposalPath(relPath: string) {
  return (
    relPath === SCM_PROPOSAL_PREFIX ||
    relPath.startsWith(`${SCM_PROPOSAL_PREFIX}/`)
  );
}

async function canWriteScmProposalFiles(sessionUser: {
  id?: string;
  role?: string;
} | null | undefined) {
  const access = await getAccessContext(sessionUser);
  if (!access.userId) return false;

  if (access.hasAny(["rfq.manage", "rfq.approve"])) {
    return true;
  }

  const supplier = await resolveSupplierPortalContext(sessionUser);
  return (
    supplier.ok &&
    supplier.context.access.has("supplier.rfq.quote.submit")
  );
}

async function canReadScmProposalFile(
  relPath: string,
  sessionUser: { id?: string; role?: string } | null | undefined,
) {
  const access = await getAccessContext(sessionUser);
  if (!access.userId) return false;

  const fileUrl = `/api/upload/${relPath}`;
  const attachment = await prisma.supplierQuotationAttachment.findFirst({
    where: { fileUrl },
    select: {
      supplierQuotation: {
        select: {
          supplierId: true,
          rfq: {
            select: {
              warehouseId: true,
            },
          },
        },
      },
    },
  });

  if (!attachment) return false;

  const warehouseId = attachment.supplierQuotation.rfq.warehouseId;
  if (
    access.can("rfq.read", warehouseId) ||
    access.can("rfq.manage", warehouseId) ||
    access.can("rfq.approve", warehouseId)
  ) {
    return true;
  }

  const supplier = await resolveSupplierPortalContext(sessionUser);
  return (
    supplier.ok &&
    supplier.context.supplierId === attachment.supplierQuotation.supplierId &&
    supplier.context.access.hasAny([
      "supplier.rfq.read",
      "supplier.rfq.quote.submit",
    ])
  );
}

/* ---------------- POST (UPLOAD) ---------------- */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // Get params (must be awaited in Next 15 dynamic routes)
    const { slug } = await params;
    const relPath = slug.join("/");
    const requiresScmProposalScope = isScmProposalPath(relPath);

    if (requiresScmProposalScope) {
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as { id?: string; role?: string } | undefined;

      if (!sessionUser?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const allowed = await canWriteScmProposalFiles(sessionUser);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const targetDir = path.join(rootUploadDir, relPath);
    await fs.mkdir(targetDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '')}`;
    const filepath = path.join(targetDir, filename);

    await fs.writeFile(filepath, buffer);

    // Return API URL so that Next.js always goes through our GET handler,
    // which serves the real file bytes with the correct Content-Type.
    return NextResponse.json({ 
      success: true,
      url: `/api/upload/${relPath}/${filename}` 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: "Upload failed",
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

/* ---------------- GET (SERVE FILE) ---------------- */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const relPath = slug.join("/");
    
    if (relPath.includes("..")) {
      return NextResponse.json({ error: "Bad path" }, { status: 400 });
    }
    const requiresScmProposalScope = isScmProposalPath(relPath);

    if (requiresScmProposalScope) {
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as { id?: string; role?: string } | undefined;

      if (!sessionUser?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const allowed = await canReadScmProposalFile(relPath, sessionUser);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const filePath = path.join(rootUploadDir, relPath);
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": guessContentType(ext),
        "Cache-Control": requiresScmProposalScope
          ? "private, no-store"
          : "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json(
      { 
        error: "File not found",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 404 }
    );
  }
}
