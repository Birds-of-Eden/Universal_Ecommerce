"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Investor = {
  id: number;
  code: string;
  name: string;
  status: string;
  kycStatus: string;
  totals: {
    credit: string;
    debit: string;
    balance: string;
  };
};

type Variant = {
  id: number;
  sku: string;
  product: { name: string };
};

type Transaction = {
  id: number;
  transactionNumber: string;
  transactionDate: string;
  type: string;
  direction: string;
  amount: string;
  currency: string;
  investor: {
    id: number;
    code: string;
    name: string;
  };
  productVariant: Variant | null;
};

type Allocation = {
  id: number;
  investor: { id: number; code: string; name: string };
  productVariant: Variant;
  participationPercent: string | null;
  committedAmount: string | null;
  status: string;
};

type TxPayload = {
  variants: Variant[];
  transactions: Transaction[];
};

type ProfitRun = {
  id: number;
  runNumber: string;
  fromDate: string;
  toDate: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "POSTED";
  allocationBasis: "NET_REVENUE" | "NET_UNITS";
  marketingExpense: string;
  adsExpense: string;
  logisticsExpense: string;
  otherExpense: string;
  totalOperatingExpense: string;
  totalNetRevenue: string;
  totalNetCogs: string;
  totalNetProfit: string;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  _count?: {
    variantLines: number;
    allocationLines: number;
    payouts: number;
  };
};

type ProfitVariantLine = {
  id: number;
  productVariant: Variant;
  unitsSold: number;
  unitsRefunded: number;
  unitsNet: number;
  netRevenue: string;
  netCogs: string;
  allocatedExpense: string;
  netProfit: string;
  unallocatedSharePct: string;
};

type ProfitAllocationLine = {
  id: number;
  investor: {
    id: number;
    code: string;
    name: string;
  };
  productVariant: Variant;
  participationSharePct: string;
  allocatedRevenue: string;
  allocatedNetProfit: string;
};

type ProfitPayout = {
  id: number;
  payoutNumber: string;
  investor: {
    id: number;
    code: string;
    name: string;
  };
  payoutPercent: string;
  holdbackPercent: string;
  grossProfitAmount: string;
  holdbackAmount: string;
  payoutAmount: string;
  currency: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PAID" | "VOID";
  approvalNote?: string | null;
  rejectionReason?: string | null;
  paymentMethod?: "BANK_TRANSFER" | "MOBILE_BANKING" | "CHEQUE" | "CASH" | null;
  bankReference?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidReversalReference?: string | null;
  transaction: {
    id: number;
    transactionNumber: string;
    transactionDate: string;
    type: string;
    direction: string;
    amount: string;
  } | null;
};

type ProfitPayload = {
  runs: ProfitRun[];
  selectedRunId: number | null;
  variantLines: ProfitVariantLine[];
  allocationLines: ProfitAllocationLine[];
  payouts: ProfitPayout[];
};

const TRANSACTION_TYPES = [
  "CAPITAL_COMMITMENT",
  "CAPITAL_CONTRIBUTION",
  "PROFIT_ALLOCATION",
  "LOSS_ALLOCATION",
  "DISTRIBUTION",
  "WITHDRAWAL",
  "ADJUSTMENT",
] as const;

export type InvestorSection =
  | "overview"
  | "registry"
  | "ledger"
  | "allocations"
  | "profit-runs"
  | "payouts"
  | "statements";

async function readJson<T>(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || fallback);
  }
  return payload as T;
}

