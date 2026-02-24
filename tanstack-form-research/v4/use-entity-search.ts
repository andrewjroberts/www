// =============================================================================
// hooks/use-entity-search.ts — Generic async search with typed entity mapping
// =============================================================================
//
// The hook is generic over TEntity, but the CACHE stores ComboboxOption.
// The generic stays internal — consumers never see TEntity.
//
//   useEntitySearch({
//     searchFn: api.searchUsers,           // TS infers TEntity = User
//     toOption: (u) => ({ value: u.id, label: u.name }),
//   })
//
// What gets cached:
//   ["users", "search", "ali"] → ComboboxOption[]   (search results)
//   ["users", "u1"]            → ComboboxOption      (individual, for label lookup)
//
// No `[key: string]: unknown`. No `any`.
// The toOption mapper is the single point of contact between your domain type
// and the combobox system. It's defined once, exported, reused in loaders.
// =============================================================================

import { useState, useCallback } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import type { ComboboxOption } from "@/form-fields/types";

// =============================================================================
//  __new: prefix utilities — for creatable fields (Option B)
// =============================================================================
//
// When a creatable combobox stores entity IDs (Option B), newly created
// values that don't exist in the DB are stored with a "__new:" prefix:
//
//   Existing: "c42"           → real entity ID
//   Created:  "__new:NewCo"   → synthetic sentinel, decoded at display + submit
//
// These utilities are exported so Zod transforms and components can use them.

const CREATED_PREFIX = "__new:";

/** Check if a field value represents a newly created (not-yet-persisted) entry */
export function isCreatedValue(value: string | null): boolean {
  return value != null && value.startsWith(CREATED_PREFIX);
}

/** Extract the display name from a __new: sentinel value */
export function parseCreatedName(value: string): string {
  return value.slice(CREATED_PREFIX.length);
}

/** Create a __new: sentinel from a user-typed name */
export function makeCreatedValue(name: string): string {
  return `${CREATED_PREFIX}${name}`;
}

// =============================================================================
//  Hook config — generic over TEntity
// =============================================================================

type EntitySearchConfig<TEntity> = {
  /** Cache key prefix: ["users", ...], ["accounts", ...] */
  entityKey: string;
  /** API call that returns matching entities in their domain shape */
  searchFn: (query: string) => Promise<TEntity[]>;
  /** Map your domain type → ComboboxOption. Defined once, exported, reused. */
  toOption: (entity: TEntity) => ComboboxOption;
  /** How long search results stay fresh. Default: 30s */
  staleTime?: number;
  /** Minimum characters before searching. Default: 1 */
  minChars?: number;
};

// =============================================================================
//  Return type — NO generics. Consumers see this.
// =============================================================================

export type EntitySearchReturn = {
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  options: ComboboxOption[];
  isLoading: boolean;
  /** Synchronous label lookup. Handles __new: prefix. Returns ID as fallback. */
  getLabel: (id: string | null) => string;
  /** Seed cache from loader — takes pre-mapped ComboboxOptions. */
  seed: (options: ComboboxOption[]) => void;
  /** Entity key for useResolvedLabels */
  entityKey: string;
};

// =============================================================================
//  The hook
// =============================================================================

export function useEntitySearch<TEntity>(
  config: EntitySearchConfig<TEntity>
): EntitySearchReturn {
  const {
    entityKey,
    searchFn,
    toOption,
    staleTime = 30_000,
    minChars = 1,
  } = config;

  const queryClient = useQueryClient();

  // ── Search state ──────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  // ── Search query ──────────────────────────────────────────────────────

  const { data: options = [], isLoading } = useQuery<ComboboxOption[]>({
    queryKey: [entityKey, "search", debouncedSearch],
    queryFn: async () => {
      const entities = await searchFn(debouncedSearch);
      const mapped = entities.map(toOption);

      mapped.forEach((option) => {
        queryClient.setQueryData<ComboboxOption>(
          [entityKey, option.value],
          option
        );
      });

      return mapped;
    },
    enabled: debouncedSearch.length >= minChars,
    staleTime,
    placeholderData: (prev) => prev,
  });

  // ── Label resolution ──────────────────────────────────────────────────
  //
  // Handles __new: prefix for creatable fields (Option B):
  //   "__new:NewCo" → "NewCo" (decoded inline, no cache lookup needed)
  //   "c42"         → cache lookup → "Acme Corp"

  const getLabel = useCallback(
    (id: string | null): string => {
      if (!id) return "";
      if (isCreatedValue(id)) return parseCreatedName(id);
      const cached = queryClient.getQueryData<ComboboxOption>([entityKey, id]);
      return cached?.label ?? id;
    },
    [queryClient, entityKey]
  );

  // ── Seed from loader ──────────────────────────────────────────────────

  const seed = useCallback(
    (entries: ComboboxOption[]) => {
      entries.forEach((option) => {
        queryClient.setQueryData<ComboboxOption>(
          [entityKey, option.value],
          option
        );
      });
    },
    [queryClient, entityKey]
  );

  const clearSearch = useCallback(() => setSearch(""), []);

  return {
    search,
    setSearch,
    clearSearch,
    options,
    isLoading,
    getLabel,
    seed,
    entityKey,
  };
}

