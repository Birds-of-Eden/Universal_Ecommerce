export type VariantOptionInput = {
  name: string;
  values: string[];
};

export function normalizeVariantOptions(input: unknown): VariantOptionInput[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((option: any) => {
      const name = String(option?.name || "").trim();
      const values = Array.isArray(option?.values)
        ? option.values
            .map((value: unknown) => String(value || "").trim())
            .filter(Boolean)
        : [];

      return {
        name,
        values: Array.from(new Set(values)) as string[],
      };
    })
    .filter((option) => option.name && option.values.length > 0);
}

export function sortOptionObject(
  options: Record<string, unknown>,
  orderedNames: string[],
) {
  const sortedEntries = orderedNames
    .map((name) => [name, options[name]])
    .filter(([, value]) => value !== undefined);

  if (options.__meta !== undefined) {
    sortedEntries.push(["__meta", options.__meta]);
  }

  return Object.fromEntries(sortedEntries);
}