export default function InvestorWorkspace({
  section = "overview",
}: {
  section?: InvestorSection;
}) {
  const { data: session } = useSession();
  const globalPermissions = Array.isArray((session?.user as any)?.globalPermissions)
    ? ((session?.user as any).globalPermissions as string[])
    : [];

  const canManageInvestors = globalPermissions.includes("investors.manage");
  const canManageLedger = globalPermissions.includes("investor_ledger.manage");
  const canManageAllocations = globalPermissions.includes("investor_allocations.manage");
  const canReadProfit =
    globalPermissions.includes("investor_profit.read") ||
    globalPermissions.includes("investor_profit.manage") ||
    globalPermissions.includes("investor_profit.approve") ||
    globalPermissions.includes("investor_profit.post") ||
    globalPermissions.includes("investor_payout.read") ||
    globalPermissions.includes("investor_payout.manage") ||
    globalPermissions.includes("investor_payout.approve") ||
    globalPermissions.includes("investor_payout.pay") ||
    globalPermissions.includes("investor_payout.void") ||
    globalPermissions.includes("investor_statement.read");
  const canManageProfit = globalPermissions.includes("investor_profit.manage");
  const canApproveProfit = globalPermissions.includes("investor_profit.approve");
  const canPostProfit = globalPermissions.includes("investor_profit.post");
  const canReadPayout =
    globalPermissions.includes("investor_payout.read") ||
    globalPermissions.includes("investor_payout.manage") ||
    globalPermissions.includes("investor_payout.approve") ||
    globalPermissions.includes("investor_payout.pay") ||
    globalPermissions.includes("investor_payout.void") ||
    globalPermissions.includes("investor_statement.read");
  const canManagePayout = globalPermissions.includes("investor_payout.manage");
  const canApprovePayout = globalPermissions.includes("investor_payout.approve");
  const canPayPayout = globalPermissions.includes("investor_payout.pay");
  const canVoidPayout = globalPermissions.includes("investor_payout.void");
  const canReadStatement = globalPermissions.includes("investor_statement.read");
  const canReadInvestors =
    globalPermissions.includes("investors.read") || canManageInvestors;
  const canReadLedger =
    globalPermissions.includes("investor_ledger.read") || canManageLedger;
  const canReadAllocations =
    globalPermissions.includes("investor_allocations.read") || canManageAllocations;
  const isOverview = section === "overview";
  const showSection = (target: Exclude<InvestorSection, "overview">) =>
    isOverview || section === target;
  const sectionTitleMap: Record<InvestorSection, string> = {
    overview: "Overview",
    registry: "Registry & KYC",
    ledger: "Capital Ledger",
    allocations: "Allocations",
    "profit-runs": "Profit Runs",
    payouts: "Payouts",
    statements: "Statements",
  };
  const canAccessSelectedSection =
    section === "overview"
      ? canReadInvestors ||
        canReadLedger ||
        canReadAllocations ||
        canReadProfit ||
        canReadPayout ||
        canReadStatement
      : section === "registry"
        ? canReadInvestors
        : section === "ledger"
          ? canReadLedger
          : section === "allocations"
            ? canReadAllocations
            : section === "profit-runs"
              ? canReadProfit
              : section === "payouts"
                ? canReadPayout
                : canReadStatement;

  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [profitRuns, setProfitRuns] = useState<ProfitRun[]>([]);
  const [selectedProfitRunId, setSelectedProfitRunId] = useState("");
  const [profitVariantLines, setProfitVariantLines] = useState<ProfitVariantLine[]>([]);
  const [profitAllocationLines, setProfitAllocationLines] = useState<ProfitAllocationLine[]>([]);
  const [profitPayouts, setProfitPayouts] = useState<ProfitPayout[]>([]);
  const [runningProfit, setRunningProfit] = useState(false);
  const [updatingRunStatus, setUpdatingRunStatus] = useState(false);
  const [postingRun, setPostingRun] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [actingPayoutId, setActingPayoutId] = useState<number | null>(null);
  const [exportingStatement, setExportingStatement] = useState(false);

  const [investorName, setInvestorName] = useState("");
  const [transactionForm, setTransactionForm] = useState({
    investorId: "",
    type: "CAPITAL_CONTRIBUTION" as (typeof TRANSACTION_TYPES)[number],
    direction: "CREDIT" as "DEBIT" | "CREDIT",
    amount: "",
    currency: "BDT",
    productVariantId: "",
  });
  const [allocationForm, setAllocationForm] = useState({
    investorId: "",
    productVariantId: "",
    participationPercent: "",
    committedAmount: "",
  });
  const [profitRunForm, setProfitRunForm] = useState({
    fromDate: "",
    toDate: "",
    allocationBasis: "NET_REVENUE" as "NET_REVENUE" | "NET_UNITS",
    marketingExpense: "",
    adsExpense: "",
    logisticsExpense: "",
    otherExpense: "",
    note: "",
  });
  const [runActionNote, setRunActionNote] = useState("");
  const [payoutForm, setPayoutForm] = useState({
    payoutPercent: "100",
    holdbackPercent: "0",
    currency: "BDT",
    note: "",
  });
  const [payoutActionForm, setPayoutActionForm] = useState({
    note: "",
    paymentMethod: "BANK_TRANSFER" as "BANK_TRANSFER" | "MOBILE_BANKING" | "CHEQUE" | "CASH",
    bankReference: "",
    paidAt: "",
    voidReason: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const investorParam = selectedInvestorId ? `?investorId=${selectedInvestorId}` : "";
      const profitParams = new URLSearchParams();
      if (selectedInvestorId) {
        profitParams.set("investorId", selectedInvestorId);
      }
      if (selectedProfitRunId) {
        profitParams.set("runId", selectedProfitRunId);
      }
      const profitUrl = `/api/admin/investor-profit-runs${profitParams.size > 0 ? `?${profitParams.toString()}` : ""}`;
      const [investorRes, txRes, allocationRes] = await Promise.all([
        fetch("/api/admin/investors", { cache: "no-store" }),
        fetch(`/api/admin/investor-transactions${investorParam}`, { cache: "no-store" }),
        fetch(`/api/admin/investor-allocations${investorParam}`, { cache: "no-store" }),
      ]);

      const investorData = await readJson<Investor[]>(investorRes, "Failed to load investors");
      const txData = await readJson<TxPayload>(txRes, "Failed to load transactions");
      const allocationData = await readJson<Allocation[]>(
        allocationRes,
        "Failed to load allocations",
      );
      let profitData: ProfitPayload = {
        runs: [],
        selectedRunId: null,
        variantLines: [],
        allocationLines: [],
        payouts: [],
      };
      if (canReadProfit) {
        const profitRes = await fetch(profitUrl, { cache: "no-store" });
        profitData = await readJson<ProfitPayload>(
          profitRes,
          "Failed to load investor profit runs",
        );
      }

      setInvestors(investorData);
      setVariants(txData.variants || []);
      setTransactions(txData.transactions || []);
      setAllocations(allocationData || []);
      setProfitRuns(profitData.runs || []);
      setProfitVariantLines(profitData.variantLines || []);
      setProfitAllocationLines(profitData.allocationLines || []);
      setProfitPayouts(profitData.payouts || []);
      const apiRunId =
        profitData.selectedRunId && Number.isInteger(profitData.selectedRunId)
          ? String(profitData.selectedRunId)
          : "";
      if (apiRunId !== selectedProfitRunId) {
        setSelectedProfitRunId(apiRunId);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load investor workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canReadProfit, selectedInvestorId, selectedProfitRunId]);

  useEffect(() => {
    if (!selectedInvestorId) return;
    setTransactionForm((current) => ({ ...current, investorId: selectedInvestorId }));
    setAllocationForm((current) => ({ ...current, investorId: selectedInvestorId }));
  }, [selectedInvestorId]);

  useEffect(() => {
    if (transactionForm.type === "ADJUSTMENT") return;
    setTransactionForm((current) => ({
      ...current,
      direction:
        current.type === "LOSS_ALLOCATION" ||
        current.type === "DISTRIBUTION" ||
        current.type === "WITHDRAWAL"
          ? "DEBIT"
          : "CREDIT",
    }));
  }, [transactionForm.type]);

  const createInvestor = async () => {
    try {
      const response = await fetch("/api/admin/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: investorName }),
      });
      await readJson(response, "Failed to create investor");
      setInvestorName("");
      toast.success("Investor created");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create investor");
    }
  };

  const createTransaction = async () => {
    try {
      const response = await fetch("/api/admin/investor-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transactionForm,
          investorId: Number(transactionForm.investorId),
          productVariantId: transactionForm.productVariantId
            ? Number(transactionForm.productVariantId)
            : null,
        }),
      });
      await readJson(response, "Failed to create transaction");
      setTransactionForm((current) => ({ ...current, amount: "", productVariantId: "" }));
      toast.success("Transaction posted");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create transaction");
    }
  };

  const createAllocation = async () => {
    try {
      const response = await fetch("/api/admin/investor-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...allocationForm,
          investorId: Number(allocationForm.investorId),
          productVariantId: Number(allocationForm.productVariantId),
        }),
      });
      await readJson(response, "Failed to create allocation");
      setAllocationForm((current) => ({
        ...current,
        participationPercent: "",
        committedAmount: "",
      }));
      toast.success("Allocation created");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create allocation");
    }
  };

  const runProfitCalculation = async () => {
    try {
      setRunningProfit(true);
      const response = await fetch("/api/admin/investor-profit-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profitRunForm),
      });
      const data = await readJson<{
        run: ProfitRun;
      }>(response, "Failed to run profitability calculation");
      toast.success(`Profit run ${data.run.runNumber} completed`);
      setSelectedProfitRunId(String(data.run.id));
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to run profitability calculation");
    } finally {
      setRunningProfit(false);
    }
  };

  const selectedProfitRun = useMemo(() => {
    if (!selectedProfitRunId) {
      return profitRuns[0] ?? null;
    }
    return profitRuns.find((run) => String(run.id) === selectedProfitRunId) ?? null;
  }, [profitRuns, selectedProfitRunId]);

  const changeProfitRunStatus = async (action: "approve" | "reject") => {
    if (!selectedProfitRun) {
      toast.error("Select a profit run first.");
      return;
    }
    try {
      setUpdatingRunStatus(true);
      const response = await fetch(`/api/admin/investor-profit-runs/${selectedProfitRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: runActionNote,
        }),
      });
      await readJson(response, `Failed to ${action} run`);
      toast.success(
        action === "approve" ? "Profit run approved" : "Profit run rejected",
      );
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} run`);
    } finally {
      setUpdatingRunStatus(false);
    }
  };

  const postSelectedRun = async () => {
    if (!selectedProfitRun) {
      toast.error("Select a profit run first.");
      return;
    }
    try {
      setPostingRun(true);
      const response = await fetch(`/api/admin/investor-profit-runs/${selectedProfitRun.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: runActionNote,
        }),
      });
      const result = await readJson<{ postedTransactionCount: number }>(
        response,
        "Failed to post run to ledger",
      );
      toast.success(`Posted ${result.postedTransactionCount} ledger transaction(s)`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to post run");
    } finally {
      setPostingRun(false);
    }
  };

  const createPayout = async () => {
    if (!selectedProfitRun) {
      toast.error("Select a posted run first.");
      return;
    }
    try {
      setProcessingPayout(true);
      const response = await fetch(`/api/admin/investor-profit-runs/${selectedProfitRun.id}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payoutForm),
      });
      const result = await readJson<{ payoutCount: number }>(
        response,
        "Failed to create investor payout draft",
      );
      toast.success(`Created ${result.payoutCount} payout draft(s)`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create payout draft");
    } finally {
      setProcessingPayout(false);
    }
  };

  const processPayoutAction = async (
    payoutId: number,
    action: "approve" | "reject" | "pay" | "void",
  ) => {
    try {
      setActingPayoutId(payoutId);
      const payload: Record<string, string> = {
        action,
      };
      if (action === "approve" || action === "reject") {
        payload.note = payoutActionForm.note;
      }
      if (action === "pay") {
        payload.note = payoutActionForm.note;
        payload.paymentMethod = payoutActionForm.paymentMethod;
        payload.bankReference = payoutActionForm.bankReference;
        if (payoutActionForm.paidAt) {
          payload.paidAt = payoutActionForm.paidAt;
        }
      }
      if (action === "void") {
        payload.voidReason = payoutActionForm.voidReason;
      }

      const response = await fetch(`/api/admin/investor-payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readJson(response, `Failed to ${action} payout`);
      const messageMap: Record<typeof action, string> = {
        approve: "Payout approved",
        reject: "Payout rejected",
        pay: "Payout settled",
        void: "Payout voided",
      };
      toast.success(messageMap[action]);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} payout`);
    } finally {
      setActingPayoutId(null);
    }
  };

  const exportStatementCsv = async () => {
    try {
      setExportingStatement(true);
      const params = new URLSearchParams();
      params.set("format", "csv");
      if (selectedInvestorId) {
        params.set("investorId", selectedInvestorId);
      }
      const response = await fetch(`/api/admin/investor-statements?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || "Failed to export statement");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "investor-statement.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Investor statement exported");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export statement");
    } finally {
      setExportingStatement(false);
    }
  };

  const summary = useMemo(
    () => ({
      totalInvestors: investors.length,
      activeInvestors: investors.filter((item) => item.status === "ACTIVE").length,
      totalBalance: investors.reduce((sum, item) => sum + Number(item.totals.balance || 0), 0),
    }),
    [investors],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Investor Module</h1>
        <p className="text-sm text-muted-foreground">
          Investor onboarding, capital transactions, and product allocation.
          <span className="ml-1 font-medium text-foreground">
            Active view: {sectionTitleMap[section]}.
          </span>
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Refreshing investor data...</p>
        ) : null}
      </div>

      {!canAccessSelectedSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You do not have permission to access the {sectionTitleMap[section]} view.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Investors</p>
              <p className="text-xl font-semibold">{summary.totalInvestors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active Investors</p>
              <p className="text-xl font-semibold">{summary.activeInvestors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net Balance</p>
              <p className="text-xl font-semibold">{summary.totalBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {canAccessSelectedSection && showSection("registry") && canManageInvestors ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Investor</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input
              placeholder="Investor name"
              value={investorName}
              onChange={(event) => setInvestorName(event.target.value)}
            />
            <Button onClick={() => void createInvestor()}>Create</Button>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("registry") && canReadInvestors ? (
        <Card>
        <CardHeader>
          <CardTitle>Investor Registry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Filter by investor</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm md:w-[360px]"
              value={selectedInvestorId}
              onChange={(event) => setSelectedInvestorId(event.target.value)}
            >
              <option value="">All investors</option>
              {investors.map((investor) => (
                <option key={investor.id} value={investor.id}>
                  {investor.name} ({investor.code})
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((investor) => (
                  <TableRow key={investor.id}>
                    <TableCell>{investor.name} ({investor.code})</TableCell>
                    <TableCell>{investor.status}</TableCell>
                    <TableCell>{investor.kycStatus}</TableCell>
                    <TableCell>{Number(investor.totals.credit).toFixed(2)}</TableCell>
                    <TableCell>{Number(investor.totals.debit).toFixed(2)}</TableCell>
                    <TableCell>{Number(investor.totals.balance).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && (showSection("ledger") || showSection("allocations")) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {showSection("ledger") && canManageLedger ? (
          <Card>
            <CardHeader>
              <CardTitle>Post Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={transactionForm.investorId}
                onChange={(event) =>
                  setTransactionForm((current) => ({ ...current, investorId: event.target.value }))
                }
              >
                <option value="">Select investor</option>
                {investors.map((investor) => (
                  <option key={investor.id} value={investor.id}>
                    {investor.name} ({investor.code})
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={transactionForm.type}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    type: event.target.value as (typeof TRANSACTION_TYPES)[number],
                  }))
                }
              >
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                disabled={transactionForm.type !== "ADJUSTMENT"}
                value={transactionForm.direction}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    direction: event.target.value as "DEBIT" | "CREDIT",
                  }))
                }
              >
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
              <Input
                placeholder="Amount"
                value={transactionForm.amount}
                onChange={(event) =>
                  setTransactionForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={transactionForm.productVariantId}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    productVariantId: event.target.value,
                  }))
                }
              >
                <option value="">General pool</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.product.name} ({variant.sku})
                  </option>
                ))}
              </select>
              <Button onClick={() => void createTransaction()}>Post</Button>
            </CardContent>
          </Card>
        ) : null}

          {showSection("allocations") && canManageAllocations ? (
          <Card>
            <CardHeader>
              <CardTitle>Create Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={allocationForm.investorId}
                onChange={(event) =>
                  setAllocationForm((current) => ({ ...current, investorId: event.target.value }))
                }
              >
                <option value="">Select investor</option>
                {investors.map((investor) => (
                  <option key={investor.id} value={investor.id}>
                    {investor.name} ({investor.code})
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={allocationForm.productVariantId}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    productVariantId: event.target.value,
                  }))
                }
              >
                <option value="">Select variant</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.product.name} ({variant.sku})
                  </option>
                ))}
              </select>
              <Input
                placeholder="Participation %"
                value={allocationForm.participationPercent}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    participationPercent: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Committed amount"
                value={allocationForm.committedAmount}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    committedAmount: event.target.value,
                  }))
                }
              />
              <Button onClick={() => void createAllocation()}>Create</Button>
            </CardContent>
          </Card>
          ) : null}
        </div>
      ) : null}

      {canAccessSelectedSection && showSection("profit-runs") && canManageProfit ? (
        <Card>
          <CardHeader>
            <CardTitle>Run Product Profitability (Phase-2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label>From</Label>
                <Input
                  type="date"
                  value={profitRunForm.fromDate}
                  onChange={(event) =>
                    setProfitRunForm((current) => ({
                      ...current,
                      fromDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>To</Label>
                <Input
                  type="date"
                  value={profitRunForm.toDate}
                  onChange={(event) =>
                    setProfitRunForm((current) => ({
                      ...current,
                      toDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Allocation Basis</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={profitRunForm.allocationBasis}
                  onChange={(event) =>
                    setProfitRunForm((current) => ({
                      ...current,
                      allocationBasis: event.target.value as "NET_REVENUE" | "NET_UNITS",
                    }))
                  }
                >
                  <option value="NET_REVENUE">NET_REVENUE</option>
                  <option value="NET_UNITS">NET_UNITS</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Marketing expense"
                value={profitRunForm.marketingExpense}
                onChange={(event) =>
                  setProfitRunForm((current) => ({
                    ...current,
                    marketingExpense: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Ads expense"
                value={profitRunForm.adsExpense}
                onChange={(event) =>
                  setProfitRunForm((current) => ({
                    ...current,
                    adsExpense: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Logistics expense"
                value={profitRunForm.logisticsExpense}
                onChange={(event) =>
                  setProfitRunForm((current) => ({
                    ...current,
                    logisticsExpense: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Other expense"
                value={profitRunForm.otherExpense}
                onChange={(event) =>
                  setProfitRunForm((current) => ({
                    ...current,
                    otherExpense: event.target.value,
                  }))
                }
              />
            </div>
            <Input
              placeholder="Note (optional)"
              value={profitRunForm.note}
              onChange={(event) =>
                setProfitRunForm((current) => ({ ...current, note: event.target.value }))
              }
            />
            <Button onClick={() => void runProfitCalculation()} disabled={runningProfit}>
              {runningProfit ? "Running..." : "Run Profit Calculation"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("profit-runs") && canReadProfit ? (
        <Card>
          <CardHeader>
            <CardTitle>Profit Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Select Run</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm md:w-[460px]"
                value={selectedProfitRunId}
                onChange={(event) => setSelectedProfitRunId(event.target.value)}
              >
                <option value="">Latest run</option>
                {profitRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.runNumber} • {run.fromDate.slice(0, 10)} to {run.toDate.slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead>Net Revenue</TableHead>
                    <TableHead>Net COGS</TableHead>
                    <TableHead>Operating Expense</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.runNumber}</TableCell>
                      <TableCell>{run.status}</TableCell>
                      <TableCell>{run.allocationBasis}</TableCell>
                      <TableCell>{Number(run.totalNetRevenue).toFixed(2)}</TableCell>
                      <TableCell>{Number(run.totalNetCogs).toFixed(2)}</TableCell>
                      <TableCell>{Number(run.totalOperatingExpense).toFixed(2)}</TableCell>
                      <TableCell>{Number(run.totalNetProfit).toFixed(2)}</TableCell>
                      <TableCell>{run.approvedAt ? run.approvedAt.slice(0, 10) : "-"}</TableCell>
                      <TableCell>{run.postedAt ? run.postedAt.slice(0, 10) : "-"}</TableCell>
                      <TableCell>
                        {run._count?.variantLines || 0} variants /{" "}
                        {run._count?.allocationLines || 0} allocations /{" "}
                        {run._count?.payouts || 0} payouts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("profit-runs") && canReadProfit && selectedProfitRun ? (
        <Card>
          <CardHeader>
            <CardTitle>Run Workflow Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Run</p>
                <p className="font-medium">{selectedProfitRun.runNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{selectedProfitRun.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="font-medium">
                  {selectedProfitRun.approvedAt ? selectedProfitRun.approvedAt.slice(0, 19).replace("T", " ") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posted</p>
                <p className="font-medium">
                  {selectedProfitRun.postedAt ? selectedProfitRun.postedAt.slice(0, 19).replace("T", " ") : "-"}
                </p>
              </div>
            </div>
            <Input
              placeholder="Governance note (optional)"
              value={runActionNote}
              onChange={(event) => setRunActionNote(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {canApproveProfit && selectedProfitRun.status === "PENDING_APPROVAL" ? (
                <>
                  <Button
                    onClick={() => void changeProfitRunStatus("approve")}
                    disabled={updatingRunStatus}
                  >
                    {updatingRunStatus ? "Updating..." : "Approve Run"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void changeProfitRunStatus("reject")}
                    disabled={updatingRunStatus}
                  >
                    {updatingRunStatus ? "Updating..." : "Reject Run"}
                  </Button>
                </>
              ) : null}
              {canPostProfit && selectedProfitRun.status === "APPROVED" ? (
                <Button onClick={() => void postSelectedRun()} disabled={postingRun}>
                  {postingRun ? "Posting..." : "Post To Investor Ledger"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection &&
      showSection("payouts") &&
      canManagePayout &&
      selectedProfitRun?.status === "POSTED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Payout Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Payout % (0-100)"
                value={payoutForm.payoutPercent}
                onChange={(event) =>
                  setPayoutForm((current) => ({
                    ...current,
                    payoutPercent: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Holdback % (0-100)"
                value={payoutForm.holdbackPercent}
                onChange={(event) =>
                  setPayoutForm((current) => ({
                    ...current,
                    holdbackPercent: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Currency"
                value={payoutForm.currency}
                onChange={(event) =>
                  setPayoutForm((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <Input
              placeholder="Payout note (optional)"
              value={payoutForm.note}
              onChange={(event) =>
                setPayoutForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
            <Button onClick={() => void createPayout()} disabled={processingPayout}>
              {processingPayout ? "Processing..." : "Create Payout Draft"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("profit-runs") && canReadProfit ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Variant Profit Lines</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Units (Net)</TableHead>
                    <TableHead>Net Revenue</TableHead>
                    <TableHead>Net COGS</TableHead>
                    <TableHead>Allocated Expense</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Unallocated %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitVariantLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.productVariant.product.name} ({line.productVariant.sku})
                      </TableCell>
                      <TableCell>{line.unitsNet}</TableCell>
                      <TableCell>{Number(line.netRevenue).toFixed(2)}</TableCell>
                      <TableCell>{Number(line.netCogs).toFixed(2)}</TableCell>
                      <TableCell>{Number(line.allocatedExpense).toFixed(2)}</TableCell>
                      <TableCell>{Number(line.netProfit).toFixed(2)}</TableCell>
                      <TableCell>{(Number(line.unallocatedSharePct) * 100).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Investor Profit Share Lines</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Share %</TableHead>
                    <TableHead>Allocated Revenue</TableHead>
                    <TableHead>Allocated Net Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitAllocationLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.investor.name} ({line.investor.code})
                      </TableCell>
                      <TableCell>
                        {line.productVariant.product.name} ({line.productVariant.sku})
                      </TableCell>
                      <TableCell>{(Number(line.participationSharePct) * 100).toFixed(2)}</TableCell>
                      <TableCell>{Number(line.allocatedRevenue).toFixed(2)}</TableCell>
                      <TableCell>{Number(line.allocatedNetProfit).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {canAccessSelectedSection && showSection("payouts") && canReadPayout ? (
        <Card>
          <CardHeader>
            <CardTitle>Payout Register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 overflow-x-auto">
            {(canApprovePayout || canPayPayout || canVoidPayout) ? (
              <div className="grid gap-3 md:grid-cols-5">
                <Input
                  placeholder="Action note"
                  value={payoutActionForm.note}
                  onChange={(event) =>
                    setPayoutActionForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={payoutActionForm.paymentMethod}
                  onChange={(event) =>
                    setPayoutActionForm((current) => ({
                      ...current,
                      paymentMethod: event.target.value as
                        | "BANK_TRANSFER"
                        | "MOBILE_BANKING"
                        | "CHEQUE"
                        | "CASH",
                    }))
                  }
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="MOBILE_BANKING">MOBILE_BANKING</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="CASH">CASH</option>
                </select>
                <Input
                  placeholder="Bank reference"
                  value={payoutActionForm.bankReference}
                  onChange={(event) =>
                    setPayoutActionForm((current) => ({
                      ...current,
                      bankReference: event.target.value,
                    }))
                  }
                />
                <Input
                  type="datetime-local"
                  value={payoutActionForm.paidAt}
                  onChange={(event) =>
                    setPayoutActionForm((current) => ({
                      ...current,
                      paidAt: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Void reason"
                  value={payoutActionForm.voidReason}
                  onChange={(event) =>
                    setPayoutActionForm((current) => ({
                      ...current,
                      voidReason: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Gross Profit</TableHead>
                  <TableHead>Holdback</TableHead>
                  <TableHead>Payout Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Bank Ref</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Ledger Txn</TableHead>
                  {(canApprovePayout || canPayPayout || canVoidPayout) ? (
                    <TableHead>Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitPayouts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.payoutNumber}</TableCell>
                    <TableCell>
                      {item.investor.name} ({item.investor.code})
                    </TableCell>
                    <TableCell>{Number(item.grossProfitAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      {Number(item.holdbackAmount).toFixed(2)} ({Number(item.holdbackPercent).toFixed(2)}%)
                    </TableCell>
                    <TableCell>
                      {Number(item.payoutAmount).toFixed(2)} {item.currency}
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.paymentMethod || "-"}</TableCell>
                    <TableCell>{item.bankReference || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <div>
                        A: {item.approvedAt ? item.approvedAt.slice(0, 10) : "-"}
                      </div>
                      <div>
                        P: {item.paidAt ? item.paidAt.slice(0, 10) : "-"}
                      </div>
                      <div>
                        V: {item.voidedAt ? item.voidedAt.slice(0, 10) : "-"}
                      </div>
                    </TableCell>
                    <TableCell>{item.transaction?.transactionNumber ?? "-"}</TableCell>
                    {(canApprovePayout || canPayPayout || canVoidPayout) ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {canApprovePayout && item.status === "PENDING_APPROVAL" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => void processPayoutAction(item.id, "approve")}
                                disabled={actingPayoutId === item.id}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void processPayoutAction(item.id, "reject")}
                                disabled={actingPayoutId === item.id}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {canPayPayout && item.status === "APPROVED" ? (
                            <Button
                              size="sm"
                              onClick={() => void processPayoutAction(item.id, "pay")}
                              disabled={actingPayoutId === item.id}
                            >
                              Pay
                            </Button>
                          ) : null}
                          {canVoidPayout && (item.status === "APPROVED" || item.status === "PAID") ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void processPayoutAction(item.id, "void")}
                              disabled={actingPayoutId === item.id}
                            >
                              Void
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("ledger") && canReadLedger ? (
        <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Investor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Product</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.transactionNumber}</TableCell>
                  <TableCell>{item.investor.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.direction}</TableCell>
                  <TableCell>{Number(item.amount).toFixed(2)} {item.currency}</TableCell>
                  <TableCell>
                    {item.productVariant
                      ? `${item.productVariant.product.name} (${item.productVariant.sku})`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("allocations") && canReadAllocations ? (
        <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Participation %</TableHead>
                <TableHead>Committed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.investor.name}</TableCell>
                  <TableCell>{item.productVariant.product.name} ({item.productVariant.sku})</TableCell>
                  <TableCell>{item.participationPercent || "-"}</TableCell>
                  <TableCell>{item.committedAmount || "-"}</TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      ) : null}

      {canAccessSelectedSection && showSection("statements") && canReadStatement ? (
        <Card>
          <CardHeader>
            <CardTitle>Statement Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export investor statement as CSV for the selected investor filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportStatementCsv()}
              disabled={exportingStatement}
            >
              {exportingStatement ? "Exporting..." : "Export Statement CSV"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
