// =============================================================================
// form-fields.tsx — TanStack Form + Mantine v7 Typed Wrappers (Zero Casts)
// =============================================================================
//
// Structural field types bridge TanStack's FieldApi to Mantine components.
// When TanStack resolves the concrete FieldApi at the call site, TypeScript's
// structural typing ensures the field's value matches — no generics, no casts.
//
//   <form.Field name="email"                    // TS resolves value → string
//     children={(field) =>
//       <FormTextInput field={field} label="Email" />  // Field<string> ✅
//     }
//   />
//
//   <form.Field name="age"                      // TS resolves value → number
//     children={(field) =>
//       <FormTextInput field={field} />          // Field<string> ❌ compile error
//     }
//   />
// =============================================================================

import type { ValidationError } from "@tanstack/react-form";

import {
  TextInput,
  type TextInputProps,
  Textarea,
  type TextareaProps,
  NumberInput,
  type NumberInputProps,
  PasswordInput,
  type PasswordInputProps,
  Checkbox,
  type CheckboxProps,
  Switch,
  type SwitchProps,
  Radio,
  type RadioGroupProps,
  Slider,
  type SliderProps,
  RangeSlider,
  type RangeSliderProps,
  AngleSlider,
  type AngleSliderProps,
  Rating,
  type RatingProps,
  SegmentedControl,
  type SegmentedControlProps,
  ColorInput,
  type ColorInputProps,
  ColorPicker,
  type ColorPickerProps,
  NativeSelect,
  type NativeSelectProps,
  PinInput,
  type PinInputProps,
  FileInput,
  type FileInputProps,
  JsonInput,
  type JsonInputProps,
  Chip,
  type ChipProps,
  Select,
  type SelectProps,
  MultiSelect,
  type MultiSelectProps,
  Autocomplete,
  type AutocompleteProps,
  TagsInput,
  type TagsInputProps,
} from "@mantine/core";

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
  TimeInput,
  type TimeInputProps,
  TimePicker,
  type TimePickerProps,
} from "@mantine/dates";

// =============================================================================
//  Structural Field Type
// =============================================================================
//
//  This mirrors the subset of FieldApi that wrappers actually use.
//  One type, parameterized by value. No generics on the wrapper functions.
//
//  Why this works:
//    TanStack's <form.Field name="x"> resolves FieldApi<Form, "x"> at the
//    call site with a concrete value type. When you pass that to a wrapper
//    expecting Field<string>, TypeScript checks structurally — if the concrete
//    value isn't string, it's a compile error. Zero casts needed.
// =============================================================================

type FieldMeta = {
  errors: ValidationError[];
};

type Field<TValue> = {
  state: {
    value: TValue;
    meta: FieldMeta;
  };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
};

function firstError(meta: FieldMeta): string | undefined {
  const err = meta.errors[0];
  if (err == null) return undefined;
  return typeof err === "string" ? err : String(err);
}

// =============================================================================
//  INPUTS
// =============================================================================

// ── TextInput ────────────────────────────────────────────────────────────────

