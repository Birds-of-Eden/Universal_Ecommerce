import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensurePayrollAccess,
  toOptionalDate,
  toOptionalInt,
  toOptionalString,
  toRequiredDecimal,
} from "../../_lib";

const db = prisma as any;

interface RouteParams {
  params: Promise<{ entity: string; id: string }>;
}

function computeNetAmount(
  basicAmount: unknown,
  overtimeAmount: unknown,
  bonusAmount: unknown,
  deductionAmount: unknown,
  netAmount?: unknown,
) {
  if (netAmount !== undefined && netAmount !== null && netAmount !== "") {
    return toRequiredDecimal(netAmount, "netAmount");
  }

  const basic = Number(basicAmount || 0);
  const overtime = Number(overtimeAmount || 0);
  const bonus = Number(bonusAmount || 0);
  const deduction = Number(deductionAmount || 0);
  return toRequiredDecimal(basic + overtime + bonus - deduction, "netAmount");
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await ensurePayrollAccess();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { entity, id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid payroll id" }, { status: 400 });
    }

    const body = await request.json();

    if (entity === "profile") {
      const data: any = {};
      if (body.userId !== undefined) data.userId = String(body.userId);
      if (body.warehouseId !== undefined) data.warehouseId = toOptionalInt(body.warehouseId, "warehouseId");
      if (body.employeeCode !== undefined) data.employeeCode = toOptionalString(body.employeeCode);
      if (body.paymentType !== undefined) data.paymentType = toOptionalString(body.paymentType) || "MONTHLY";
      if (body.baseSalary !== undefined) data.baseSalary = toRequiredDecimal(body.baseSalary, "baseSalary");
      if (body.bankName !== undefined) data.bankName = toOptionalString(body.bankName);
      if (body.bankAccountNo !== undefined) data.bankAccountNo = toOptionalString(body.bankAccountNo);
      if (body.accountHolder !== undefined) data.accountHolder = toOptionalString(body.accountHolder);
      if (body.mobileBankingNo !== undefined) data.mobileBankingNo = toOptionalString(body.mobileBankingNo);
      if (body.paymentMethod !== undefined) data.paymentMethod = toOptionalString(body.paymentMethod);
      if (body.joiningDate !== undefined) data.joiningDate = toOptionalDate(body.joiningDate, "joiningDate");
      if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
      if (body.notes !== undefined) data.notes = toOptionalString(body.notes);

      const updated = await db.payrollProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          warehouse: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    if (entity === "period") {
      const data: any = {};
      if (body.name !== undefined) data.name = String(body.name || "").trim();
      if (body.startDate !== undefined) data.startDate = toOptionalDate(body.startDate, "startDate");
      if (body.endDate !== undefined) data.endDate = toOptionalDate(body.endDate, "endDate");
      if (body.status !== undefined) data.status = toOptionalString(body.status) || "OPEN";
      if (body.notes !== undefined) data.notes = toOptionalString(body.notes);

      if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return NextResponse.json(
          { error: "endDate must be greater than or equal to startDate" },
          { status: 400 },
        );
      }

      const updated = await db.payrollPeriod.update({
        where: { id },
        data,
      });

      return NextResponse.json(updated);
    }

    if (entity === "entry") {
      const current = await db.payrollEntry.findUnique({
        where: { id },
        select: {
          basicAmount: true,
          overtimeAmount: true,
          bonusAmount: true,
          deductionAmount: true,
        },
      });
      if (!current) {
        return NextResponse.json({ error: "Payroll entry not found" }, { status: 404 });
      }

      const basicAmount = body.basicAmount ?? current.basicAmount;
      const overtimeAmount = body.overtimeAmount ?? current.overtimeAmount;
      const bonusAmount = body.bonusAmount ?? current.bonusAmount;
      const deductionAmount = body.deductionAmount ?? current.deductionAmount;

      const data: any = {};
      if (body.payrollPeriodId !== undefined) {
        data.payrollPeriodId = toOptionalInt(body.payrollPeriodId, "payrollPeriodId");
      }
      if (body.payrollProfileId !== undefined) {
        data.payrollProfileId = toOptionalInt(body.payrollProfileId, "payrollProfileId");
      }
      if (body.userId !== undefined) data.userId = String(body.userId);
      if (body.warehouseId !== undefined) data.warehouseId = toOptionalInt(body.warehouseId, "warehouseId");
      if (body.basicAmount !== undefined) data.basicAmount = toRequiredDecimal(body.basicAmount, "basicAmount");
      if (body.overtimeAmount !== undefined) {
        data.overtimeAmount = toRequiredDecimal(body.overtimeAmount, "overtimeAmount");
      }
      if (body.bonusAmount !== undefined) data.bonusAmount = toRequiredDecimal(body.bonusAmount, "bonusAmount");
      if (body.deductionAmount !== undefined) {
        data.deductionAmount = toRequiredDecimal(body.deductionAmount, "deductionAmount");
      }
      data.netAmount = computeNetAmount(
        basicAmount,
        overtimeAmount,
        bonusAmount,
        deductionAmount,
        body.netAmount,
      );
      if (body.paymentStatus !== undefined) {
        data.paymentStatus = toOptionalString(body.paymentStatus) || "PENDING";
      }
      if (body.paidAt !== undefined) data.paidAt = toOptionalDate(body.paidAt, "paidAt");
      if (body.note !== undefined) data.note = toOptionalString(body.note);

      const updated = await db.payrollEntry.update({
        where: { id },
        data,
        include: {
          payrollPeriod: true,
          warehouse: {
            select: { id: true, name: true, code: true },
          },
          payrollProfile: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unsupported payroll entity" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH PAYROLL ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update payroll data" },
      { status: 500 },
    );
  }
}
