import type { PrismaClient } from "../../../generated/prisma";

export type ScmSeedUserRef = {
  id: string;
  email: string;
  name: string;
  roleName: string;
};

export type ScmSeedWarehouseRef = {
  id: number;
  code: string;
  name: string;
  primaryBinId: number | null;
};

export type ScmSeedSupplierRef = {
  id: number;
  code: string;
  name: string;
};

export type ScmSeedVariantRef = {
  id: number;
  sku: string;
  productId: number;
  productName: string;
};

export type ScmSeedContext = {
  adminUserId: string | null;
  users: Record<string, ScmSeedUserRef>;
  warehouses: Record<string, ScmSeedWarehouseRef>;
  suppliers: Record<string, ScmSeedSupplierRef>;
  variants: Record<string, ScmSeedVariantRef>;
};

export type ScmSeedPrisma = PrismaClient;