type FormTextInputProps = {
  field: Field<string>;
} & Omit<TextInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormTextInput({ field, ...rest }: FormTextInputProps) {
  return (
    <TextInput
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────

type FormTextareaProps = {
  field: Field<string>;
} & Omit<TextareaProps, "value" | "onChange" | "onBlur" | "error">;

export function FormTextarea({ field, ...rest }: FormTextareaProps) {
  return (
    <Textarea
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── NumberInput ───────────────────────────────────────────────────────────────
// Mantine returns '' when cleared, so the field type must be number | string.

type FormNumberInputProps = {
  field: Field<number | string>;
} & Omit<NumberInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormNumberInput({ field, ...rest }: FormNumberInputProps) {
  return (
    <NumberInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── PasswordInput ────────────────────────────────────────────────────────────

type FormPasswordInputProps = {
  field: Field<string>;
} & Omit<PasswordInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormPasswordInput({ field, ...rest }: FormPasswordInputProps) {
  return (
    <PasswordInput
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

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

// ── Chip ─────────────────────────────────────────────────────────────────────

type FormChipProps = {
  field: Field<boolean>;
} & Omit<ChipProps, "checked" | "onChange">;

export function FormChip({ field, ...rest }: FormChipProps) {
  return (
    <Chip checked={field.state.value} onChange={field.handleChange} {...rest} />
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

// ── Slider ───────────────────────────────────────────────────────────────────

type FormSliderProps = {
  field: Field<number>;
} & Omit<SliderProps, "value" | "onChange">;

export function FormSlider({ field, ...rest }: FormSliderProps) {
  return (
    <Slider value={field.state.value} onChange={field.handleChange} {...rest} />
  );
}

// ── RangeSlider ──────────────────────────────────────────────────────────────

type FormRangeSliderProps = {
  field: Field<[number, number]>;
} & Omit<RangeSliderProps, "value" | "onChange">;

export function FormRangeSlider({ field, ...rest }: FormRangeSliderProps) {
  return (
    <RangeSlider
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── AngleSlider ──────────────────────────────────────────────────────────────

type FormAngleSliderProps = {
  field: Field<number>;
} & Omit<AngleSliderProps, "value" | "onChange">;

export function FormAngleSlider({ field, ...rest }: FormAngleSliderProps) {
  return (
    <AngleSlider
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── Rating ───────────────────────────────────────────────────────────────────

type FormRatingProps = {
  field: Field<number>;
} & Omit<RatingProps, "value" | "onChange">;

export function FormRating({ field, ...rest }: FormRatingProps) {
  return (
    <Rating value={field.state.value} onChange={field.handleChange} {...rest} />
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

// ── NativeSelect ─────────────────────────────────────────────────────────────

type FormNativeSelectProps = {
  field: Field<string>;
} & Omit<NativeSelectProps, "value" | "onChange" | "onBlur" | "error">;

export function FormNativeSelect({ field, ...rest }: FormNativeSelectProps) {
  return (
    <NativeSelect
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── PinInput ─────────────────────────────────────────────────────────────────

type FormPinInputProps = {
  field: Field<string>;
} & Omit<PinInputProps, "value" | "onChange" | "error">;

export function FormPinInput({ field, ...rest }: FormPinInputProps) {
  return (
    <PinInput
      value={field.state.value}
      onChange={field.handleChange}
      error={!!firstError(field.state.meta)}
      {...rest}
    />
  );
}

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

// ── JsonInput ────────────────────────────────────────────────────────────────

type FormJsonInputProps = {
  field: Field<string>;
} & Omit<JsonInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormJsonInput({ field, ...rest }: FormJsonInputProps) {
  return (
    <JsonInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// =============================================================================
//  COMBOBOX
// =============================================================================

// ── Select ───────────────────────────────────────────────────────────────────

type FormSelectProps = {
  field: Field<string | null>;
} & Omit<SelectProps, "value" | "onChange" | "onBlur" | "error">;

export function FormSelect({ field, ...rest }: FormSelectProps) {
  return (
    <Select
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── MultiSelect ──────────────────────────────────────────────────────────────

type FormMultiSelectProps = {
  field: Field<string[]>;
} & Omit<MultiSelectProps, "value" | "onChange" | "onBlur" | "error">;

export function FormMultiSelect({ field, ...rest }: FormMultiSelectProps) {
  return (
    <MultiSelect
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── Autocomplete ─────────────────────────────────────────────────────────────

type FormAutocompleteProps = {
  field: Field<string>;
} & Omit<AutocompleteProps, "value" | "onChange" | "onBlur" | "error">;

export function FormAutocomplete({ field, ...rest }: FormAutocompleteProps) {
  return (
    <Autocomplete
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// ── TagsInput ────────────────────────────────────────────────────────────────

type FormTagsInputProps = {
  field: Field<string[]>;
} & Omit<TagsInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormTagsInput({ field, ...rest }: FormTagsInputProps) {
  return (
    <TagsInput
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      {...rest}
    />
  );
}

// =============================================================================
//  DATES
// =============================================================================

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

// =============================================================================
//  Exports
// =============================================================================

export type { Field, FieldMeta };
