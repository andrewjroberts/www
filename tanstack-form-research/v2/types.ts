// form-fields/types.ts — Shared structural types

import type { ValidationError } from "@tanstack/react-form";

export type FieldMeta = {
  errors: ValidationError[];
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
  return typeof err === "string" ? err : String(err);
}
