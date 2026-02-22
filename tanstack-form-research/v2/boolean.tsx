// form-fields/boolean.tsx

import {
  Checkbox,
  type CheckboxProps,
  Switch,
  type SwitchProps,
  Chip,
  type ChipProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

// ── Checkbox ─────────────────────────────────────────────────────────────────

type FormCheckboxProps = {
  field: Field<boolean>;
} & Omit<CheckboxProps, "checked" | "onChange" | "onBlur" | "error">;

export function FormCheckbox({ field, ...rest }: FormCheckboxProps) {
  return (
    <Checkbox
      checked={field.state.value}
      onChange={(e) => field.handleChange(e.target.checked)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────

type FormSwitchProps = {
  field: Field<boolean>;
} & Omit<SwitchProps, "checked" | "onChange" | "onBlur" | "error">;

export function FormSwitch({ field, ...rest }: FormSwitchProps) {
  return (
    <Switch
      checked={field.state.value}
      onChange={(e) => field.handleChange(e.target.checked)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────

type FormChipProps = {
  field: Field<boolean>;
} & Omit<ChipProps, "checked" | "onChange">;

export function FormChip({ field, ...rest }: FormChipProps) {
  return (
    <Chip checked={field.state.value} onChange={field.handleChange} {...rest} />
  );
}
