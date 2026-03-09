import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- SITE INFO ----------
let SITE_NAME = "ECOMMERCE";
let SITE_WEBSITE = "www.example.com";
let SITE_EMAIL = "support@example.com";
let SITE_PHONE = "+880-XXXXXXXXXX";
let SITE_ADDRESS = "Level 2, House 1A, Road 16/A, Gulshan-1, Dhaka 1212.";

// Fetch site settings from database
async function getSiteSettings() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/site`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    
    if (response.ok) {
      const settings = await response.json();
      return {
        SITE_NAME: settings.siteTitle || SITE_NAME,
        SITE_WEBSITE: settings.siteTitle ? settings.siteTitle.toLowerCase().replace(/\s+/g, '') + '.com' : SITE_WEBSITE,
        SITE_EMAIL: settings.contactEmail || SITE_EMAIL,
        SITE_PHONE: settings.contactNumber || SITE_PHONE,
        SITE_ADDRESS: settings.address || SITE_ADDRESS,
      };
    }
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
  }
  
  return {
    SITE_NAME,
    SITE_WEBSITE,
    SITE_EMAIL,
    SITE_PHONE,
    SITE_ADDRESS,
  };
}

// ---------- COLORS ----------
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const TEXT = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.45, 0.52);
const BORDER = rgb(0.82, 0.84, 0.88);

// table header (black row)
const TABLE_HEAD_BG = BLACK;
const TABLE_HEAD_TXT = WHITE;

const money = (n: any) => Number(n ?? 0).toFixed(2);

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function safeText(v: any, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // ✅ session
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const sessionName = session.user.name || "Customer";
    const sessionEmail = session.user.email || "";

    // ✅ order id -> int
    const { orderId } = await params;
    const id = Number.parseInt(String(orderId), 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    // ✅ order (only owner)
    const order = await db.order.findFirst({
      where: { id, userId },
      select: {
        id: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        payment_method: true,
        grand_total: true,
        total: true,
        currency: true,
        orderItems: {
          select: {
            id: true,
            productId: true,
            price: true,
            quantity: true,
            product: { select: { name: true, sku: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ✅ phone from user profile (session usually doesn't include phone)
    const userProfile = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const sessionPhone = userProfile?.phone || "—";

    const currency = order.currency || "BDT";
    const invoiceId = `INV${String(order.id).padStart(9, "0")}`;
    const orderDate = formatDate(new Date(order.createdAt));
    const orderRef = String(order.id);

    const items = order.orderItems ?? [];
    const subTotal = items.reduce(
      (s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 1),
      0
    );
    const grand = Number(order.grand_total ?? order.total ?? subTotal);
    const delivery = Math.max(grand - subTotal, 0);

    // ✅ Get site settings from database
    const siteSettings = await getSiteSettings();
    SITE_NAME = siteSettings.SITE_NAME;
    SITE_WEBSITE = siteSettings.SITE_WEBSITE;
    SITE_EMAIL = siteSettings.SITE_EMAIL;
    SITE_PHONE = siteSettings.SITE_PHONE;
    SITE_ADDRESS = siteSettings.SITE_ADDRESS;

    // ---------- PDF ----------
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // A4
    const W = 595.28;
    const H = 841.89;
    const marginX = 38;

    const page = pdf.addPage([W, H]);

    const text = (
      t: string,
      x: number,
      y: number,
      size = 10,
      b = false,
      color = TEXT
    ) => {
      page.drawText(t, { x, y, size, font: b ? bold : font, color });
    };

    const centerText = (t: string, centerX: number, y: number, size = 12, b = false) => {
      const f = b ? bold : font;
      const w = f.widthOfTextAtSize(t, size);
      page.drawText(t, { x: centerX - w / 2, y, size, font: f, color: TEXT });
    };

    const rightText = (
      t: string,
      rightX: number,
      y: number,
      size = 10,
      b = false,
      color = TEXT
    ) => {
      const f = b ? bold : font;
      const w = f.widthOfTextAtSize(t, size);
      page.drawText(t, { x: rightX - w, y, size, font: f, color });
    };

    const rect = (
      x: number,
      y: number,
      w: number,
      h: number,
      fill: any,
      border = false
    ) => {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: fill,
        borderColor: border ? BORDER : undefined,
        borderWidth: border ? 1 : 0,
      });
    };

    const line = (x1: number, y1: number, x2: number, y2: number) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 1,
        color: BORDER,
      });
    };

    // ========= TOP HEADER (WHITE, CENTERED TEXT) =========
    const headerH = 70;
    rect(0, H - headerH, W, headerH, WHITE);

    centerText(SITE_NAME, W / 2, H - 30, 18, true);
    centerText(SITE_WEBSITE, W / 2, H - 48, 10, false);

    let y = H - headerH - 18;

    // ========= COMPANY LEFT + META RIGHT =========
    text(`${SITE_NAME} Limited`, marginX, y, 11, true);
    y -= 14;

    const addrLines = [SITE_ADDRESS, SITE_EMAIL, SITE_PHONE].filter(Boolean) as string[];
    for (const l of addrLines) {
      text(l, marginX, y, 9.5, false, MUTED);
      y -= 12;
    }

    const metaRight = W - marginX;
    let my = H - headerH - 18;

    rightText(`Invoice ID : ${invoiceId}`, metaRight, my, 10, true);
    my -= 14;
    rightText(`Order ID : ${orderRef}`, metaRight, my, 10, true);
    my -= 14;
    rightText(`Order Date : ${orderDate}`, metaRight, my, 10, true);
    my -= 14;
    rightText(`Payment Mode : ${safeText(order.payment_method, "Online")}`, metaRight, my, 10, true);

    let cursor = Math.min(y, my) - 18;

    // helpers
    const tableW = W - marginX * 2;
    const headH = 22;
    const rowH = 22;

    const drawTableHead = (titleCols: Array<{ label: string; x: number }>) => {
      rect(marginX, cursor - headH, tableW, headH, TABLE_HEAD_BG, true);
      for (const c of titleCols) {
        page.drawText(c.label, {
          x: c.x,
          y: cursor - 15,
          size: 9.5,
          font: bold,
          color: TABLE_HEAD_TXT,
        });
      }
      cursor -= headH;
    };

    // ========= CUSTOMER DETAILS =========
    text("Customer Details", marginX, cursor, 11, true);
    cursor -= 14;

    const col1 = marginX + 10;
    const col2 = marginX + tableW * 0.36;
    const col3 = marginX + tableW * 0.72;

    drawTableHead([
      { label: "Name", x: col1 },
      { label: "Email Address", x: col2 },
      { label: "Contact Number", x: col3 },
    ]);

    rect(marginX, cursor - rowH, tableW, rowH, WHITE, true);
    text(safeText(sessionName), col1, cursor - 15, 9.5);
    text(safeText(sessionEmail), col2, cursor - 15, 9.5);
    text(safeText(sessionPhone), col3, cursor - 15, 9.5);
    cursor -= rowH + 18;

    // ========= ITEM DETAILS =========
    text("Item Details", marginX, cursor, 11, true);
    cursor -= 14;

    drawTableHead([
      { label: "Item", x: col1 },
      { label: "Details", x: col2 },
    ]);

    const itemBoxH = 70;
    rect(marginX, cursor - itemBoxH, tableW, itemBoxH, WHITE, true);

    const firstItem = items[0];
    const itemName =
      firstItem?.product?.name
        ? safeText(firstItem.product.name)
        : items.length > 1
        ? `${items.length} Items`
        : `Product #${safeText(firstItem?.productId)}`;

    text(itemName, col1, cursor - 18, 9.5);

    const qtyTotal = items.reduce((s, i) => s + Number(i.quantity ?? 1), 0);
    const detLines: string[] = [
      `Qty: ${qtyTotal}`,
      `Order Status: ${safeText(order.status)}`,
      `Payment Status: ${safeText(order.paymentStatus)}`,
    ];

    let dy = cursor - 18;
    for (const l of detLines) {
      text(l, col2, dy, 9.3, false, MUTED);
      dy -= 12;
    }

    cursor -= itemBoxH + 18;

    // ========= PAYMENT SUMMARY =========
    text("Payment Summary", marginX, cursor, 11, true);
    cursor -= 14;

    drawTableHead([
      { label: "Particular", x: col1 },
      { label: `Amount(${currency})`, x: marginX + tableW - 110 },
    ]);

    const payRowH = 20;
    const summaryRows: Array<{ label: string; value: number }> = [
      { label: `Total Base Amount (${items.length || 1} Items)`, value: subTotal },
      { label: "Delivery Charge", value: delivery },
      { label: "Tax", value: 0 },
      { label: "Add-ons", value: 0 },
      { label: "Convenience Charge", value: 0 },
    ];

    for (const r of summaryRows) {
      rect(marginX, cursor - payRowH, tableW, payRowH, WHITE, true);
      text(r.label, col1, cursor - 14, 9.2, false, MUTED);
      rightText(money(r.value), marginX + tableW - 10, cursor - 14, 9.2, false, TEXT);
      cursor -= payRowH;
    }

    // Subtotal
    rect(marginX, cursor - payRowH, tableW, payRowH, WHITE, true);
    text("Subtotal", col1, cursor - 14, 9.2, true);
    rightText(money(subTotal + delivery), marginX + tableW - 10, cursor - 14, 9.2, true);
    cursor -= payRowH;

    line(marginX, cursor - 3, marginX + tableW, cursor - 3);
    cursor -= 10;

    // Total Payment
    rect(marginX, cursor - payRowH, tableW, payRowH, WHITE, true);
    text("Total Payment", col1, cursor - 14, 10, true);
    rightText(money(grand), marginX + tableW - 10, cursor - 14, 10, true);

    // Footer
    const footerY = 40;
    line(marginX, footerY + 20, W - marginX, footerY + 20);
    text(`Generated by ${SITE_NAME} • ${SITE_EMAIL}`, marginX, footerY + 8, 9, false, MUTED);

    const pdfBytes = await pdf.save();

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${SITE_NAME}-Invoice-${order.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Invoice PDF error:", err);
    return NextResponse.json(
      { error: "Failed to generate invoice", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}