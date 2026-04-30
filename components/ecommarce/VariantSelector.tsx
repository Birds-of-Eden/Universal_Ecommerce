"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = {
  id: number | string;
  price?: number | string | null;
  stock?: number | null;
  sku?: string | null;
  image?: string | null;
  colorImage?: string | null;
  options?: Record<string, unknown> | null;
};

type VariantSelectorProps = {
  variants: Variant[];
  value?: Variant | null;
  onChange: (variant: Variant | null) => void;
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const CSS_COLOR_FUNCTION_REGEX = /^(?:rgb|rgba|hsl|hsla)\(/i;
const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#262626",
  white: "#f5f5f4",
  gray: "#9ca3af",
  grey: "#9ca3af",
  silver: "#c0c0c0",
  red: "#dc2626",
  maroon: "#7f1d1d",
  burgundy: "#6d1f2f",
  blue: "#2563eb",
  navy: "#1e3a8a",
  sky: "#38bdf8",
  green: "#16a34a",
  olive: "#6b8e23",
  mint: "#86efac",
  yellow: "#eab308",
  gold: "#b48a2c",
  orange: "#f59e0b",
  brown: "#8b5e3c",
  coffee: "#6f4e37",
  beige: "#d6c1a2",
  cream: "#eee6d8",
  tan: "#b08968",
  pink: "#ec4899",
  purple: "#7c3aed",
};

function isColorOptionKey(key: string) {
  return /colou?r/i.test(key);
}

function resolveSwatchColor(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return null;

  if (
    HEX_COLOR_REGEX.test(normalizedValue) ||
    CSS_COLOR_FUNCTION_REGEX.test(normalizedValue)
  ) {
    return value.trim();
  }

  const matchedEntry = Object.entries(COLOR_NAME_TO_HEX).find(([token]) =>
    normalizedValue.includes(token),
  );

  return matchedEntry?.[1] ?? "#9ca3af";
}

function toStockNumber(stock: number | null | undefined) {
  const value = typeof stock === "number" ? stock : Number(stock);
  return Number.isFinite(value) ? value : 0;
}

function variantInStock(variant: Variant) {
  return toStockNumber(variant.stock) > 0;
}

function normalizeOptions(
  options: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!options || typeof options !== "object") return {};

  return Object.fromEntries(
    Object.entries(options)
      .filter(
        ([optionKey, optionValue]) =>
          optionKey !== "__meta" &&
          typeof optionValue === "string" &&
          optionValue.trim(),
      )
      .map(([optionKey, optionValue]) => [
        normalizeKey(optionKey),
        optionValue.trim(),
      ]),
  );
}

export default function VariantSelector({
  variants,
  value,
  onChange,
}: VariantSelectorProps) {
  const normalizedVariants = useMemo(() => {
    return variants.map((variant, index) => {
      const options = normalizeOptions(variant.options);

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
  const useVariantCards = !hasOptionData;

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});

  const missingOptionLabels = optionKeys
    .filter((optionKey) => !selectedOptions[optionKey])
    .map((optionKey) => optionMeta.labelByKey.get(optionKey) ?? optionKey);

  useEffect(() => {
    if (!value) {
      setSelectedOptions({});
      return;
    }
    setSelectedOptions(normalizeOptions(value.options));
  }, [value]);

  const pickBestVariant = (selection: Record<string, string>) => {
    if (!optionKeys.every((optionKey) => selection[optionKey])) {
      return null;
    }

    const exactMatch = normalizedVariants.find((variant) => {
      const keys = Object.keys(variant.options ?? {});
      if (keys.length !== optionKeys.length) return false;
      return optionKeys.every(
        (optionKey) => variant.options?.[optionKey] === selection[optionKey],
      );
    });

    return exactMatch ?? null;
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

  return (
    <div className="space-y-4">
      {useVariantCards ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {normalizedVariants.map((variant) => {
            const active = value?.id === variant.id;
            const inStock = variantInStock(variant);

            return (
              <button
                key={String(variant.id)}
                type="button"
                onClick={() => {
                  setSelectedOptions(normalizeOptions(variant.options));
                  onChange(variant);
                }}
                className={cn(
                  "rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50",
                  !inStock && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">
                    {variant.label}
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      inStock
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                    )}
                  >
                    {inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {optionKeys.map((optionKey) => (
            <div key={optionKey}>
              <div className="text-sm font-medium text-foreground mb-2">
                {optionMeta.labelByKey.get(optionKey) ?? optionKey}
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
                          isColorOptionKey(optionKey)
                            ? "inline-flex h-9 min-w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            : "rounded-md border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          active &&
                            (isColorOptionKey(optionKey)
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-primary bg-primary text-primary-foreground"),
                          !active &&
                            matchesAny &&
                            (isColorOptionKey(optionKey)
                              ? "border-border bg-background hover:border-primary/60"
                              : "border-border bg-background text-foreground hover:border-primary/60"),
                          !matchesAny &&
                            (isColorOptionKey(optionKey)
                              ? "cursor-not-allowed border-border/40 bg-muted/30 opacity-50"
                              : "cursor-not-allowed border-border/40 bg-muted/30 text-muted-foreground opacity-50"),
                        )}
                        title={optionValue}
                        aria-label={`${optionMeta.labelByKey.get(optionKey) ?? optionKey}: ${optionValue}`}
                      >
                        {isColorOptionKey(optionKey) ? (
                          <span
                            className="h-5 w-5 rounded-full border border-black/10"
                            style={{
                              backgroundColor:
                                resolveSwatchColor(optionValue) ?? "#9ca3af",
                            }}
                          />
                        ) : (
                          optionValue
                        )}
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
