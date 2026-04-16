"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowRightLeft,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  MapPin,
  Bell,
  Clock3,
  FileText,
  FileSearch,
  GitCompareArrows,
  RotateCcw,
  PackageCheck,
  PackagePlus,
  Radar,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Boxes,
  UserCheck,
  BarChart3,
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
    title: "SCM Dashboard",
    href: "/admin/scm/dashboard",
    description:
      "Unified procurement, vendor, warehouse, payment, audit, project, and budget reporting workspace.",
    icon: BarChart3,
    permissions: [
      "dashboard.read",
      "purchase_requisitions.read",
      "rfq.read",
      "comparative_statements.read",
      "purchase_orders.read",
      "goods_receipts.read",
      "payment_requests.read",
      "payment_reports.read",
      "stock_reports.read",
      "supplier_performance.read",
      "supplier.feedback.manage",
      "sla.read",
      "supplier_ledger.read",
      "three_way_match.read",
    ],
  },
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
    permissions: [
      "goods_receipts.read",
      "goods_receipts.manage",
      "purchase_orders.manage",
      "purchase_requisitions.manage",
      "supplier.feedback.manage",
    ],
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
    title: "Payment Requests (PRF)",
    href: "/admin/scm/payment-requests",
    description:
      "Initiate and route payment requests linked to PO, GRN, CS, and supplier invoices.",
    icon: FileText,
    permissions: [
      "payment_requests.read",
      "payment_requests.manage",
      "payment_requests.approve_admin",
      "payment_requests.approve_finance",
      "payment_requests.treasury",
    ],
  },
  {
    title: "Payment Reports",
    href: "/admin/scm/payment-reports",
    description:
      "Review vendor-wise payment activity, invoice references, and treasury settlement totals.",
    icon: BarChart3,
    permissions: [
      "payment_reports.read",
      "supplier_payments.read",
      "supplier_payments.manage",
    ],
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
    title: "Material Requests",
    href: "/admin/scm/material-requests",
    description:
      "Run store-side material requisition flow from requester submission to manager-admin approval.",
    icon: ClipboardList,
    permissions: [
      "material_requests.read",
      "material_requests.manage",
      "material_requests.endorse_supervisor",
      "material_requests.endorse_project_manager",
      "material_requests.approve_admin",
    ],
  },
  {
    title: "Material Releases",
    href: "/admin/scm/material-releases",
    description:
      "Issue release notes with challan/waybill and post stock-out with asset tagging.",
    icon: Boxes,
    permissions: ["material_releases.read", "material_releases.manage"],
  },
  {
    title: "Material Release Report",
    href: "/admin/scm/material-releases/report",
    description:
      "Review release register, challan/waybill references, and export release report snapshots.",
    icon: FileText,
    permissions: ["material_releases.read", "material_releases.manage"],
  },
  {
    title: "Warehouse Locations",
    href: "/admin/scm/warehouse-locations",
    description:
      "Configure zones, aisles, and bins for facility-level stock tracking.",
    icon: MapPin,
    permissions: ["warehouse_locations.read", "warehouse_locations.manage"],
  },
  {
    title: "Reorder Alerts",
    href: "/admin/scm/reorder-alerts",
    description:
      "Monitor low stock alerts and manage replenishment notifications.",
    icon: Bell,
    permissions: ["stock_alerts.read", "stock_alerts.manage"],
  },
  {
    title: "Physical Verifications",
    href: "/admin/scm/physical-verifications",
    description:
      "Run monthly/quarterly/annual physical verification cycles and approvals.",
    icon: ClipboardCheck,
    permissions: [
      "physical_verifications.read",
      "physical_verifications.manage",
      "physical_verifications.approve",
    ],
  },
  {
    title: "Stock Reports",
    href: "/admin/scm/stock-reports",
    description:
      "Daily stock, aging analysis, and monthly warehouse summary reporting.",
    icon: BarChart3,
    permissions: ["stock_reports.read", "inventory.manage"],
  },
  {
    title: "Stock Cards",
    href: "/admin/scm/stock-cards",
    description:
      "Track warehouse item movement history with opening, movement, and closing balance view.",
    icon: Radar,
    permissions: [
      "inventory.manage",
      "material_releases.read",
      "material_releases.manage",
      "material_requests.approve_admin",
    ],
  },
  {
    title: "Asset Lifecycle",
    href: "/admin/scm/assets",
    description:
      "Manage fixed-asset tags generated from material releases and control lifecycle states.",
    icon: PackageCheck,
    permissions: ["asset_register.read", "asset_register.manage"],
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
