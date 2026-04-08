"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  TrendingUp,
  HandCoins,
  FileText,
  LogOut,
} from "lucide-react";

type InvestorNavProps = {
  investorName: string;
  investorCode: string;
};

const navItems = [
  { href: "/investor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investor/ledger", label: "Ledger", icon: Wallet },
  { href: "/investor/allocations", label: "Allocations", icon: PieChart },
  { href: "/investor/profit-runs", label: "Profit Runs", icon: TrendingUp },
  { href: "/investor/payouts", label: "Payouts", icon: HandCoins },
  { href: "/investor/statements", label: "Statements", icon: FileText },
];

export default function InvestorNav({ investorName, investorCode }: InvestorNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-72 border-r border-border bg-card/70 backdrop-blur">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Investor Portal</p>
          <h2 className="mt-1 text-lg font-semibold">{investorName}</h2>
          <p className="text-sm text-muted-foreground">{investorCode}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await signOut({ redirect: false });
              router.replace("/signin");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
