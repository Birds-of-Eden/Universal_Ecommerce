import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ReferencePayload = {
  name: string;
  phone: string;
  relation?: string;
  address?: string;
  occupation?: string;
  identityType?: "NID" | "PASSPORT";
  identityNumber: string;
};

type DocumentPayload = {
  type: string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  referenceIndex?: number;
};

function sanitizeEmail(email?: string) {
  if (!email?.trim()) return null;
  return email.trim().toLowerCase();
}

function buildFallbackEmail(phone: string) {
  const safePhone = phone.replace(/[^0-9]/g, "") || Date.now().toString();
  return `deliveryman.${safePhone}.${Date.now()}@local.delivery`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      warehouseId,
      employeeCode,

      fullName,
      phone,
      alternatePhone,
      email,
      dateOfBirth,
      gender,
      presentAddress,
      permanentAddress,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,

      identityType,
      identityNumber,
      passportExpiryDate,

      fatherName,
      fatherIdentityType,
      fatherIdentityNumber,

      motherName,
      motherIdentityType,
      motherIdentityNumber,

      bankName,
      bankAccountName,
      bankAccountNumber,
      bankChequeNumber,

      bondAmount,
      bondSignedAt,
      bondExpiryDate,

      contractSignedAt,
      contractStartDate,
      contractEndDate,
      contractStatus,

      joiningDate,
      status,
      applicationStatus,
      assignedById,
      note,

      references = [],
      documents = [],
    } = body;

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: "warehouseId is required" },
        { status: 400 }
      );
    }

    if (!fullName || !phone || !presentAddress || !permanentAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "fullName, phone, presentAddress, permanentAddress are required",
        },
        { status: 400 }
      );
    }

    if (!identityType || !identityNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "identityType and identityNumber are required",
        },
        { status: 400 }
      );
    }

    if (!fatherName || !motherName) {
      return NextResponse.json(
        {
          success: false,
          message: "fatherName and motherName are required",
        },
        { status: 400 }
      );
    }

    if (!joiningDate) {
      return NextResponse.json(
        { success: false, message: "joiningDate is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(references) || references.length < 2) {
      return NextResponse.json(
        { success: false, message: "At least 2 references are required" },
        { status: 400 }
      );
    }

    const finalEmail = sanitizeEmail(email) || buildFallbackEmail(phone);

    const existingByPhone = await prisma.user.findFirst({
      where: { phone },
    });

    const existingByEmail = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existingByPhone || existingByEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A user already exists with this phone or email. Please use different data or link existing user manually.",
        },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email: finalEmail,
          phone,
          role: "delivery_man",
        },
      });

      const profile = await tx.deliveryManProfile.create({
        data: {
          userId: user.id,
          warehouseId: Number(warehouseId),
          employeeCode: employeeCode || null,

          fullName,
          phone,
          alternatePhone: alternatePhone || null,
          email: email || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,

          presentAddress,
          permanentAddress,

          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          emergencyContactRelation: emergencyContactRelation || null,

          identityType,
          identityNumber,
          passportExpiryDate: passportExpiryDate
            ? new Date(passportExpiryDate)
            : null,

          fatherName,
          fatherIdentityType: fatherIdentityType || null,
          fatherIdentityNumber: fatherIdentityNumber || null,

          motherName,
          motherIdentityType: motherIdentityType || null,
          motherIdentityNumber: motherIdentityNumber || null,

          bankName: bankName || null,
          bankAccountName: bankAccountName || null,
          bankAccountNumber: bankAccountNumber || null,
          bankChequeNumber: bankChequeNumber || null,

          bondAmount: bondAmount ? Number(bondAmount) : null,
          bondSignedAt: bondSignedAt ? new Date(bondSignedAt) : null,
          bondExpiryDate: bondExpiryDate ? new Date(bondExpiryDate) : null,

          contractSignedAt: contractSignedAt ? new Date(contractSignedAt) : null,
          contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
          contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
          contractStatus: contractStatus || null,

          joiningDate: new Date(joiningDate),
          status: status || "PENDING",
          applicationStatus: applicationStatus || "DRAFT",
          assignedById: assignedById || null,
          note: note || null,
        },
      });

      const createdReferences = [];

      for (const ref of references as ReferencePayload[]) {
        const createdRef = await tx.deliveryManReference.create({
          data: {
            deliveryManProfileId: profile.id,
            name: ref.name,
            phone: ref.phone,
            relation: ref.relation || null,
            address: ref.address || null,
            occupation: ref.occupation || null,
            identityType: ref.identityType || "NID",
            identityNumber: ref.identityNumber,
          },
        });

        createdReferences.push(createdRef);
      }

      const refIdMap = createdReferences.map((item) => item.id);

      for (const doc of documents as DocumentPayload[]) {
        await tx.deliveryManDocument.create({
          data: {
            deliveryManProfileId: profile.id,
            referenceId:
              typeof doc.referenceIndex === "number"
                ? refIdMap[doc.referenceIndex] || null
                : null,
            type: doc.type as any,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName || null,
            mimeType: doc.mimeType || null,
            fileSize: doc.fileSize || null,
          },
        });
      }

      return {
        user,
        profile,
        references: createdReferences,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Delivery man user and profile created successfully",
      data: result,
    });
  } catch (error) {
    console.error("DELIVERY_MAN_ENLIST_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}