import { seedScmMasters } from "./masters";
import { seedScmFinanceScenarios } from "./scenario-finance";
import { seedScmProcurementScenarios } from "./scenario-procurement";
import { seedScmReceivingScenarios } from "./scenario-receiving";
import { seedScmReturnScenarios } from "./scenario-returns";
import type { ScmSeedPrisma } from "./types";
import { seedScmUsers } from "./users";

export async function seedScmFoundation(
  prisma: ScmSeedPrisma,
  adminUserId: string | null,
) {
  const userContext = await seedScmUsers(prisma, adminUserId);
  return seedScmMasters(prisma, userContext);
}

export async function seedScmDemo(
  prisma: ScmSeedPrisma,
  adminUserId: string | null,
) {
  const foundationContext = await seedScmFoundation(prisma, adminUserId);
  const procurementContext = await seedScmProcurementScenarios(
    prisma,
    foundationContext,
  );
  const receivingContext = await seedScmReceivingScenarios(
    prisma,
    procurementContext,
  );
  const financeContext = await seedScmFinanceScenarios(
    prisma,
    receivingContext,
  );
  return seedScmReturnScenarios(prisma, financeContext);
}
