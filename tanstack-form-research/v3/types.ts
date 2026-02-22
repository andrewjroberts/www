// =============================================================================
// form-fields/types.ts — Shared structural types
// =============================================================================

export type FieldMeta = {
  errors: unknown[];
};

export type Field<TValue> = {
  state: {
    value: TValue;
    meta: FieldMeta;
  };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
};

export function firstError(meta: FieldMeta): string | undefined {
  const err = meta.errors[0];
  if (err == null) return undefined;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return (err as { message: string }).message;
  }
  return String(err);
}

/** Standard option shape used across all combobox components */
export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
};

/** Resolved entity shape returned by APIs and stored in Query cache */
export type ResolvedEntity = {
  id: string;
  name: string;
  [key: string]: unknown;
};
