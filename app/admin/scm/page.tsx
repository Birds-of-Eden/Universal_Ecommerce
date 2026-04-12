"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRightLeft,
  BookOpen,
  ClipboardList,
  Clock3,
  FileSearch,
  GitCompareArrows,
  RotateCcw,
  PackageCheck,
  PackagePlus,
  Radar,
  Scale,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScmCard = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
  globalPermission?: string;
};

const cards: ScmCard[] = [
  {
    title: "Suppliers",
    href: "/admin/scm/suppliers",
    description: "Maintain approved vendors, contacts, and lead times.",
    icon: BookOpen,
    permission: "suppliers.read",
    globalPermission: "suppliers.manage",
  },
  {
    title: "Supplier Portal Access",
    href: "/admin/scm/supplier-portal-access",
    description:
      "Map supplier users to a single supplier scope for external portal access.",
    icon: UserCheck,
    permission: "suppliers.manage",
    globalPermission: "suppliers.manage",
  },
  {
    title: "Vendor Approvals",
    href: "/admin/scm/vendor-approvals",
    description:
      "Review supplier profile/document update requests and apply maker-checker approval.",
    icon: ShieldCheck,
    permissions: ["supplier.profile_requests.read", "supplier.profile_requests.review"],
  },
  {
    title: "Vendor Feedback",
    href: "/admin/scm/vendor-feedback",
    description:
      "Capture and monitor vendor service-quality feedback with client/internal scoring.",
    icon: UserCheck,
    permission: "supplier.feedback.manage",
    globalPermission: "supplier.feedback.manage",
  },
  {
    title: "Supplier Intelligence",
    href: "/admin/scm/supplier-intelligence",
    description: "Track actual lead-time trends, late-order risk, and recommended supplier buffers.",
    icon: Clock3,
    permission: "supplier_performance.read",
    globalPermission: "supplier_performance.read",
  },
  {
    title: "SLA Policies",
    href: "/admin/scm/sla",
    description: "Define supplier SLA targets and evaluate breach trends by policy window.",
    icon: ShieldCheck,
    permission: "sla.read",
    globalPermission: "sla.read",
  },
  {
    title: "Purchase Requisitions",
    href: "/admin/scm/purchase-requisitions",
    description: "Capture internal purchase demand and route it for procurement approval.",
    icon: ClipboardList,
    permission: "purchase_requisitions.read",
  },
  {
    title: "RFQs",
    href: "/admin/scm/rfqs",
    description: "Invite suppliers, compare quotations, and award procurement opportunities.",
    icon: FileSearch,
    permission: "rfq.read",
  },
  {
    title: "Comparative Statements",
    href: "/admin/scm/comparative-statements",
    description:
      "Auto-generate CS from financial proposals, capture technical scorecards, and run multi-stage approvals.",
    icon: Scale,
    permissions: [
      "comparative_statements.read",
      "comparative_statements.manage",
      "comparative_statements.approve_manager",
      "comparative_statements.approve_committee",
      "comparative_statements.approve_final",
    ],
  },
  {
    title: "Purchase Orders",
    href: "/admin/scm/purchase-orders",
    description: "Create, submit, and approve purchase orders per warehouse.",
    icon: ShoppingCart,
    permissions: [
      "purchase_orders.read",
      "purchase_orders.manage",
      "purchase_orders.approve",
      "purchase_orders.approve_manager",
      "purchase_orders.approve_committee",
      "purchase_orders.approve_final",
    ],
  },
  {
    title: "Goods Receipts",
    href: "/admin/scm/goods-receipts",
    description: "Post inbound stock against approved purchase orders.",
    icon: PackageCheck,
    permission: "goods_receipts.read",
  },
  {
    title: "Landed Costs",
    href: "/admin/scm/landed-costs",
    description: "Allocate freight, customs, and handling cost to purchase order unit economics before receipt.",
    icon: PackagePlus,
    permission: "landed_costs.read",
    permissions: ["landed_costs.read", "landed_costs.manage"],
  },
  {
    title: "Supplier Returns",
    href: "/admin/scm/supplier-returns",
    description: "Control vendor returns, stock deduction, and credit-note closure from received goods.",
    icon: RotateCcw,
    permission: "supplier_returns.read",
  },
  {
    title: "Replenishment",
    href: "/admin/scm/replenishment",
    description: "Manage warehouse reorder rules and turn shortage signals into requisitions.",
    icon: Radar,
    permission: "replenishment.read",
  },
  {
    title: "Warehouse Transfers",
    href: "/admin/scm/warehouse-transfers",
    description: "Approve, dispatch, and receive internal stock movement between warehouses.",
    icon: ArrowRightLeft,
    permission: "warehouse_transfers.read",
  },
  {
    title: "Supplier Ledger",
    href: "/admin/scm/supplier-ledger",
    description: "Track payable balances, supplier invoices, and supplier payments.",
    icon: BookOpen,
    permission: "supplier_ledger.read",
    globalPermission: "supplier_ledger.read",
  },
  {
    title: "3-Way Match",
    href: "/admin/scm/three-way-match",
    description: "Review PO, goods receipt, and supplier invoice variances before payment release.",
    icon: GitCompareArrows,
    permission: "three_way_match.read",
    globalPermission: "three_way_match.read",
  },
];

export default function ScmHomePage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const globalPermissions = Array.isArray((session?.user as any)?.globalPermissions)
    ? ((session?.user as any).globalPermissions as string[])
    : [];

  const visibleCards = useMemo(() => {
    return cards.filter((card) => {
      const permissionCandidates =
        card.permissions && card.permissions.length > 0
          ? card.permissions
          : card.permission
            ? [card.permission]
            : [];
      const hasPermission = permissionCandidates.some((permission) =>
        permissions.includes(permission),
      );
      const hasGlobalPermission = card.globalPermission
        ? globalPermissions.includes(card.globalPermission)
        : true;
      return hasPermission && hasGlobalPermission;
    });
  }, [globalPermissions, permissions]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Supply Chain Management</h1>
        <p className="text-sm text-muted-foreground">
          Phase 1 foundation for supplier, purchasing, and goods receipt operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {visibleCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <card.icon className="h-5 w-5" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {card.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
