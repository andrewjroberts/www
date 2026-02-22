# Combobox & Search Architecture Guide

## File Structure

```
hooks/
  use-entity-search.ts      ← generic search hook + concrete instances
  use-ref-data.ts            ← queryOptions + hooks for reference data

app-fields/
  entity-search-field.tsx    ← single async combobox (generic + concrete)
  entity-multi-search-field.tsx ← multi async combobox (generic + concrete)
  ref-select-fields.tsx      ← ref data selects (country, team, role)
  index.ts                   ← barrel

form-fields/
  types.ts                   ← Field<T>, ComboboxOption, ResolvedEntity
  select.tsx                 ← low-level FormSelect, FormMultiSelect, etc.
  ...                        ← other low-level wrappers

app-form.tsx                 ← form wrapper with submit + scroll-to-error
example-ticket-form.tsx      ← full example with loader
```

## Two Tiers

**form-fields/** — dumb wrappers. Take data as props. Know nothing about where data comes from. Reusable in any context.

**app-fields/** — smart components. Bring their own data via hooks. Domain-specific. Drop into a form and they work.

```
form-fields/select.tsx         app-fields/ref-select-fields.tsx
┌─────────────────────┐       ┌──────────────────────────────────┐
│ FormSelect           │       │ CountrySelectField                │
│                      │       │                                  │
│ field: Field<T>      │       │   calls useCountries()            │
│ data: props          │◄──────│   passes data to FormSelect       │
│ label: props         │       │   shows "Loading..." if pending   │
│                      │       │                                  │
│ knows nothing about  │       │ TeamSelectField                   │
│ where data comes from│       │   calls useTeams()                │
└─────────────────────┘       └──────────────────────────────────┘
```

## Cache Strategy

One cache: TanStack Query. No separate `useState` label caches.

```
Query Cache
├── ["ref", "countries"]         ← staleTime: Infinity
├── ["ref", "teams"]             ← staleTime: 5 min
├── ["users", "search", "ali"]   ← staleTime: 30s
├── ["users", "u1"]              ← seeded from search results + loader
├── ["users", "u5"]              ← seeded from search results + loader
├── ["accounts", "search", "ac"] ← staleTime: 30s
└── ["accounts", "a3"]           ← seeded from search results + loader
```

### How entries get into the cache

**Ref data:** loader calls `queryClient.ensureQueryData(countriesQueryOptions)`. Hook reads warm cache.

**Search results:** `queryFn` in `useEntitySearch` calls `queryClient.setQueryData([entityKey, id], entity)` for each result. Every search result becomes individually addressable.

**Edit mode seed:** loader fetches entities by ID, seeds with `queryClient.setQueryData(["users", id], entity)`.

**Label resolution:** `getLabel(id)` reads `queryClient.getQueryData(["users", id])`. Already there from search or loader.

## The Search Flow

```
User types "ali"
  │
  ├─ search state: "ali"
  ├─ debounce 300ms
  ├─ useQuery fires: queryKey=["users","search","ali"]
  │   ├─ cache hit? → instant, no API call
  │   └─ cache miss? → API call → results
  │       └─ for each result: setQueryData(["users", r.id], r)
  │
  ├─ options update → dropdown shows results
  │
  └─ user picks "Alice Johnson" (id: "u1")
      ├─ field.handleChange("u1")
      ├─ dropdown closes, search resets
      └─ input shows getLabel("u1") → reads ["users","u1"] from cache
```

## Edit Mode Flow

```
Loader runs
  ├─ fetch ticket → { assigneeId: "u1", reviewerIds: ["u5","u8"] }
  ├─ fetch user "u1" → setQueryData(["users","u1"], {id:"u1",name:"Alice"})
  ├─ batch fetch ["u5","u8"] → setQueryData for each
  ├─ ensureQueryData(countriesQueryOptions) → warm ref cache
  └─ return { ticket }

Component mounts
  ├─ form defaults: assigneeId="u1", reviewerIds=["u5","u8"]
  ├─ UserSearchField: getLabel("u1") → cache hit → shows "Alice"
  ├─ UserMultiSearchField: useResolvedLabels(["u5","u8"])
  │   ├─ useQueries reads ["users","u5"] → cache hit → "Bob"
  │   └─ useQueries reads ["users","u8"] → cache hit → "Carol"
  └─ pills render: [Bob] [Carol] — instant, no loading flash
```

## Label Resolution: getLabel vs useResolvedLabels

**getLabel** — synchronous, non-reactive. Reads cache once. Good for single select where the loader guarantees the cache is warm before mount.

**useResolvedLabels** — reactive, uses `useQueries`. Re-renders when cache entries arrive. Good for multi select where you want guaranteed reactivity. Falls back to individual fetch if cache is cold.

| Scenario | Use |
|---|---|
| Single select, edit mode, loader seeded cache | `getLabel` |
| Multi select, edit mode, loader seeded cache | `useResolvedLabels` (safer) |
| Any select, cache might not be warm | `useResolvedLabels` with `fetchFn` |

## Composing a New Entity Search

To add a new searchable entity (e.g., securities):

**1. Add the search function to your API module**

```tsx
// api.ts
export const searchSecurities = (q: string) =>
  fetch(`/api/securities?q=${q}`).then(r => r.json())
```

**2. Add the hook in use-entity-search.ts**

```tsx
export function useSecuritySearch() {
  return useEntitySearch({
    entityKey: "securities",
    searchFn: (q) => api.searchSecurities(q),
    staleTime: 60_000,
    minChars: 2,
  })
}
```

**3. Add the app-field**

For single select — just use EntitySearchField with the hook:

```tsx
export function SecuritySearchField({ field, ...rest }) {
  const searchHook = useSecuritySearch()
  return (
    <EntitySearchField
      field={field}
      searchHook={searchHook}
      searchPlaceholder="Search securities..."
      nothingFoundMessage="No securities found"
      {...rest}
    />
  )
}
```

For multi — use EntityMultiSearchField.

**4. Use in a form**

```tsx
<form.Field name="securityId">
  {(field) => <SecuritySearchField field={field} label="Security" required />}
</form.Field>
```

## Composing a New Ref Data Select

**1. Add queryOptions in use-ref-data.ts**

```tsx
export const currenciesQueryOptions = queryOptions({
  queryKey: ["ref", "currencies"],
  queryFn: () => api.getCurrencies(),
  staleTime: Infinity,
  select: (data): ComboboxOption[] =>
    data.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` })),
})

export const useCurrencies = () => useQuery(currenciesQueryOptions)
```

**2. Add the app-field in ref-select-fields.tsx**

```tsx
export function CurrencySelectField({ field, label = "Currency", ...rest }) {
  const { data = [], isLoading } = useCurrencies()
  return (
    <RefSelectField
      field={field} data={data} isLoading={isLoading}
      label={label} {...rest}
    />
  )
}
```

**3. Prefetch in loader**

```tsx
await queryClient.ensureQueryData(currenciesQueryOptions)
```

## Enum Pattern Recap

Enums are hardcoded — no query needed. Just convert to options:

```tsx
enum Priority { Low = "LOW", High = "HIGH" }

const PRIORITY_OPTIONS = enumToSelectData(Priority, {
  LOW: "Low Priority",
  HIGH: "High Priority",
})

// Form state: string | null (NOT Priority | null)
<form.Field name="priority">
  {(field) => (
    <FormSelect field={field} data={PRIORITY_OPTIONS} label="Priority" />
  )}
</form.Field>

// Schema narrows string → Priority at submit
const schema = z.object({
  priority: z.nativeEnum(Priority),
})
```

## Decision Tree

```
Where does the data come from?

  Hardcoded enum?
    → enumToSelectData() + FormSelect (form-fields/select.tsx)
    → No query, no app-field needed

  API reference data (countries, teams, roles)?
    → queryOptions + hook in use-ref-data.ts
    → RefSelectField in app-fields/ref-select-fields.tsx
    → Prefetch in loader

  API search (users, accounts, securities)?
    → useEntitySearch hook in use-entity-search.ts
    → EntitySearchField or EntityMultiSearchField in app-fields/
    → Seed cache in loader for edit mode

Single or multi?

  Single → EntitySearchField, Field<string | null>
  Multi  → EntityMultiSearchField, Field<string[]>
```
