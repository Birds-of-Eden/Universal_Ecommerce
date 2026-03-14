"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SalesDailyRow = {
  date: string;
  orders: number;
  revenue: number;
  vat: number;
};

type SalesTopProductRow = {
  productId: number;
  name: string;
  quantity: number;
  revenue: number;
};

type ProfitVariantRow = {
  variantId: number;
  sku: string;
  productName: string;
  optionsText: string;
  quantity: number;
  revenue: number;
  estimatedCost: number;
  grossProfit: number;
};

type VatCountryRow = {
  country: string;
  vatAmount: number;
  orders: number;
};

type VatClassRow = {
  className: string;
  classCode: string;
  rate: number;
  inclusive: boolean;
  vatAmount: number;
  taxCharge: number;
  orders: number;
};

type WarehouseRow = {
  warehouseId: number;
  name: string;
  code: string;
  quantity: number;
  reserved: number;
};

type LowStockRow = {
  variantId: number;
  sku: string;
  productName: string;
  stock: number;
  lowStockThreshold: number;
  status: string;
};

type InventoryReasonRow = {
  reason: string;
  change: number;
  events: number;
};

type InventoryLogRow = {
  id: number;
  createdAt: string;
  reason: string;
  change: number;
  productName: string;
  variantSku: string;
  warehouseName: string;
};

type CourierRow = {
  courier: string;
  shipments: number;
  delivered: number;
  proofs: number;
};

type DeliveryExceptionRow = {
  shipmentId: number;
  orderId: number;
  courier: string;
  status: string;
  customer: string;
  phone: string;
  proofStatus: string;
};

type ReportsResponse = {
  filters: {
    from: string;
    to: string;
  };
  sales: {
    summary: {
      totalOrders: number;
      activeOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      paidOrders: number;
      unpaidOrders: number;
      subtotal: number;
      shippingTotal: number;
      vatTotal: number;
      grandTotal: number;
      refundTotal: number;
      netSales: number;
      paidTotal: number;
      unpaidTotal: number;
      averageOrderValue: number;
    };
    daily: SalesDailyRow[];
    topProducts: SalesTopProductRow[];
  };
  profit: {
    summary: {
      grossSales: number;
      estimatedCost: number;
      grossProfit: number;
      refundedEstimatedCost: number;
      netProfit: number;
      marginPct: number;
      netMarginPct: number;
      missingCostItems: number;
      completedRefunds: number;
      refundedUnits: number;
    };
    topVariants: ProfitVariantRow[];
  };
  vat: {
    summary: {
      totalVatCollected: number;
      inclusiveVatTotal: number;
      exclusiveVatTotal: number;
      taxedOrders: number;
    };
    byCountry: VatCountryRow[];
    byClass: VatClassRow[];
  };
  inventory: {
    summary: {
      totalVariants: number;
      totalUnits: number;
      reservedUnits: number;
      lowStockCount: number;
      outOfStockCount: number;
      movementIn: number;
      movementOut: number;
    };
    warehouses: WarehouseRow[];
    lowStock: LowStockRow[];
    movementReasons: InventoryReasonRow[];
    recentLogs: InventoryLogRow[];
  };
  delivery: {
    summary: {
      totalShipments: number;
      delivered: number;
      outForDelivery: number;
      inTransit: number;
      returned: number;
      cancelled: number;
      proofConfirmed: number;
      proofPending: number;
    };
    byCourier: CourierRow[];
    exceptions: DeliveryExceptionRow[];
  };
};

