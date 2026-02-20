// form-fields/time.tsx

import {
  TimeInput,
  type TimeInputProps,
  TimePicker,
  type TimePickerProps,
} from "@mantine/dates";
import { type Field, firstError } from "./types";

// ── TimeInput ────────────────────────────────────────────────────────────────

type FormTimeInputProps = {
  field: Field<string>;
} & Omit<TimeInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormTimeInput({ field, ...rest }: FormTimeInputProps) {
  return (
    <TimeInput
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── TimePicker ───────────────────────────────────────────────────────────────

type FormTimePickerProps = {
  field: Field<string>;
} & Omit<TimePickerProps, "value" | "onChange" | "onBlur" | "error">;

export function FormTimePicker({ field, ...rest }: FormTimePickerProps) {
  return (
    <TimePicker
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}
