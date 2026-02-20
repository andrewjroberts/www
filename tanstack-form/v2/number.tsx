// form-fields/number.tsx

import { NumberInput, type NumberInputProps } from "@mantine/core";
import { type Field, firstError } from "./types";

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
