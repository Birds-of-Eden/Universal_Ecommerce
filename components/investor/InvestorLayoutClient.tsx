"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import InvestorNav from "./InvestorNav";

type Props = {
  investorName: string;
  investorCode: string;
  children: React.ReactNode;
};

export default function InvestorLayoutClient({ investorName, investorCode, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0 md:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <InvestorNav
          investorName={investorName}
          investorCode={investorCode}
          onNavClick={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card/70 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Investor Portal</p>
            <p className="truncate text-sm font-semibold">{investorName}</p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
