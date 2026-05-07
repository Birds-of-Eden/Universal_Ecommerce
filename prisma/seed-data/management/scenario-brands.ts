import { MANAGEMENT_BRANDS } from "./constants";
import type { ManagementSeedContext, TxClient } from "./types";

export async function seedManagementBrands(
  prisma: TxClient,
  ctx: ManagementSeedContext,
): Promise<ManagementSeedContext> {
  for (const item of MANAGEMENT_BRANDS) {
    const record = await prisma.brand.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        logo: item.logo,
        deleted: false,
      },
      create: {
        name: item.name,
        slug: item.slug,
        logo: item.logo,
        deleted: false,
      },
      select: { id: true },
    });

    ctx.brands[item.key] = record.id;
  }

  return ctx;
}
