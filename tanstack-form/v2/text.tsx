// form-fields/text.tsx

import {
  TextInput,
  type TextInputProps,
  Textarea,
  type TextareaProps,
  PasswordInput,
  type PasswordInputProps,
  JsonInput,
  type JsonInputProps,
  PinInput,
  type PinInputProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

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
