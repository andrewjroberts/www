// =============================================================================
// hooks/use-ref-data.ts — Reference data query options + hooks
// =============================================================================
//
// Static-ish data that many forms share: countries, teams, roles, statuses.
// Fetched once, cached long (or forever), used as Select options everywhere.
//
// queryOptions factories are reusable in both:
//   - React Router loaders: queryClient.ensureQueryData(countriesQueryOptions)
//   - Component hooks: useCountries()
//
// Same cache key → same cache → loaders warm it, hooks read it instantly.
// =============================================================================

import { useQuery, queryOptions } from "@tanstack/react-query";
import type { ComboboxOption } from "@/form-fields/types";

// =============================================================================
//  Query option factories
// =============================================================================

export const countriesQueryOptions = queryOptions({
  queryKey: ["ref", "countries"],
  queryFn: () => api.getCountries(),
  staleTime: Infinity,
  select: (data): ComboboxOption[] =>
    data.map((c) => ({ value: c.code, label: c.name })),
});

export const teamsQueryOptions = queryOptions({
  queryKey: ["ref", "teams"],
  queryFn: () => api.getTeams(),
  staleTime: 5 * 60 * 1000,
  select: (data): ComboboxOption[] =>
    data.map((t) => ({
      value: t.id,
      label: t.name,
      description: t.department,
    })),
});

export const rolesQueryOptions = queryOptions({
  queryKey: ["ref", "roles"],
  queryFn: () => api.getRoles(),
  staleTime: Infinity,
  select: (data): ComboboxOption[] =>
    data.map((r) => ({ value: r.id, label: r.displayName })),
});

// =============================================================================
//  Hooks for components
// =============================================================================

export const useCountries = () => useQuery(countriesQueryOptions);
export const useTeams = () => useQuery(teamsQueryOptions);
export const useRoles = () => useQuery(rolesQueryOptions);

// =============================================================================
//  Enum helper
// =============================================================================
//
// For enums that are hardcoded (not from API), no query needed.
// Just convert to ComboboxOption[].

export function enumToSelectData<T extends Record<string, string>>(
  enumObj: T,
  labels?: Partial<Record<T[keyof T], string>>
): ComboboxOption[] {
  return Object.values(enumObj).map((value) => ({
    value,
    label: labels?.[value as T[keyof T]] ?? value,
  }));
}

// =============================================================================
//  Placeholder API — replace with your actual API module
// =============================================================================

const api = {
  getCountries: async (): Promise<Array<{ code: string; name: string }>> => {
    throw new Error("Replace with real API call");
  },
  getTeams: async (): Promise<
    Array<{ id: string; name: string; department: string }>
  > => {
    throw new Error("Replace with real API call");
  },
  getRoles: async (): Promise<
    Array<{ id: string; displayName: string }>
  > => {
    throw new Error("Replace with real API call");
  },
};