type ExportSection = "sales" | "profit" | "vat" | "inventory" | "delivery";

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildInitialFromDate() {
  const current = new Date();
  current.setDate(current.getDate() - 29);
  return formatDateInput(current);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-BD").format(value || 0);
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
        {hint ? <div className="mt-2 text-sm text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  onExport,
}: {
  title: string;
  description: string;
  onExport: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}

export default function ReportsDashboard() {
  const [from, setFrom] = useState(buildInitialFromDate);
  const [to, setTo] = useState(() => formatDateInput(new Date()));
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchReports = async (nextFrom: string, nextTo: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        from: nextFrom,
        to: nextTo,
      });
      const response = await fetch(`/api/reports/overview?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Failed to load reports (${response.status})`);
      }

      const payload = (await response.json()) as ReportsResponse;
      setData(payload);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load reports.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports(from, to);
  }, []);

  const handleApply = () => {
    startTransition(() => {
      void fetchReports(from, to);
    });
  };

  const exportSection = (section: ExportSection) => {
    const params = new URLSearchParams({
      section,
      from,
      to,
    });
    window.open(`/api/reports/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const heroMetrics = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Sales Revenue",
        value: formatCurrency(data.sales.summary.grandTotal),
        hint: `${formatNumber(data.sales.summary.activeOrders)} active orders in range`,
      },
      {
        label: "Gross Profit",
        value: formatCurrency(data.profit.summary.netProfit),
        hint: `${data.profit.summary.netMarginPct.toFixed(2)}% net margin`,
      },
      {
        label: "Collected VAT",
        value: formatCurrency(data.vat.summary.totalVatCollected),
        hint: `${formatNumber(data.vat.summary.taxedOrders)} taxed orders`,
      },
      {
        label: "Units On Hand",
        value: formatNumber(data.inventory.summary.totalUnits),
        hint: `${formatNumber(data.inventory.summary.lowStockCount)} low-stock variants`,
      },
      {
        label: "Proof Confirmed",
        value: formatNumber(data.delivery.summary.proofConfirmed),
        hint: `${formatNumber(data.delivery.summary.proofPending)} proofs still pending`,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[28px] border border-border/60 bg-gradient-to-br from-card via-card to-muted/35 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Commerce Reports
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sales, margin, tax, inventory and delivery in one place</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Filter by date range, review operational health, and export report slices for finance or ops follow-up.
              </p>
            </div>
          </div>

          <Card className="border-border/70 bg-background/90 shadow-none">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reports-from">
                  From
                </label>
                <Input id="reports-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reports-to">
                  To
                </label>
                <Input id="reports-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApply} disabled={loading || isPending}>
                  {(loading || isPending) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {heroMetrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
        ))}
      </div>

      {data ? (
        <>
          <section>
            <SectionHeader
              title="Sales Report"
              description={`Revenue and order flow from ${data.filters.from} to ${data.filters.to}.`}
              onExport={() => exportSection("sales")}
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCard label="Gross Revenue" value={formatCurrency(data.sales.summary.grandTotal)} hint={`${formatCurrency(data.sales.summary.averageOrderValue)} average order`} />
              <MetricCard label="Net Sales" value={formatCurrency(data.sales.summary.netSales)} hint={`${formatCurrency(data.sales.summary.refundTotal)} refunds`} />
              <MetricCard label="Subtotal" value={formatCurrency(data.sales.summary.subtotal)} hint={`${formatCurrency(data.sales.summary.shippingTotal)} shipping collected`} />
              <MetricCard label="Delivered Orders" value={formatNumber(data.sales.summary.deliveredOrders)} hint={`${formatNumber(data.sales.summary.cancelledOrders)} cancelled`} />
              <MetricCard label="Paid Orders" value={formatNumber(data.sales.summary.paidOrders)} hint={`${formatCurrency(data.sales.summary.unpaidTotal)} unpaid value`} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                  <CardDescription>Daily order volume, revenue and VAT.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.daily.length ? data.sales.daily.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.orders)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.vat)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No sales data in this range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Highest revenue products in the selected range.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.topProducts.length ? data.sales.topProducts.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No product sales found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <SectionHeader
              title="Profit Report"
              description="Estimated gross margin using stored purchase prices on variants."
              onExport={() => exportSection("profit")}
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCard label="Gross Sales" value={formatCurrency(data.profit.summary.grossSales)} />
              <MetricCard label="Estimated Cost" value={formatCurrency(data.profit.summary.estimatedCost)} />
              <MetricCard label="Net Profit" value={formatCurrency(data.profit.summary.netProfit)} hint={`${formatCurrency(data.profit.summary.refundedEstimatedCost)} refunded cost`} />
              <MetricCard label="Refund Impact" value={formatNumber(data.profit.summary.completedRefunds)} hint={`${formatNumber(data.profit.summary.refundedUnits)} refunded units`} />
            </div>
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Profitable Variants</CardTitle>
                  <CardDescription>Variants with the highest estimated gross profit contribution.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.profit.topVariants.length ? data.profit.topVariants.map((row) => (
                        <TableRow key={row.variantId}>
                          <TableCell>
                            <div className="font-medium">{row.sku}</div>
                            {row.optionsText ? <div className="text-xs text-muted-foreground">{row.optionsText}</div> : null}
                          </TableCell>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.estimatedCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.grossProfit)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">No profit rows available in this range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <SectionHeader
              title="VAT Report"
              description="Collected VAT grouped by tax class and shipping destination."
              onExport={() => exportSection("vat")}
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCard label="Total VAT" value={formatCurrency(data.vat.summary.totalVatCollected)} />
              <MetricCard label="Inclusive VAT" value={formatCurrency(data.vat.summary.inclusiveVatTotal)} />
              <MetricCard label="Exclusive VAT" value={formatCurrency(data.vat.summary.exclusiveVatTotal)} />
              <MetricCard label="Taxed Orders" value={formatNumber(data.vat.summary.taxedOrders)} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader>
                  <CardTitle>VAT by Country</CardTitle>
                  <CardDescription>Collected VAT based on order destination.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.vat.byCountry.length ? data.vat.byCountry.map((row) => (
                        <TableRow key={row.country}>
                          <TableCell>{row.country}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.orders)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.vatAmount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No VAT data found for the selected range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>VAT by Class</CardTitle>
                  <CardDescription>Tax class performance pulled from saved order tax snapshots.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Inclusive</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.vat.byClass.length ? data.vat.byClass.map((row) => (
                        <TableRow key={`${row.classCode}-${row.rate}-${row.inclusive ? "i" : "e"}`}>
                          <TableCell>
                            <div className="font-medium">{row.className}</div>
                            <div className="text-xs text-muted-foreground">{row.classCode}</div>
                          </TableCell>
                          <TableCell className="text-right">{row.rate.toFixed(2)}%</TableCell>
                          <TableCell className="text-right">{row.inclusive ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.vatAmount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No tax class snapshot rows found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>
          <section>
            <SectionHeader
              title="Inventory Report"
              description="Current stock snapshot plus movement activity inside the selected range."
              onExport={() => exportSection("inventory")}
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCard label="Tracked Variants" value={formatNumber(data.inventory.summary.totalVariants)} />
              <MetricCard label="Units On Hand" value={formatNumber(data.inventory.summary.totalUnits)} hint={`${formatNumber(data.inventory.summary.reservedUnits)} reserved`} />
              <MetricCard label="Low Stock" value={formatNumber(data.inventory.summary.lowStockCount)} hint={`${formatNumber(data.inventory.summary.outOfStockCount)} out of stock`} />
              <MetricCard label="Movement" value={`${formatNumber(data.inventory.summary.movementIn)} in / ${formatNumber(data.inventory.summary.movementOut)} out`} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Warehouse Stock</CardTitle>
                  <CardDescription>Current quantity and reserved units by warehouse.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.warehouses.length ? data.inventory.warehouses.map((row) => (
                        <TableRow key={row.warehouseId}>
                          <TableCell>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">{row.code}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.reserved)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No warehouse stock records found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alerts</CardTitle>
                  <CardDescription>Variants that need replenishment attention.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.lowStock.length ? data.inventory.lowStock.map((row) => (
                        <TableRow key={row.variantId}>
                          <TableCell>{row.sku}</TableCell>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.stock)}</TableCell>
                          <TableCell className="text-right">{row.status.replaceAll("_", " ")}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No low-stock alerts right now.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Movement Reasons</CardTitle>
                  <CardDescription>Net stock movement grouped by logged reason.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">Net Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.movementReasons.length ? data.inventory.movementReasons.slice(0, 10).map((row) => (
                        <TableRow key={row.reason}>
                          <TableCell>{row.reason}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.events)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.change)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No inventory movements logged in this range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Inventory Logs</CardTitle>
                  <CardDescription>Latest stock change events captured in the selected range.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.recentLogs.length ? data.inventory.recentLogs.slice(0, 10).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.productName}</div>
                            {row.variantSku ? <div className="text-xs text-muted-foreground">{row.variantSku}</div> : null}
                          </TableCell>
                          <TableCell>{row.warehouseName || "N/A"}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.change)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No inventory log rows found in this range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <SectionHeader
              title="Delivery Report"
              description="Shipment outcomes and customer delivery proof coverage."
              onExport={() => exportSection("delivery")}
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <MetricCard label="Shipments" value={formatNumber(data.delivery.summary.totalShipments)} />
              <MetricCard label="Delivered" value={formatNumber(data.delivery.summary.delivered)} hint={`${formatNumber(data.delivery.summary.outForDelivery)} out for delivery`} />
              <MetricCard label="Proof Confirmed" value={formatNumber(data.delivery.summary.proofConfirmed)} hint={`${formatNumber(data.delivery.summary.proofPending)} pending proof`} />
              <MetricCard label="Returns / Cancelled" value={`${formatNumber(data.delivery.summary.returned)} / ${formatNumber(data.delivery.summary.cancelled)}`} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Courier Performance</CardTitle>
                  <CardDescription>Shipment count, delivered count and proof coverage by courier.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Courier</TableHead>
                        <TableHead className="text-right">Shipments</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Proofs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.delivery.byCourier.length ? data.delivery.byCourier.map((row) => (
                        <TableRow key={row.courier}>
                          <TableCell>{row.courier}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.shipments)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.delivered)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.proofs)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No shipment activity found in this range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Exceptions</CardTitle>
                  <CardDescription>Returned, cancelled or proof-missing shipment records.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Courier</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.delivery.exceptions.length ? data.delivery.exceptions.map((row) => (
                        <TableRow key={row.shipmentId}>
                          <TableCell>
                            <div className="font-medium">#{row.shipmentId}</div>
                            <div className="text-xs text-muted-foreground">Order #{row.orderId}</div>
                          </TableCell>
                          <TableCell>
                            <div>{row.customer}</div>
                            {row.phone ? <div className="text-xs text-muted-foreground">{row.phone}</div> : null}
                          </TableCell>
                          <TableCell>{row.courier}</TableCell>
                          <TableCell className="text-right">
                            <div>{row.status.replaceAll("_", " ")}</div>
                            <div className="text-xs text-muted-foreground">{row.proofStatus}</div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No delivery exceptions in the selected range.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : !loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No report data available.</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
