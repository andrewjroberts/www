// form-fields/radio.tsx

import {
  Radio,
  type RadioGroupProps,
  SegmentedControl,
  type SegmentedControlProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

// ── Radio.Group ──────────────────────────────────────────────────────────────

type FormRadioGroupProps = {
  field: Field<string>;
} & Omit<RadioGroupProps, "value" | "onChange" | "error">;

export function FormRadioGroup({
  field,
  children,
  ...rest
}: FormRadioGroupProps) {
  return (
    <Radio.Group
      value={field.state.value}
      onChange={field.handleChange}
      error={firstError(field.state.meta)}
      {...rest}
    >
      {children}
    </Radio.Group>
  );
}

// ── SegmentedControl ─────────────────────────────────────────────────────────

type FormSegmentedControlProps = {
  field: Field<string>;
} & Omit<SegmentedControlProps, "value" | "onChange">;

export function FormSegmentedControl({
  field,
  ...rest
}: FormSegmentedControlProps) {
  return (
    <SegmentedControl
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}
