# Combobox & Search Architecture Guide

## File Structure

```
hooks/
  use-entity-search.ts         ← generic search hook, __new: utilities,
                                  typed mappers, concrete hooks
  use-domain-data.ts            ← queryOptions + hooks for domain reference data

app-fields/
  entity-search-field.tsx       ← EntitySearchField (search only)
                                  CreatableEntitySearchField (search + create)
                                  UserSearchField, AccountSearchField
                                  CompanyNameSearchField, CompanyIdSearchField
  entity-multi-search-field.tsx ← EntityMultiSearchField (search only)
                                  CreatableEntityMultiSearchField (search + create)
                                  UserMultiSearchField, AccountMultiSearchField
                                  TagMultiSearchField
  select-fields.tsx             ← CountrySelectField, TeamSelectField, RoleSelectField
  index.ts                      ← barrel

form-fields/
  types.ts                      ← Field<T>, ComboboxOption, firstError
  checkbox-group.tsx            ← Checkbox.Group, Switch.Group (Field<string[]>)
  select.tsx                    ← low-level FormSelect, FormMultiSelect, etc.
  ...                           ← other low-level wrappers

app-form.tsx                    ← form wrapper with submit + scroll-to-error
```

## Two Tiers

**form-fields/** — dumb wrappers. Take data as props. Know nothing about where data comes from.

**app-fields/** — smart components. Bring their own data via hooks. Domain-specific.

## Type Safety

No `any`. No `[key: string]: unknown`. No explicit generics at call sites.

The search hook is generic over `TEntity`, but the generic is **inferred from `searchFn`**:

```tsx
export function useUserSearch() {
  return useEntitySearch({
    entityKey: "users",
    searchFn: api.searchUsers,     // Promise<User[]> → TEntity = User
    toOption: userToOption,        // must accept User → checked at compile time
  })
}
```

The cache stores `ComboboxOption`, not `TEntity`. The generic never leaks past the hook.

## Cache Strategy

One cache: TanStack Query. No separate useState label caches.

```
Query Cache
├── ["countries"]                ← staleTime: Infinity
├── ["teams"]                    ← staleTime: 5 min
├── ["users", "search", "ali"]   ← staleTime: 30s, stores ComboboxOption[]
├── ["users", "u1"]              ← ComboboxOption, seeded from search + loader
├── ["companies", "search", "ac"]← staleTime: 60s
└── ["companies", "c42"]         ← ComboboxOption, seeded from search + loader
```

### How entries get into the cache

**Domain data:** loader calls `queryClient.ensureQueryData(countriesQueryOptions)`.

**Search results:** `queryFn` maps `TEntity[]` → `ComboboxOption[]`, seeds each individually.

**Edit mode seed:** loader uses the same `toOption` mapper.

## Creatable Combobox

### The Problem

`EntitySearchField` is search-only: pick from API results, or see "Nothing found." This breaks for fields like **company name** where the entity may not exist yet.

`CreatableEntitySearchField` adds a "+ Create" option when the search doesn't match.

### Two Storage Modes

| Mode | Field stores | Display | Loader needed? | Best for |
|---|---|---|---|---|
| `"name"` | Display name: `"Acme Corp"` | `field.state.value` directly | No | Freeform suggestions |
| `"id"` | ID or sentinel: `"c42"` / `"__new:NewCo"` | `getLabel()` decodes `__new:` | For existing entities | First-class entities with IDs |

### Mode "name" (Option A) — Store the name string

The field value IS the display label. No cache, no `getLabel`, no loader step.

```tsx
// Form state
type MyForm = { companyName: string | null }

// Field
<form.Field name="companyName">
  {(field) => <CompanyNameSearchField field={field} required />}
</form.Field>

// Schema — just a string
companyName: z.string().min(1, "Company is required")
```

Picking "Acme Corp" from results stores `"Acme Corp"`. Typing "NewCo" and clicking "+ Create" also stores `"NewCo"`. Clone/draft trivially correct.

### Mode "id" (Option B) — Store ID with `__new:` sentinel

Field stores entity ID for existing, `"__new:Name"` for new. Same `Field<string | null>` type as every other search field.

```tsx
// Form state
type MyForm = { companyId: string | null }

// Field
<form.Field name="companyId">
  {(field) => <CompanyIdSearchField field={field} required />}
</form.Field>

// Schema — Zod transforms sentinel at submit
companyId: z.string().transform(v =>
  isCreatedValue(v)
    ? { op: "create" as const, name: parseCreatedName(v) }
    : { op: "link"   as const, id: v }
)
```

The `__new:` prefix is contained:
- `getLabel("__new:NewCo")` → `"NewCo"` (decoded inline, no cache)
- `getLabel("c42")` → cache lookup → `"Acme Corp"`
- Zod transform strips it at submit — never reaches the API raw

### `__new:` Utilities

```tsx
import { isCreatedValue, parseCreatedName, makeCreatedValue } from "@/hooks/use-entity-search"

isCreatedValue("__new:NewCo")   // true
isCreatedValue("c42")           // false
parseCreatedName("__new:NewCo") // "NewCo"
makeCreatedValue("NewCo")       // "__new:NewCo"
```

### Create Option Visibility

The "+ Create" option appears when:
- Search text is non-empty
- Not currently loading
- No existing option label exactly matches the search text (case-insensitive)

This means: if you type "Acme" and "Acme Corp" is in results, create shows. If you type "Acme Corp" exactly, create hides (you should pick the existing one).

### Multi-Select Creatable

Same two modes. `CreatableEntityMultiSearchField` additionally prevents duplicate created values in the pill list.

```tsx
// Tags example (Option A — name strings)
<form.Field name="tags">
  {(field) => <TagMultiSearchField field={field} label="Tags" />}
</form.Field>

// Field stores: ["React", "TypeScript", "MyNewTag"]
// Schema: z.array(z.string()).min(1)
```

### Edit Mode & Draft Behavior

| Mode | Edit mode | Draft/clone |
|---|---|---|
| **"name"** | `{ companyName: "Acme Corp" }` — renders immediately | Serialize as-is |
| **"id"** | Existing: loader seeds `["companies", "c42"]`. Saved draft with `"__new:NewCo"`: `getLabel` decodes inline, no loader | Serialize as-is for new; existing needs loader |

## Decision Tree

```
Where does the data come from?

  Hardcoded enum?
    → enumToSelectData() + FormSelect
    → No query, no app-field needed

  API domain data (countries, teams, roles)?
    → queryOptions + hook in use-domain-data.ts
    → BaseSelectField in app-fields/select-fields.tsx
    → Prefetch in loader

  API search (users, accounts)?
    → useEntitySearch hook + toOption mapper
    → EntitySearchField or EntityMultiSearchField
    → Seed cache in loader via toOption mapper

  API search + user can create new entries?
    → CreatableEntitySearchField or CreatableEntityMultiSearchField
    → Is the entity a first-class DB record with IDs?
        YES → storeMode="id" (Option B, __new: sentinel)
        NO  → storeMode="name" (Option A, freeform)

Single or multi?

  Single           → EntitySearchField, Field<string | null>
  Single creatable → CreatableEntitySearchField, Field<string | null>
  Multi            → EntityMultiSearchField, Field<string[]>
  Multi creatable  → CreatableEntityMultiSearchField, Field<string[]>
  Multi checkboxes → FormCheckboxGroup, Field<string[]>
```

## Adding a New Entity Search

### Search only

1. Define domain type + mapper (`toOption`)
2. Add hook — `useEntitySearch({ searchFn, toOption })` (generic inferred)
3. Add app-field — wrap `EntitySearchField`
4. Seed in loader via same `toOption` mapper

### Search + create

1. Same steps 1-2 as above
2. Add app-field — wrap `CreatableEntitySearchField` with `storeMode`
3. If `storeMode="id"`: add Zod transform, seed loader for existing
4. If `storeMode="name"`: just `z.string().min(1)`, no loader needed

## Composition at a Glance

```
┌──────────────────────────────────────────┐
│ CreatableEntitySearchField               │  ← generic, storeMode prop
│   uses: any EntitySearchReturn hook      │
│   stores: name (Option A) or ID (B)      │
│   shows: "+ Create" when no exact match  │
├──────────────────────────────────────────┤
│ CompanyNameSearchField                   │  ← concrete, storeMode="name"
│   uses: useCompanySearch()               │
│   Field<string | null> = company name    │
├──────────────────────────────────────────┤
│ CompanyIdSearchField                     │  ← concrete, storeMode="id"
│   uses: useCompanySearch()               │
│   Field<string | null> = ID or __new:    │
└──────────────────────────────────────────┘
```
