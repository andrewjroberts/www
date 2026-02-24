// form-fields/checkbox-group.tsx
//
// Checkbox.Group → Field<string[]>  (multi-select via checkboxes)
// Switch.Group  → Field<string[]>  (multi-select via switches)
//
// Usage:
//   <form.Field name="permissions">
//     {(field) => (
//       <FormCheckboxGroup field={field} label="Permissions">
//         <Group>
//           <Checkbox value="read" label="Read" />
//           <Checkbox value="write" label="Write" />
//           <Checkbox value="admin" label="Admin" />
//         </Group>
//       </FormCheckboxGroup>
//     )}
//   </form.Field>

import {
  Checkbox,
  type CheckboxGroupProps,
  Switch,
  type SwitchGroupProps,
} from "@mantine/core";
import { type Field, firstError } from "./types";

// ── Checkbox.Group ──────────────────────────────────────────────────────

type FormCheckboxGroupProps = {
  field: Field<string[]>;
} & Omit<CheckboxGroupProps, "value" | "onChange" | "error">;

export function FormCheckboxGroup({
  field,
  children,
  ...rest
}: FormCheckboxGroupProps) {
  return (
    <Checkbox.Group
      value={field.state.value}
      onChange={field.handleChange}
      error={firstError(field.state.meta)}
      {...rest}
    >
      {children}
    </Checkbox.Group>
  );
}

// ── Switch.Group ────────────────────────────────────────────────────────

type FormSwitchGroupProps = {
  field: Field<string[]>;
} & Omit<SwitchGroupProps, "value" | "onChange" | "error">;

export function FormSwitchGroup({
  field,
  children,
  ...rest
}: FormSwitchGroupProps) {
  return (
    <Switch.Group
      value={field.state.value}
      onChange={field.handleChange}
      error={firstError(field.state.meta)}
      {...rest}
    >
      {children}
    </Switch.Group>
  );
}
