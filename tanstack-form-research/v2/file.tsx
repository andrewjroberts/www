// form-fields/file.tsx

import { FileInput, type FileInputProps } from "@mantine/core";
import { type Field, firstError } from "./types";

// ── FileInput (single) ──────────────────────────────────────────────────────

type FormFileInputProps = {
  field: Field<File | null>;
} & Omit<
  FileInputProps<false>,
  "value" | "onChange" | "onBlur" | "error" | "multiple"
>;

export function FormFileInput({ field, ...rest }: FormFileInputProps) {
  return (
    <FileInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── FileInput (multiple) ────────────────────────────────────────────────────

type FormFileInputMultipleProps = {
  field: Field<File[]>;
} & Omit<
  FileInputProps<true>,
  "value" | "onChange" | "onBlur" | "error" | "multiple"
>;

export function FormFileInputMultiple({
  field,
  ...rest
}: FormFileInputMultipleProps) {
  return (
    <FileInput
      multiple
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}
