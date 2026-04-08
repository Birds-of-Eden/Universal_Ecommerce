import type { AccessContext } from "@/lib/rbac";
import { getAccessContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id?: string;
  role?: string;
} | null | undefined;

export const INVESTOR_PORTAL_PERMISSION = "investor.portal.access" as const;

export type InvestorPortalContext = {
  access: AccessContext;
  investorPortalAccessId: string;
  investorId: number;
  investorCode: string;
  investorName: string;
  userId: string;
};

export type InvestorPortalResolution =
  | { ok: true; context: InvestorPortalContext }
  | { ok: false; status: 401 | 403; error: string; access: AccessContext };

export async function resolveInvestorPortalContext(
  sessionUser: SessionUser,
): Promise<InvestorPortalResolution> {
  const access = await getAccessContext(
    sessionUser as { id?: string; role?: string } | undefined,
  );

  if (!access.userId) {
    return { ok: false, status: 401, error: "Unauthorized", access };
  }

  if (!access.has(INVESTOR_PORTAL_PERMISSION)) {
    return {
      ok: false,
      status: 403,
      error: "Investor portal permission is missing for this account.",
      access,
    };
  }

  const portalAccess = await prisma.investorPortalAccess.findFirst({
    where: {
      userId: access.userId,
      status: "ACTIVE",
      investor: { status: "ACTIVE" },
    },
    select: {
      id: true,
      investor: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!portalAccess) {
    return {
      ok: false,
      status: 403,
      error:
        "Investor portal is not configured for this user. Ask an administrator to assign investor portal access.",
      access,
    };
  }

  return {
    ok: true,
    context: {
      access,
      investorPortalAccessId: portalAccess.id,
      investorId: portalAccess.investor.id,
      investorCode: portalAccess.investor.code,
      investorName: portalAccess.investor.name,
      userId: access.userId,
    },
  };
}
