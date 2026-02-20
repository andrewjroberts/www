// form-fields/select.tsx

import {
  Select,
  type SelectProps,
  MultiSelect,
  type MultiSelectProps,
  Autocomplete,
  type AutocompleteProps,
  TagsInput,
  type TagsInputProps,
  NativeSelect,
  type NativeSelectProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

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
