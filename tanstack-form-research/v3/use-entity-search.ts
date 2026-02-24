// =============================================================================
// hooks/use-entity-search.ts — Generic async search with TanStack Query cache
// =============================================================================
//
// Single cache strategy: TanStack Query IS the cache. No separate label state.
//
//   Search results → queryClient.setQueryData([key, id], entity)
//   Label lookup   → queryClient.getQueryData([key, id])
//   Loader seed    → queryClient.setQueryData([key, id], entity)
//
// One cache. One source of truth. Seeded from loaders, grown from searches.
//
// Usage:
//   const userSearch = useUserSearch()
//   const accountSearch = useAccountSearch()
//
// Each instance returns: search state, options, loading, getLabel, seed.
// Wire into any combobox — single or multi.
// =============================================================================

import { useState, useCallback } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import type { ResolvedEntity, ComboboxOption } from "@/form-fields/types";

// =============================================================================
//  Config & Factory
// =============================================================================

type EntitySearchConfig = {
	/** Cache key prefix: ["users", ...], ["accounts", ...] */
	entityKey: string;
	/** API call that returns matching entities */
	searchFn: (query: string) => Promise<ResolvedEntity[]>;
	/** How long search results stay fresh. Default: 30s */
	staleTime?: number;
	/** Minimum characters before searching. Default: 1 */
	minChars?: number;
	/** Map entity → combobox option. Default: { value: id, label: name } */
	toOption?: (entity: ResolvedEntity) => ComboboxOption;
};

const defaultToOption = (entity: ResolvedEntity): ComboboxOption => ({
	value: entity.id,
	label: entity.name,
});

export function useEntitySearch(config: EntitySearchConfig) {
	const {
		entityKey,
		searchFn,
		staleTime = 30_000,
		minChars = 1,
		toOption = defaultToOption,
	} = config;

	const queryClient = useQueryClient();

	// ── Search state ──────────────────────────────────────────────────────

	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebouncedValue(search, 300);

	// ── Search query ──────────────────────────────────────────────────────

	const { data: rawResults = [], isLoading } = useQuery({
		queryKey: [entityKey, "search", debouncedSearch],
		queryFn: async () => {
			const results = await searchFn(debouncedSearch);
			// Side effect: seed individual entity cache entries.
			// Every search result becomes individually addressable by ID.
			results.forEach((r) => {
				queryClient.setQueryData([entityKey, r.id], r);
			});
			return results;
		},
		enabled: debouncedSearch.length >= minChars,
		staleTime,
		placeholderData: (prev) => prev,
	});

	const options: ComboboxOption[] = rawResults.map(toOption);

	// ── Label resolution (non-reactive, synchronous) ──────────────────────

	const getLabel = useCallback(
		(id: string | null): string => {
			if (!id) return "";
			const cached = queryClient.getQueryData<ResolvedEntity>([entityKey, id]);
			return cached?.name ?? id;
		},
		[queryClient, entityKey],
	);

	// ── Seed from loader data ─────────────────────────────────────────────
	//
	// Call in the loader or on mount with entities from the API response.
	// No useEffect needed if you seed in the loader.

	const seed = useCallback(
		(entities: ResolvedEntity[]) => {
			entities.forEach((e) => {
				queryClient.setQueryData([entityKey, e.id], e);
			});
		},
		[queryClient, entityKey],
	);

	// ── Reset search (for closing dropdown) ───────────────────────────────

	const clearSearch = useCallback(() => setSearch(""), []);

	return {
		search,
		setSearch,
		clearSearch,
		options,
		isLoading,
		getLabel,
		seed,
	};
}

// =============================================================================
//  Reactive label resolution for multi-select
// =============================================================================
//
// getLabel is synchronous — fine when the loader already seeded the cache.
// For cases where you need reactive resolution (re-render when cache
// populates), use this hook. It falls back to an individual fetch per ID
// if the cache is cold.
// =============================================================================

type UseResolvedLabelsConfig = {
	entityKey: string;
	ids: string[];
	/** Individual fetch fallback. Only fires if ID isn't in cache. */
	fetchFn?: (id: string) => Promise<ResolvedEntity>;
};

export function useResolvedLabels(config: UseResolvedLabelsConfig) {
	const { entityKey, ids, fetchFn } = config;

	const queries = useQueries({
		queries: ids.map((id) => ({
			queryKey: [entityKey, id],
			queryFn: fetchFn
				? () => fetchFn(id)
				: () => Promise.resolve({ id, name: id } satisfies ResolvedEntity),
			staleTime: Infinity,
		})),
	});

	return ids.map((id, i) => ({
		id,
		label: queries[i]?.data?.name ?? id,
		isLoading: queries[i]?.isLoading ?? false,
	}));
}

// =============================================================================
//  Concrete search hooks
// =============================================================================
//
// One per entity type. Import and use in app-fields.
// The api.* calls are placeholders — replace with your actual API module.
// =============================================================================

// ── Accounts ─────────────────────────────────────────────────────────────

export function useAccountSearch() {
	return useEntitySearch({
		entityKey: "accounts",
		searchFn: (q) => api.searchAccounts(q),
		minChars: 3,
	});
}

// ── Securities ───────────────────────────────────────────────────────────

export function useSecuritySearch() {
	return useEntitySearch({
		entityKey: "securities",
		searchFn: (q) => api.searchSecurities(q),
		staleTime: 60_000,
	});
}

// ── Companies ─────────────────────────────────────────────────────────────
//
// Used with CreatableEntitySearchField. Field value = company name string,
// not an ID. Users can pick an existing company or type a new name.

export function useCompanySearch() {
	return useEntitySearch({
		entityKey: "companies",
		searchFn: (q) => api.searchCompanies(q),
		staleTime: 60_000,
		minChars: 1,
	});
}

// =============================================================================
//  Placeholder API — replace with your actual API module
// =============================================================================

const api = {
	searchUsers: async (_query: string): Promise<ResolvedEntity[]> => {
		// GET /api/users?q=query
		throw new Error("Replace with real API call");
	},
	searchAccounts: async (_query: string): Promise<ResolvedEntity[]> => {
		// GET /api/accounts?q=query
		throw new Error("Replace with real API call");
	},
	searchSecurities: async (_query: string): Promise<ResolvedEntity[]> => {
		// GET /api/securities?q=query
		throw new Error("Replace with real API call");
	},
	searchCompanies: async (_query: string): Promise<ResolvedEntity[]> => {
		// GET /api/companies?q=query
		throw new Error("Replace with real API call");
	},
	getUsersByIds: async (_ids: string[]): Promise<ResolvedEntity[]> => {
		// GET /api/users?ids=u1,u2,u3
		throw new Error("Replace with real API call");
	},
};
