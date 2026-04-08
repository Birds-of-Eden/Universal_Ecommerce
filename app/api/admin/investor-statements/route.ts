import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";

function canReadInvestorStatement(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return (
    access.hasGlobal("investor_statement.read") ||
    access.hasGlobal("investor_payout.read") ||
    access.hasGlobal("investor_payout.manage") ||
    access.hasGlobal("investor_payout.approve") ||
    access.hasGlobal("investor_payout.pay") ||
    access.hasGlobal("investor_payout.void") ||
    access.hasGlobal("investor_profit.read") ||
    access.hasGlobal("investor_profit.manage")
  );
}

function toDecimal(value: Prisma.Decimal | null | undefined) {
  return value ?? new Prisma.Decimal(0);
}

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toCsv(rows: string[][]) {
  const escaped = rows.map((row) =>
    row
      .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return escaped.join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canReadInvestorStatement(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const investorId = Number(request.nextUrl.searchParams.get("investorId") || "");
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const from = parseDate(request.nextUrl.searchParams.get("from"), defaultFrom);
    const to = parseDate(request.nextUrl.searchParams.get("to"), now);
    const format = (request.nextUrl.searchParams.get("format") || "json").toLowerCase();

    const whereInvestor = Number.isInteger(investorId) && investorId > 0 ? { id: investorId } : {};
    const investors = await prisma.investor.findMany({
      where: whereInvestor,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
      take: 300,
    });

    if (investors.length === 0) {
      return NextResponse.json({ investors: [], from: from.toISOString(), to: to.toISOString() });
    }

    const investorIds = investors.map((item) => item.id);
    const [transactions, payouts] = await Promise.all([
      prisma.investorCapitalTransaction.findMany({
        where: {
          investorId: { in: investorIds },
          transactionDate: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          investorId: true,
          direction: true,
          type: true,
          amount: true,
          transactionDate: true,
        },
        orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      }),
      prisma.investorProfitPayout.findMany({
        where: {
          investorId: { in: investorIds },
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          investorId: true,
          payoutNumber: true,
          status: true,
          payoutAmount: true,
          paidAt: true,
          createdAt: true,
          paymentMethod: true,
          bankReference: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    const result = investors.map((investor) => {
      const txRows = transactions.filter((item) => item.investorId === investor.id);
      const payoutRows = payouts.filter((item) => item.investorId === investor.id);

      const credit = txRows
        .filter((item) => item.direction === "CREDIT")
        .reduce((sum, item) => sum.plus(toDecimal(item.amount)), new Prisma.Decimal(0));
      const debit = txRows
        .filter((item) => item.direction === "DEBIT")
        .reduce((sum, item) => sum.plus(toDecimal(item.amount)), new Prisma.Decimal(0));
      const net = credit.minus(debit);

      return {
        investor,
        totals: {
          credit: credit.toString(),
          debit: debit.toString(),
          net: net.toString(),
        },
        transactions: txRows.map((item) => ({
          ...item,
          amount: item.amount.toString(),
          transactionDate: item.transactionDate.toISOString(),
        })),
        payouts: payoutRows.map((item) => ({
          ...item,
          payoutAmount: item.payoutAmount.toString(),
          paidAt: item.paidAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        })),
      };
    });

    if (format === "csv") {
      const rows: string[][] = [[
        "Investor Code",
        "Investor Name",
        "Status",
        "Total Credit",
        "Total Debit",
        "Net",
        "Payout Count",
      ]];
      for (const row of result) {
        rows.push([
          row.investor.code,
          row.investor.name,
          row.investor.status,
          row.totals.credit,
          row.totals.debit,
          row.totals.net,
          String(row.payouts.length),
        ]);
      }
      const csv = toCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=investor-statement-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv`,
        },
      });
    }

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      statements: result,
    });
  } catch (error) {
    console.error("ADMIN INVESTOR STATEMENTS GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load investor statements." }, { status: 500 });
  }
}
