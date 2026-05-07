import type { PrismaClient } from "../../../../generated/prisma";
import { COUPON_MANAGEMENT_SEED_DATA } from "./constants";

export async function seedCouponManagementDemo(prisma: PrismaClient) {
  for (const coupon of COUPON_MANAGEMENT_SEED_DATA) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        isValid: coupon.isValid,
        expiresAt: coupon.expiresAt,
      },
      create: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        isValid: coupon.isValid,
        expiresAt: coupon.expiresAt,
      },
    });
  }

  console.log("✅ Coupon management seed ensured");
}
