// =============================================================================
// app-fields/ref-select-fields.tsx — Ref data selects that bring own data
// =============================================================================
//
// Thin wrappers over FormSelect. Each calls its own useQuery hook for data.
// The loader can prefetch the same queryKey so the hook reads from warm cache.
//
// Usage:
//   <form.Field name="country">
//     {(field) => <CountrySelectField field={field} required />}
//   </form.Field>
// =============================================================================

import { Select, type SelectProps } from "@mantine/core";
import { type Field, firstError } from "@/form-fields/types";
import { useCountries, useTeams, useRoles } from "@/hooks/use-ref-data";

// =============================================================================
//  Generic RefSelectField
// =============================================================================

type RefSelectFieldProps = {
  field: Field<string | null>;
  data: Array<{ value: string; label: string; description?: string }>;
  isLoading: boolean;
  label?: string;
  description?: string;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function RefSelectField({
  field,
  data,
  isLoading,
  label,
  description,
  required,
  clearable = true,
  searchable = true,
  disabled,
  placeholder,
}: RefSelectFieldProps) {
  return (
    <Select
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      data={data}
      label={label}
      description={description}
      required={required}
      clearable={clearable}
      searchable={searchable}
      disabled={disabled || isLoading}
      placeholder={isLoading ? "Loading..." : placeholder ?? `Select ${label?.toLowerCase() ?? "value"}`}
    />
  );
}

// =============================================================================
//  Concrete fields
// =============================================================================

type CommonFieldProps = {
  field: Field<string | null>;
  label?: string;
  description?: string;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  disabled?: boolean;
};

// ── Country ──────────────────────────────────────────────────────────────

export function CountrySelectField({
  field,
  label = "Country",
  ...rest
}: CommonFieldProps) {
  const { data = [], isLoading } = useCountries();
  return (
    <RefSelectField
      field={field}
      data={data}
      isLoading={isLoading}
      label={label}
      {...rest}
    />
  );
}

// ── Team ─────────────────────────────────────────────────────────────────

export function TeamSelectField({
  field,
  label = "Team",
  ...rest
}: CommonFieldProps) {
  const { data = [], isLoading } = useTeams();
  return (
    <RefSelectField
      field={field}
      data={data}
      isLoading={isLoading}
      label={label}
      {...rest}
    />
  );
}

// ── Role ─────────────────────────────────────────────────────────────────

export function RoleSelectField({
  field,
  label = "Role",
  ...rest
}: CommonFieldProps) {
  const { data = [], isLoading } = useRoles();
  return (
    <RefSelectField
      field={field}
      data={data}
      isLoading={isLoading}
      label={label}
      {...rest}
    />
  );
}
