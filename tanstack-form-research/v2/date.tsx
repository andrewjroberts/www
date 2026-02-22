// form-fields/date.tsx

import {
  DateInput,
  type DateInputProps,
  DatePickerInput,
  type DatePickerInputProps,
  DateTimePicker,
  type DateTimePickerProps,
  DatePicker,
  type DatePickerProps,
  MonthPickerInput,
  type MonthPickerInputProps,
  YearPickerInput,
  type YearPickerInputProps,
} from "@mantine/dates";
import { type Field, firstError } from "./types";

// ── DateInput ────────────────────────────────────────────────────────────────

type FormDateInputProps = {
  field: Field<Date | null>;
} & Omit<DateInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormDateInput({ field, ...rest }: FormDateInputProps) {
  return (
    <DateInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── DatePickerInput (single) ────────────────────────────────────────────────

type FormDatePickerInputProps = {
  field: Field<Date | null>;
} & Omit<
  DatePickerInputProps<"default">,
  "value" | "onChange" | "onBlur" | "error" | "type"
>;

export function FormDatePickerInput({
  field,
  ...rest
}: FormDatePickerInputProps) {
  return (
    <DatePickerInput
      type="default"
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── DatePickerInput (multiple) ──────────────────────────────────────────────

type FormDatePickerInputMultipleProps = {
  field: Field<Date[]>;
} & Omit<
  DatePickerInputProps<"multiple">,
  "value" | "onChange" | "onBlur" | "error" | "type"
>;

export function FormDatePickerInputMultiple({
  field,
  ...rest
}: FormDatePickerInputMultipleProps) {
  return (
    <DatePickerInput
      type="multiple"
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── DatePickerInput (range) ─────────────────────────────────────────────────

type FormDatePickerInputRangeProps = {
  field: Field<[Date | null, Date | null]>;
} & Omit<
  DatePickerInputProps<"range">,
  "value" | "onChange" | "onBlur" | "error" | "type"
>;

export function FormDatePickerInputRange({
  field,
  ...rest
}: FormDatePickerInputRangeProps) {
  return (
    <DatePickerInput
      type="range"
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── DateTimePicker ───────────────────────────────────────────────────────────

type FormDateTimePickerProps = {
  field: Field<Date | null>;
} & Omit<DateTimePickerProps, "value" | "onChange" | "onBlur" | "error">;

export function FormDateTimePicker({
  field,
  ...rest
}: FormDateTimePickerProps) {
  return (
    <DateTimePicker
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── DatePicker (inline, single) ─────────────────────────────────────────────

type FormDatePickerProps = {
  field: Field<Date | null>;
} & Omit<DatePickerProps<"default">, "value" | "onChange" | "type">;

export function FormDatePicker({ field, ...rest }: FormDatePickerProps) {
  return (
    <DatePicker
      type="default"
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── DatePicker (inline, multiple) ───────────────────────────────────────────

type FormDatePickerMultipleProps = {
  field: Field<Date[]>;
} & Omit<DatePickerProps<"multiple">, "value" | "onChange" | "type">;

export function FormDatePickerMultiple({
  field,
  ...rest
}: FormDatePickerMultipleProps) {
  return (
    <DatePicker
      type="multiple"
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── DatePicker (inline, range) ──────────────────────────────────────────────

type FormDatePickerRangeProps = {
  field: Field<[Date | null, Date | null]>;
} & Omit<DatePickerProps<"range">, "value" | "onChange" | "type">;

export function FormDatePickerRange({
  field,
  ...rest
}: FormDatePickerRangeProps) {
  return (
    <DatePicker
      type="range"
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── MonthPickerInput ────────────────────────────────────────────────────────

type FormMonthPickerInputProps = {
  field: Field<Date | null>;
} & Omit<
  MonthPickerInputProps<"default">,
  "value" | "onChange" | "onBlur" | "error" | "type"
>;

export function FormMonthPickerInput({
  field,
  ...rest
}: FormMonthPickerInputProps) {
  return (
    <MonthPickerInput
      type="default"
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── YearPickerInput ─────────────────────────────────────────────────────────

type FormYearPickerInputProps = {
  field: Field<Date | null>;
} & Omit<
  YearPickerInputProps<"default">,
  "value" | "onChange" | "onBlur" | "error" | "type"
>;

export function FormYearPickerInput({
  field,
  ...rest
}: FormYearPickerInputProps) {
  return (
    <YearPickerInput
      type="default"
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}
