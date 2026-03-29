"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type UserOption = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
};

type WarehouseOption = {
  id: number;
  name: string;
  code: string;
};

type PayrollProfile = {
  id: number;
  userId: string;
  warehouseId?: number | null;
  employeeCode?: string | null;
  paymentType: string;
  baseSalary: string | number;
  bankName?: string | null;
  bankAccountNo?: string | null;
  accountHolder?: string | null;
  mobileBankingNo?: string | null;
  paymentMethod?: string | null;
  joiningDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  user: UserOption;
  warehouse?: WarehouseOption | null;
  _count?: { entries: number };
};

type PayrollPeriod = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string | null;
  _count?: { entries: number };
};

type PayrollEntry = {
  id: number;
  payrollPeriodId: number;
  payrollProfileId: number;
  userId: string;
  warehouseId?: number | null;
  basicAmount: string | number;
  overtimeAmount: string | number;
  bonusAmount: string | number;
  deductionAmount: string | number;
  netAmount: string | number;
  paymentStatus: string;
  paidAt?: string | null;
  note?: string | null;
  payrollPeriod: PayrollPeriod;
  payrollProfile: PayrollProfile;
  warehouse?: WarehouseOption | null;
};

type PayrollPayload = {
  summary: {
    activeProfiles: number;
    openPeriods: number;
    paidCount: number;
    pendingCount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  profiles: PayrollProfile[];
  periods: PayrollPeriod[];
  entries: PayrollEntry[];
  users: UserOption[];
  warehouses: WarehouseOption[];
};

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

const profileDefaults = {
  userId: "",
  warehouseId: "",
  employeeCode: "",
  paymentType: "MONTHLY",
  baseSalary: "",
  bankName: "",
  bankAccountNo: "",
  accountHolder: "",
  mobileBankingNo: "",
  paymentMethod: "BANK",
  joiningDate: "",
  isActive: true,
  notes: "",
};

const periodDefaults = {
  name: "",
  startDate: "",
  endDate: "",
  status: "OPEN",
  notes: "",
};

const entryDefaults = {
  payrollProfileId: "",
  payrollPeriodId: "",
  warehouseId: "",
  basicAmount: "",
  overtimeAmount: "0",
  bonusAmount: "0",
  deductionAmount: "0",
  netAmount: "",
  paymentStatus: "PENDING",
  paidAt: "",
  note: "",
};

function amount(value: string | number | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateNetAmountValue(entry: typeof entryDefaults) {
  return String(
    amount(entry.basicAmount) +
      amount(entry.overtimeAmount) +
      amount(entry.bonusAmount) -
      amount(entry.deductionAmount),
  );
}

function formatMoney(value: string | number | null | undefined) {
  return money.format(amount(value));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function PayrollPageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`payroll-summary-skeleton-${index}`}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`payroll-form-skeleton-${index}`}
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((__, fieldIndex) => (
                <Skeleton
                  key={`payroll-form-field-${index}-${fieldIndex}`}
                  className="h-10 w-full rounded-md"
                />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`payroll-list-skeleton-${index}`}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <Skeleton className="h-6 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div
                  key={`payroll-card-skeleton-${index}-${cardIndex}`}
                  className="rounded-xl border border-border/70 p-4 space-y-3"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminPayrollPage() {
  const [data, setData] = useState<PayrollPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<
    "profile" | "period" | "entry" | null
  >(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState(profileDefaults);
  const [periodForm, setPeriodForm] = useState(periodDefaults);
  const [entryForm, setEntryForm] = useState(entryDefaults);
  const [isNetAmountManual, setIsNetAmountManual] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/payroll", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to load payroll");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payroll");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProfile = useMemo(
    () =>
      data?.profiles.find(
        (item) => item.id === Number(entryForm.payrollProfileId),
      ) || null,
    [data?.profiles, entryForm.payrollProfileId],
  );

  useEffect(() => {
    if (!selectedProfile) return;
    setEntryForm((current) => ({
      ...current,
      warehouseId:
        current.warehouseId ||
        (selectedProfile.warehouseId
          ? String(selectedProfile.warehouseId)
          : ""),
      basicAmount:
        current.basicAmount || String(selectedProfile.baseSalary ?? ""),
    }));
  }, [selectedProfile]);

  useEffect(() => {
    if (isNetAmountManual) return;

    const calculatedNetAmount = calculateNetAmountValue(entryForm);
    if (entryForm.netAmount === calculatedNetAmount) return;

    setEntryForm((current) => ({
      ...current,
      netAmount: calculateNetAmountValue(current),
    }));
  }, [
    entryForm.basicAmount,
    entryForm.overtimeAmount,
    entryForm.bonusAmount,
    entryForm.deductionAmount,
    entryForm.netAmount,
    isNetAmountManual,
  ]);

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting("profile");
      setError(null);
      setSuccess(null);

      const payload = {
        entity: "profile",
        ...profileForm,
        warehouseId: profileForm.warehouseId || null,
        joiningDate: profileForm.joiningDate || null,
      };
      const url = editingProfileId
        ? `/api/payroll/profile/${editingProfileId}`
        : "/api/payroll";
      const method = editingProfileId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(response?.error || "Failed to save payroll profile");

      setSuccess(
        editingProfileId
          ? "Payroll profile updated"
          : "Payroll profile created",
      );
      setEditingProfileId(null);
      setProfileForm(profileDefaults);
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save payroll profile",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const submitPeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting("period");
      setError(null);
      setSuccess(null);

      const payload = {
        entity: "period",
        ...periodForm,
        notes: periodForm.notes || null,
      };
      const url = editingPeriodId
        ? `/api/payroll/period/${editingPeriodId}`
        : "/api/payroll";
      const method = editingPeriodId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(response?.error || "Failed to save payroll period");

      setSuccess(
        editingPeriodId ? "Payroll period updated" : "Payroll period created",
      );
      setEditingPeriodId(null);
      setPeriodForm(periodDefaults);
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save payroll period",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const submitEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting("entry");
      setError(null);
      setSuccess(null);

      const payload = {
        entity: "entry",
        ...entryForm,
        warehouseId: entryForm.warehouseId || null,
        paidAt: entryForm.paidAt || null,
        note: entryForm.note || null,
      };
      const url = editingEntryId
        ? `/api/payroll/entry/${editingEntryId}`
        : "/api/payroll";
      const method = editingEntryId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(response?.error || "Failed to save payroll entry");

      setSuccess(
        editingEntryId ? "Payroll entry updated" : "Payroll entry created",
      );
      setEditingEntryId(null);
      setEntryForm(entryDefaults);
      setIsNetAmountManual(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save payroll entry");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading && !data) {
    return <PayrollPageSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Payroll
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage staff salary profiles, payroll periods, and monthly payment
            entries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Active profiles
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data?.summary.activeProfiles || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Open periods
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data?.summary.openPeriods || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pending payroll
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {formatMoney(data?.summary.pendingAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.summary.pendingCount || 0} entry pending payment
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Paid payroll
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatMoney(data?.summary.paidAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.summary.paidCount || 0} entry marked paid
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <form
          onSubmit={submitProfile}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Payroll Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Base salary and payment setup per staff.
              </p>
            </div>
            {editingProfileId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProfileId(null);
                  setProfileForm(profileDefaults);
                }}
                className="text-xs text-muted-foreground"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
          <select
            value={profileForm.userId}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, userId: e.target.value }))
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            required
          >
            <option value="">Select user</option>
            {data?.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email} ({user.email})
              </option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={profileForm.employeeCode}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, employeeCode: e.target.value }))
              }
              placeholder="Employee code"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={profileForm.warehouseId}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, warehouseId: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">No warehouse</option>
              {data?.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
            <select
              value={profileForm.paymentType}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, paymentType: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="MONTHLY">MONTHLY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="DAILY">DAILY</option>
            </select>
            <input
              value={profileForm.baseSalary}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, baseSalary: e.target.value }))
              }
              placeholder="Base salary"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              required
            />
            <input
              value={profileForm.paymentMethod}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, paymentMethod: e.target.value }))
              }
              placeholder="Payment method"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              type="date"
              value={profileForm.joiningDate}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, joiningDate: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={profileForm.bankName}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, bankName: e.target.value }))
              }
              placeholder="Bank name"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={profileForm.bankAccountNo}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, bankAccountNo: e.target.value }))
              }
              placeholder="Bank account no"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={profileForm.accountHolder}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, accountHolder: e.target.value }))
              }
              placeholder="Account holder"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={profileForm.mobileBankingNo}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  mobileBankingNo: e.target.value,
                }))
              }
              placeholder="Mobile banking no"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <textarea
            value={profileForm.notes}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="Notes"
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={profileForm.isActive}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Profile active
          </label>
          <button
            type="submit"
            disabled={submitting === "profile"}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting === "profile"
              ? "Saving..."
              : editingProfileId
                ? "Update profile"
                : "Create profile"}
          </button>
        </form>

        <form
          onSubmit={submitPeriod}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Payroll Period
              </h2>
              <p className="text-sm text-muted-foreground">
                Run monthly or weekly payroll windows.
              </p>
            </div>
            {editingPeriodId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingPeriodId(null);
                  setPeriodForm(periodDefaults);
                }}
                className="text-xs text-muted-foreground"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
          <input
            value={periodForm.name}
            onChange={(e) =>
              setPeriodForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Period name"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            required
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={periodForm.startDate}
              onChange={(e) =>
                setPeriodForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              required
            />
            <input
              type="date"
              value={periodForm.endDate}
              onChange={(e) =>
                setPeriodForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              required
            />
          </div>
          <select
            value={periodForm.status}
            onChange={(e) =>
              setPeriodForm((f) => ({ ...f, status: e.target.value }))
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="OPEN">OPEN</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <textarea
            value={periodForm.notes}
            onChange={(e) =>
              setPeriodForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="Period notes"
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting === "period"}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting === "period"
              ? "Saving..."
              : editingPeriodId
                ? "Update period"
                : "Create period"}
          </button>
        </form>

        <form
          onSubmit={submitEntry}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Payroll Entry
              </h2>
              <p className="text-sm text-muted-foreground">
                Record monthly salary, bonus, and deduction.
              </p>
            </div>
            {editingEntryId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingEntryId(null);
                  setEntryForm(entryDefaults);
                  setIsNetAmountManual(false);
                }}
                className="text-xs text-muted-foreground"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
          <select
            value={entryForm.payrollProfileId}
            onChange={(e) =>
              setEntryForm((f) => ({ ...f, payrollProfileId: e.target.value }))
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            required
          >
            <option value="">Select payroll profile</option>
            {data?.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.user.name || profile.user.email} ·{" "}
                {formatMoney(profile.baseSalary)}
              </option>
            ))}
          </select>
          <select
            value={entryForm.payrollPeriodId}
            onChange={(e) =>
              setEntryForm((f) => ({ ...f, payrollPeriodId: e.target.value }))
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            required
          >
            <option value="">Select payroll period</option>
            {data?.periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.status})
              </option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={entryForm.warehouseId}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, warehouseId: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">No warehouse</option>
              {data?.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
            <select
              value={entryForm.paymentStatus}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, paymentStatus: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="PROCESSING">PROCESSING</option>
            </select>
            <input
              value={entryForm.basicAmount}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, basicAmount: e.target.value }))
              }
              placeholder="Basic amount"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              required
            />
            <input
              value={entryForm.overtimeAmount}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, overtimeAmount: e.target.value }))
              }
              placeholder="Overtime amount"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={entryForm.bonusAmount}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, bonusAmount: e.target.value }))
              }
              placeholder="Bonus amount"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={entryForm.deductionAmount}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, deductionAmount: e.target.value }))
              }
              placeholder="Deduction amount"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              value={entryForm.netAmount}
              onChange={(e) => {
                const nextValue = e.target.value;
                setIsNetAmountManual(nextValue.trim() !== "");
                setEntryForm((f) => ({ ...f, netAmount: nextValue }));
              }}
              placeholder="Net amount (optional auto-calc)"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm md:col-span-2"
            />
            <input
              type="date"
              value={entryForm.paidAt}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, paidAt: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm md:col-span-2"
            />
          </div>
          <textarea
            value={entryForm.note}
            onChange={(e) =>
              setEntryForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Entry note"
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting === "entry"}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting === "entry"
              ? "Saving..."
              : editingEntryId
                ? "Update entry"
                : "Create / update entry"}
          </button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Payroll Profiles
          </h2>
          <div className="mt-4 space-y-3">
            {data?.profiles.length ? (
              data.profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {profile.user.name || profile.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfileId(profile.id);
                        setProfileForm({
                          userId: profile.userId,
                          warehouseId: profile.warehouseId
                            ? String(profile.warehouseId)
                            : "",
                          employeeCode: profile.employeeCode || "",
                          paymentType: profile.paymentType || "MONTHLY",
                          baseSalary: String(profile.baseSalary || ""),
                          bankName: profile.bankName || "",
                          bankAccountNo: profile.bankAccountNo || "",
                          accountHolder: profile.accountHolder || "",
                          mobileBankingNo: profile.mobileBankingNo || "",
                          paymentMethod: profile.paymentMethod || "",
                          joiningDate: profile.joiningDate?.slice(0, 10) || "",
                          isActive: profile.isActive,
                          notes: profile.notes || "",
                        });
                      }}
                      className="text-xs font-medium text-primary"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {formatMoney(profile.baseSalary)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.paymentType} ·{" "}
                    {profile.paymentMethod || "No payment method"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.warehouse?.name || "No warehouse"} ·{" "}
                    {profile._count?.entries || 0} entries
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No payroll profile created yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Payroll Periods
          </h2>
          <div className="mt-4 space-y-3">
            {data?.periods.length ? (
              data.periods.map((period) => (
                <div
                  key={period.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {period.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(period.startDate)} -{" "}
                        {formatDate(period.endDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPeriodId(period.id);
                        setPeriodForm({
                          name: period.name,
                          startDate: period.startDate.slice(0, 10),
                          endDate: period.endDate.slice(0, 10),
                          status: period.status,
                          notes: period.notes || "",
                        });
                      }}
                      className="text-xs font-medium text-primary"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {period.status} · {period._count?.entries || 0} entries
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No payroll period created yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Entries
          </h2>
          <div className="mt-4 space-y-3">
            {data?.entries.length ? (
              data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.payrollProfile.user.name ||
                          entry.payrollProfile.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.payrollPeriod.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextEntryForm = {
                          payrollProfileId: String(entry.payrollProfileId),
                          payrollPeriodId: String(entry.payrollPeriodId),
                          warehouseId: entry.warehouseId
                            ? String(entry.warehouseId)
                            : "",
                          basicAmount: String(entry.basicAmount || ""),
                          overtimeAmount: String(entry.overtimeAmount || 0),
                          bonusAmount: String(entry.bonusAmount || 0),
                          deductionAmount: String(entry.deductionAmount || 0),
                          netAmount: String(entry.netAmount || ""),
                          paymentStatus: entry.paymentStatus,
                          paidAt: entry.paidAt?.slice(0, 10) || "",
                          note: entry.note || "",
                        };
                        setEditingEntryId(entry.id);
                        setIsNetAmountManual(
                          nextEntryForm.netAmount !==
                            calculateNetAmountValue(nextEntryForm),
                        );
                        setEntryForm(nextEntryForm);
                      }}
                      className="text-xs font-medium text-primary"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Net {formatMoney(entry.netAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Basic {formatMoney(entry.basicAmount)} · OT{" "}
                    {formatMoney(entry.overtimeAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bonus {formatMoney(entry.bonusAmount)} · Deduction{" "}
                    {formatMoney(entry.deductionAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.paymentStatus} · Paid at {formatDate(entry.paidAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No payroll entry created yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
