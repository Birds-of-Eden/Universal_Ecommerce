import { seedScmMasters } from "./masters";
import type { ScmSeedPrisma } from "./types";
import { seedScmUsers } from "./users";

export async function seedScmFoundation(
  prisma: ScmSeedPrisma,
  adminUserId: string | null,
) {
  const userContext = await seedScmUsers(prisma, adminUserId);
  return seedScmMasters(prisma, userContext);
}
