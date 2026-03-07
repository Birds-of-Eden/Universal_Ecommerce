"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = {
  id: number | string;
  price?: number | string | null;
  stock?: number | null;
  sku?: string | null;
  options?: Record<string, string> | null;
};

type VariantSelectorProps = {
  variants: Variant[];
  value?: Variant | null;
  onChange: (variant: Variant | null) => void;
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function toStockNumber(stock: number | null | undefined) {
  const value = typeof stock === "number" ? stock : Number(stock);
  return Number.isFinite(value) ? value : 0;
}

function variantInStock(variant: Variant) {
  return toStockNumber(variant.stock) > 0;
}

export default function VariantSelector({
  variants,
  value,
  onChange,
}: VariantSelectorProps) {
  const normalizedVariants = useMemo(() => {
    return variants.map((variant, index) => {
      const options =
        variant.options && typeof variant.options === "object"
          ? Object.fromEntries(
              Object.entries(variant.options)
                .filter(
                  ([, optionValue]) =>
                    typeof optionValue === "string" && optionValue.trim(),
                )
                .map(([optionKey, optionValue]) => [
                  normalizeKey(optionKey),
                  optionValue.trim(),
                ]),
            )
          : {};

      return {
        ...variant,
        options,
        originalOptions: variant.options ?? {},
        signature: Object.keys(options).sort().join("|"),
        label: Object.keys(options).length
          ? Object.entries(options)
              .map(([optionKey, optionValue]) => `${optionKey}: ${optionValue}`)
              .join(" • ")
          : `Variant ${index + 1}`,
      };
    });
  }, [variants]);

  const optionMeta = useMemo(() => {
    const labelByKey = new Map<string, string>();
    const valuesByKey = new Map<string, string[]>();

    variants.forEach((variant) => {
      Object.entries(variant.options ?? {}).forEach(([rawKey, rawValue]) => {
        if (typeof rawValue !== "string" || !rawValue.trim()) return;

        const normalizedKey = normalizeKey(rawKey);
        if (!labelByKey.has(normalizedKey)) {
          labelByKey.set(normalizedKey, rawKey.trim());
        }

        const nextValues = valuesByKey.get(normalizedKey) ?? [];
        const trimmedValue = rawValue.trim();
        if (!nextValues.includes(trimmedValue)) {
          nextValues.push(trimmedValue);
          valuesByKey.set(normalizedKey, nextValues);
        }
      });
    });

    return { labelByKey, valuesByKey };
  }, [variants]);

  const optionKeys = useMemo(
    () => Array.from(optionMeta.labelByKey.keys()),
    [optionMeta.labelByKey],
  );

  const hasOptionData = optionKeys.length > 0;
  const uniqueSignatures = new Set(
    normalizedVariants.map((variant) => variant.signature || "(none)"),
  );
  const useVariantCards = !hasOptionData || uniqueSignatures.size > 1;

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!value) {
      setSelectedOptions({});
      return;
    }
    setSelectedOptions(value.options ?? {});
  }, [value]);

  const pickBestVariant = (selection: Record<string, string>) => {
    const exactMatch = normalizedVariants.find((variant) => {
      const keys = Object.keys(variant.options ?? {});
      if (keys.length !== optionKeys.length) return false;
      return optionKeys.every(
        (optionKey) => variant.options?.[optionKey] === selection[optionKey],
      );
    });

    if (exactMatch) return exactMatch;

    const partialMatch = normalizedVariants.find((variant) => {
      const keys = Object.keys(variant.options ?? {});
      if (keys.length === 0) return false;
      return keys.every(
        (optionKey) => selection[optionKey] === variant.options?.[optionKey],
      );
    });

    return partialMatch ?? null;
  };

  const handleChipSelect = (optionKey: string, optionValue: string) => {
    const nextSelection = {
      ...selectedOptions,
      [optionKey]: optionValue,
    };

    setSelectedOptions(nextSelection);

    const matchedVariant = pickBestVariant(nextSelection);
    onChange(matchedVariant);
  };

  const resetSelection = () => {
    setSelectedOptions({});
    onChange(null);
  };

  const helperText = useVariantCards
    ? "Starting price is shown above. Pick a variant to see exact price, stock, and SKU."
    : "Starting price is shown above. Choose your options to reveal the exact final price.";

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Choose Your Variant
          </div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {helperText}
          </div>
        </div>

        <button
          type="button"
          onClick={resetSelection}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
        >
          Reset
        </button>
      </div>

      {useVariantCards ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {normalizedVariants.map((variant) => {
            const active = value?.id === variant.id;
            const inStock = variantInStock(variant);

            return (
              <button
                key={String(variant.id)}
                type="button"
                onClick={() => {
                  setSelectedOptions(variant.options ?? {});
                  onChange(variant);
                }}
                className={cn(
                  "rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border bg-background hover:border-primary/50",
                  !inStock && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {variant.label}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      SKU: {variant.sku ?? "—"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-medium",
                      inStock
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {inStock
                      ? `${toStockNumber(variant.stock)} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {optionKeys.map((optionKey) => (
            <div key={optionKey}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-foreground">
                  {optionMeta.labelByKey.get(optionKey) ?? optionKey}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedOptions[optionKey]
                    ? `Selected: ${selectedOptions[optionKey]}`
                    : "Select one"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(optionMeta.valuesByKey.get(optionKey) ?? []).map(
                  (optionValue) => {
                    const active = selectedOptions[optionKey] === optionValue;
                    const matchesAny = normalizedVariants.some((variant) => {
                      if (!variantInStock(variant)) return false;
                      return Object.entries({
                        ...selectedOptions,
                        [optionKey]: optionValue,
                      }).every(
                        ([selectedKey, selectedValue]) =>
                          !selectedValue ||
                          variant.options?.[selectedKey] === undefined ||
                          variant.options?.[selectedKey] === selectedValue,
                      );
                    });

                    return (
                      <button
                        key={optionValue}
                        type="button"
                        disabled={!matchesAny}
                        onClick={() => handleChipSelect(optionKey, optionValue)}
                        className={cn(
                          "rounded-xl border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          active &&
                            "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                          !active &&
                            matchesAny &&
                            "border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5",
                          !matchesAny &&
                            "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground opacity-60 line-through",
                        )}
                      >
                        {optionValue}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
