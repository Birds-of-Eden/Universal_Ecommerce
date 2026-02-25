import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rootUploadDir = path.join(process.cwd(), "public", "upload");

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

/* ---------------- POST (UPLOAD) ---------------- */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // Get params (must be awaited in Next 15 dynamic routes)
    const { slug } = await params;
    const relPath = slug.join("/");

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
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const relPath = slug.join("/");
    
    if (relPath.includes("..")) {
      return NextResponse.json({ error: "Bad path" }, { status: 400 });
    }

    const filePath = path.join(rootUploadDir, relPath);
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": guessContentType(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
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
