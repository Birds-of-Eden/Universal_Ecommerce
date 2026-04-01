"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, ShieldCheck, Truck } from "lucide-react";

type ProofResponse = {
  shipment: {
    id: number;
    orderId: number;
    courier?: string | null;
    trackingNumber?: string | null;
    status: string;
    expectedDate?: string | null;
    deliveredAt?: string | null;
    confirmationReady: boolean;
  };
  order: {
    id: number;
    name: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  };
  proof?: {
    id: number;
    tickReceived: boolean;
    tickCorrectItems: boolean;
    tickGoodCondition: boolean;
    photoUrl?: string | null;
    note?: string | null;
    confirmedAt: string;
  } | null;
};

const CHECKS = [
  { key: "tickReceived", label: "I have received this package." },
  { key: "tickCorrectItems", label: "The delivered items match my order." },
  { key: "tickGoodCondition", label: "The package arrived in acceptable condition." },
] as const;

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DeliveryConfirmationPage() {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [data, setData] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checks, setChecks] = useState({
    tickReceived: false,
    tickCorrectItems: false,
    tickGoodCondition: false,
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid confirmation link.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/delivery-proofs/confirm/${token}`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load confirmation data");
        }

        setData(payload);
        if (payload?.proof) {
          setChecks({
            tickReceived: payload.proof.tickReceived,
            tickCorrectItems: payload.proof.tickCorrectItems,
            tickGoodCondition: payload.proof.tickGoodCondition,
          });
          setNote(payload.proof.note || "");
          setPhotoUrl(payload.proof.photoUrl || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load confirmation data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/delivery-proofs", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.message || payload?.error || "Photo upload failed");
      }

      setPhotoUrl(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/delivery-proofs/confirm/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          note,
          photoUrl: photoUrl || null,
          ...checks,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to submit delivery proof");
      }

      setData((current) =>
        current
          ? {
              ...current,
              shipment: {
                ...current.shipment,
                status: payload?.shipment?.status || current.shipment.status,
                deliveredAt:
                  payload?.shipment?.deliveredAt || current.shipment.deliveredAt,
              },
              proof: payload.proof,
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit delivery proof");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-slate-200" />
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-48 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{error || "Confirmation data unavailable."}</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-slate-700 underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const alreadyConfirmed = Boolean(data.proof);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ef_0%,#eef2f7_100%)] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[30px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Customer Delivery Proof
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                Confirm Delivery
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Order #{data.order.id} {data.shipment.courier ? `via ${data.shipment.courier}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                Shipment Status
              </p>
              <p className="mt-1 text-sm font-semibold">{data.shipment.status}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{data.order.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Truck className="h-5 w-5 text-orange-600" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Tracking
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {data.shipment.trackingNumber || "Not assigned"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Delivery Time
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(data.shipment.deliveredAt || data.shipment.expectedDate)}
              </p>
            </div>
          </div>

          {alreadyConfirmed ? (
            <div className="mt-8 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-600 p-3 text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">
                    Delivery already confirmed
                  </h2>
                  <p className="text-sm text-emerald-800">
                    Submitted on {formatDate(data.proof?.confirmedAt)}
                  </p>
                </div>
              </div>

              {data.proof?.note ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {data.proof.note}
                </p>
              ) : null}

              {data.proof?.photoUrl ? (
                <a
                  href={data.proof.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-emerald-800 underline"
                >
                  View uploaded proof photo
                </a>
              ) : null}
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-medium text-slate-700">
                  Enter the delivery PIN shared by the delivery team, then confirm all three checks.
                </p>

                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Delivery PIN
                  </label>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base tracking-[0.32em] text-slate-950 outline-none ring-0 transition focus:border-slate-950"
                    placeholder="000000"
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {CHECKS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checks[item.key]}
                        onChange={(event) =>
                          setChecks((current) => ({
                            ...current,
                            [item.key]: event.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Optional note
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                    placeholder="Add any issue, exception, or comment about this delivery."
                  />
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Optional photo
                  </label>
                  <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                    <ImagePlus className="h-7 w-7 text-slate-500" />
                    <span className="mt-3 text-sm font-medium text-slate-700">
                      Upload package or handover proof
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Courier face photo is optional, not required.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>

                  {uploading ? (
                    <p className="mt-3 text-xs text-slate-500">Uploading photo...</p>
                  ) : null}

                  {photoUrl ? (
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-medium text-slate-700 underline"
                    >
                      View uploaded photo
                    </a>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || uploading}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit delivery proof
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
