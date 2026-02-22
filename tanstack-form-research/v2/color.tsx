// form-fields/color.tsx

import {
  ColorInput,
  type ColorInputProps,
  ColorPicker,
  type ColorPickerProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

// ── ColorInput ───────────────────────────────────────────────────────────────

type FormColorInputProps = {
  field: Field<string>;
} & Omit<ColorInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormColorInput({ field, ...rest }: FormColorInputProps) {
  return (
    <ColorInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── ColorPicker ──────────────────────────────────────────────────────────────

type FormColorPickerProps = {
  field: Field<string>;
} & Omit<ColorPickerProps, "value" | "onChange">;

export function FormColorPicker({ field, ...rest }: FormColorPickerProps) {
  return (
    <ColorPicker
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}
