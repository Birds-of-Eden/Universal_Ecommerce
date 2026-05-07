import type { PrismaClient } from "../../../../generated/prisma";
import { seedCouponManagementDemo } from "./scenario-coupons";

export async function seedManagementCoupons(prisma: PrismaClient) {
  await seedCouponManagementDemo(prisma);
}
