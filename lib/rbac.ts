import { prisma } from "@/lib/prisma";
import {
  ADMIN_PANEL_ACCESS_FALLBACK_PERMISSIONS,
  getAllPermissionKeys,
  isPermissionKey,
  LEGACY_ROLE_FALLBACKS,
  type PermissionKey,
} from "@/lib/rbac-config";

type SessionUser = {
  id?: string;
  role?: string;
} | null | undefined;

export type AccessContext = {
  userId: string | null;
  legacyRole: string | null;
  roleNames: string[];
  permissions: PermissionKey[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  has: (permission: PermissionKey) => boolean;
  hasAny: (permissions: PermissionKey[]) => boolean;
};

function normalizeRoleName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getLegacyFallbackPermissions(legacyRole: string | null): PermissionKey[] {
  if (!legacyRole) return [];
  const normalized = legacyRole.toLowerCase();
  const direct = LEGACY_ROLE_FALLBACKS[normalized];
  return direct ? [...direct] : [];
}

function dedupePermissions(rawKeys: string[]): PermissionKey[] {
  const unique = new Set<PermissionKey>();
  for (const raw of rawKeys) {
    if (isPermissionKey(raw)) {
      unique.add(raw);
    }
  }
  return [...unique];
}

function ensureAdminPanelAccessFallback(permissionKeys: PermissionKey[]): PermissionKey[] {
  if (permissionKeys.includes("admin.panel.access")) {
    return permissionKeys;
  }

  const hasAdminScopedPermission = ADMIN_PANEL_ACCESS_FALLBACK_PERMISSIONS.some((permission) =>
    permissionKeys.includes(permission),
  );

  if (!hasAdminScopedPermission) {
    return permissionKeys;
  }

  return [...permissionKeys, "admin.panel.access"];
}

export async function getUserPermissionKeys(userId: string): Promise<PermissionKey[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userRoles: {
        where: { role: { deletedAt: null } },
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  const roleNames = user.userRoles.map((item) => item.role.name.toLowerCase());
  if (roleNames.includes("superadmin")) {
    return getAllPermissionKeys();
  }

  const keysFromAssignedRoles = user.userRoles.flatMap((item) =>
    item.role.rolePermissions.map((rp) => rp.permission.key),
  );

  if (keysFromAssignedRoles.length > 0) {
    return ensureAdminPanelAccessFallback(dedupePermissions(keysFromAssignedRoles));
  }

  const legacyRole = normalizeRoleName(user.role);
  return ensureAdminPanelAccessFallback(
    dedupePermissions(getLegacyFallbackPermissions(legacyRole)),
  );
}

export async function getAccessContext(sessionUser: SessionUser): Promise<AccessContext> {
  const userId = typeof sessionUser?.id === "string" ? sessionUser.id : null;
  const legacyRole = normalizeRoleName(sessionUser?.role);

  if (!userId) {
    return {
      userId: null,
      legacyRole,
      roleNames: [],
      permissions: [],
      isAuthenticated: false,
      isSuperAdmin: false,
      has: () => false,
      hasAny: () => false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userRoles: {
        where: { role: { deletedAt: null } },
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const dbLegacyRole = normalizeRoleName(user?.role);
  const effectiveLegacyRole = dbLegacyRole ?? legacyRole;
  const roleNames = user?.userRoles.map((item) => item.role.name.toLowerCase()) ?? [];
  const isSuperAdmin = roleNames.includes("superadmin");

  const dbPermissionKeys =
    user?.userRoles.flatMap((item) =>
      item.role.rolePermissions.map((rp) => rp.permission.key),
    ) ?? [];

  const fallbackKeys =
    dbPermissionKeys.length === 0
      ? getLegacyFallbackPermissions(effectiveLegacyRole)
      : [];

  const permissions = dedupePermissions(
    isSuperAdmin ? getAllPermissionKeys() : [...dbPermissionKeys, ...fallbackKeys],
  );
  const effectivePermissions = ensureAdminPanelAccessFallback(permissions);
  const permissionSet = new Set<PermissionKey>(effectivePermissions);

  return {
    userId,
    legacyRole: effectiveLegacyRole,
    roleNames,
    permissions: effectivePermissions,
    isAuthenticated: true,
    isSuperAdmin,
    has: (permission) => permissionSet.has(permission),
    hasAny: (required) => required.some((permission) => permissionSet.has(permission)),
  };
}

export function hasPermissionKey(
  permissionKeys: string[] | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!Array.isArray(permissionKeys)) return false;
  return permissionKeys.includes(permission);
}