// =============================================================================
//  useResolvedLabels — reactive label resolution for multi-select
// =============================================================================
//
// Handles __new: prefix values — decodes inline without a query.
// For real IDs, reads from cache via useQueries.

export function useResolvedLabels(entityKey: string, ids: string[]) {
  // Split: __new: values don't need queries, real IDs do
  const realIds = ids.filter((id) => !isCreatedValue(id));

  const queries = useQueries({
    queries: realIds.map((id) => ({
      queryKey: [entityKey, id],
      queryFn: (): ComboboxOption => ({ value: id, label: id }),
      staleTime: Infinity,
    })),
  });

  const queryLookup = new Map<string, string>();
  realIds.forEach((id, i) => {
    queryLookup.set(id, queries[i]?.data?.label ?? id);
  });

  return ids.map((id) => ({
    id,
    label: isCreatedValue(id)
      ? parseCreatedName(id)
      : queryLookup.get(id) ?? id,
    isLoading: false,
  }));
}

// =============================================================================
//  Domain types — define alongside your API module in a real app
// =============================================================================

type User = {
  id: string;
  name: string;
  email: string;
  department: string;
};

type Account = {
  id: string;
  accountName: string;
  accountNumber: string;
  legalEntity: string;
};

type Security = {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
};

type Company = {
  id: string;
  name: string;
  industry: string;
};

// =============================================================================
//  Mappers — defined once, exported, used in hooks AND loaders
// =============================================================================

export const userToOption = (user: User): ComboboxOption => ({
  value: user.id,
  label: user.name,
  description: user.department,
});

export const accountToOption = (account: Account): ComboboxOption => ({
  value: account.id,
  label: account.accountName,
  description: account.accountNumber,
});

export const securityToOption = (security: Security): ComboboxOption => ({
  value: security.id,
  label: `${security.ticker} — ${security.companyName}`,
  description: security.exchange,
});

export const companyToOption = (company: Company): ComboboxOption => ({
  value: company.id,
  label: company.name,
  description: company.industry,
});

// =============================================================================
//  Concrete search hooks
// =============================================================================
//
// TEntity is inferred from searchFn — no explicit generic at call site.
// Consumers get EntitySearchReturn (no generics).

export function useUserSearch() {
  return useEntitySearch({
    entityKey: "users",
    searchFn: api.searchUsers,
    toOption: userToOption,
    minChars: 2,
  });
}

export function useAccountSearch() {
  return useEntitySearch({
    entityKey: "accounts",
    searchFn: api.searchAccounts,
    toOption: accountToOption,
    minChars: 3,
  });
}

export function useSecuritySearch() {
  return useEntitySearch({
    entityKey: "securities",
    searchFn: api.searchSecurities,
    toOption: securityToOption,
    staleTime: 60_000,
  });
}

export function useCompanySearch() {
  return useEntitySearch({
    entityKey: "companies",
    searchFn: api.searchCompanies,
    toOption: companyToOption,
    minChars: 1,
  });
}

// =============================================================================
//  Placeholder API — replace with your actual typed API module
// =============================================================================

const api = {
  searchUsers: async (_query: string): Promise<User[]> => {
    throw new Error("Replace with real API call");
  },
  searchAccounts: async (_query: string): Promise<Account[]> => {
    throw new Error("Replace with real API call");
  },
  searchSecurities: async (_query: string): Promise<Security[]> => {
    throw new Error("Replace with real API call");
  },
  searchCompanies: async (_query: string): Promise<Company[]> => {
    throw new Error("Replace with real API call");
  },
};
