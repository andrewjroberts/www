# Creatable Combobox — Design Notes & KT

## Problem Space

The existing `EntitySearchField` is **search-only**: users pick from API results, or see "Nothing found." That's fine for entities that always exist in the database (users, accounts). It breaks down for fields like **company name**, where:

- The entity may not exist yet (new contact, new deal)
- Users need to type a new value and have it accepted
- The field still wants autocomplete to prevent duplicates

This is the **creatable combobox** pattern: search existing → pick one, or type new → create it inline.

The challenge isn't the UI — Mantine's `Combobox` handles that easily. The challenge is **what the field stores** and how that interacts with the rest of the form system: cache, label resolution, clone, draft, edit mode.

---

## The Core Question: What Does the Field Store?

Every other search field in this codebase stores an **entity ID**:

```
UserSearchField   → field.state.value = "u1"
AccountSearchField → field.state.value = "a3"
```

Label display requires a lookup: `getLabel("u1")` → reads `["users", "u1"]` from Query cache → `"Alice Johnson"`. The cache is warmed by search results and by the loader at route entry.

For a creatable field, you have a choice:

| What the field stores | Display | Clone/draft | Submit |
|---|---|---|---|
| **Name string** (`"Acme Corp"`) | `field.state.value` directly | Just works, no loader | Pass name to API |
| **ID for existing, `__new:Name` for new** | `getLabel` with prefix handling | Works, no loader for new | Transform in schema |
| **`{ id, isNew, name }` object** | Read `.name` or `getLabel(.id)` | Works | Simpler shape |
| **Two fields** (`companyId` + `newCompanyName`) | One or the other | Works | Backend chooses |

---

## Approach Considerations

### Option A — Store the name string `Field<string | null>`

The field value IS the display label. Picking "Acme Corp" stores `"Acme Corp"`. Creating "NewCo" also stores `"NewCo"`. No ID involved.

```
field.state.value = "Acme Corp"
display: field.state.value   ← done, no lookup
```

**Pros:**
- Zero infrastructure — no cache seeding, no loader step, no `getLabel`
- Clone/draft are trivially correct: `{ companyName: "Acme Corp" }` is self-contained
- Zod schema is simple: `z.string().min(1)`
- Mental model matches the field — it's a name, not a reference

**Cons:**
- No referential integrity — if the company is renamed on the backend, old saved values drift
- Can't JOIN or look up by company in queries unless you also have an ID somewhere
- Two users typing "ACME" vs "Acme" create two separate companies — backend must dedup

**Best for:** Company name on a contact/deal form where companies are suggestions, not managed entities.

---

### Option B — Synthetic ID prefix `__new:Name`

Store `Field<string | null>` exactly like every other search field. For existing companies the value is a real ID (`"c42"`). For new ones it's a synthetic sentinel: `"__new:NewCo"`.

Extend `getLabel` to decode the prefix:

```ts
const getLabel = (id: string | null): string => {
  if (!id) return ""
  if (id.startsWith("__new:")) return id.slice(6)   // ← no cache, decode inline
  const cached = queryClient.getQueryData<ResolvedEntity>([entityKey, id])
  return cached?.name ?? id
}
```

When "Create 'NewCo'" is clicked:
```ts
field.handleChange("__new:NewCo")
// getLabel → "NewCo" immediately, no cache seeding needed
```

At submit, Zod transforms:
```ts
companyId: z.string().transform(v =>
  v.startsWith("__new:")
    ? { op: "create", name: v.slice(6) }
    : { op: "link",   id: v }
)
```

**Pros:**
- `Field<string | null>` — identical type to all other search fields
- All existing patterns (multi-select, validation, clone) compose without changes
- Draft round-trips without loader: `"__new:NewCo"` → `getLabel` → "NewCo" immediately
- Backend gets explicit intent: create vs link

**Cons:**
- The `__new:` prefix is a leaky abstraction — it must never reach your API raw
- `getLabel` in the hook needs the prefix-handling extension
- Submit logic is slightly more complex (one Zod transform)

**Best for:** When companies are first-class entities with IDs, and the API distinguishes between linking an existing company and creating a new one.

---

### Option C — Typed object `{ id: string | null; name: string; isNew: boolean } | null`

Change the field type to be explicit:

```ts
type CompanyValue = { id: string | null; name: string; isNew: boolean } | null
```

```
{ id: "c42",  name: "Acme Corp", isNew: false }  // existing
{ id: null,   name: "NewCo",     isNew: true  }  // new
```

Display: always read `.name`. Submit: branch on `.isNew`.

**Pros:**
- Most type-safe and explicit
- No sentinel values, no encoding/decoding

**Cons:**
- Breaks `Field<string | null>` — can't reuse `EntitySearchField` patterns
- Serialization for drafts is more complex (need to handle the object shape)
- Zod schema and default values are more involved

**Best for:** When you want maximum explicitness and are OK with a bespoke field type.

---

### Option D — Two separate fields

```ts
companyId: string | null        // existing company, picked from search
newCompanyName: string | null   // new company name, typed inline
```

The UI renders one combobox that writes to one or the other depending on the selection path. At submit: if `companyId` is set, link; else use `newCompanyName` to create.

**Cons:**
- Two fields for one concept — awkward for validation (either-or required)
- More state coordination
- Clone/draft must handle both fields

**Not recommended.**

---

## Best Set of Tradeoffs

Two scenarios, two answers:

### Scenario 1: Freeform company name (suggestions only)

> Company name field on a contact. Companies aren't managed entities. Users type whatever they want. Autocomplete helps prevent `"ACME"` vs `"Acme"` drift but it's not enforced.

**→ Use Option A (name string).** Value = name. No infrastructure. Simplest correct solution.

### Scenario 2: Company is a first-class entity (has an ID, managed separately)

> CRM where companies have their own records, employees, deals. You need to link contacts to specific company records, with the option to create a new company record inline during contact creation.

**→ Use Option B (`__new:` prefix).** Stays compatible with the existing search field pattern. The `__new:` sentinel is contained to the field layer and transformed at submit. Clone/draft work without loaders.

---

## Implementation

### Generic: `CreatableEntitySearchField`

```tsx
// app-fields/entity-search-field.tsx

type CreatableEntitySearchFieldProps = {
  field: Field<string | null>
  searchHook: { search, setSearch, clearSearch, options, isLoading }
  creatable?: boolean
  createLabel?: (search: string) => string
  label?: string
  // ...same display props as EntitySearchField
}

export function CreatableEntitySearchField({ field, searchHook, creatable = true, createLabel = (s) => `Create "${s}"`, ... }) {
  const { search, setSearch, clearSearch, options, isLoading } = searchHook
  const combobox = useCombobox({ onDropdownClose: () => { combobox.resetSelectedOption(); clearSearch() } })

  const showCreate = creatable && search.length > 0 && options.length === 0 && !isLoading

  return (
    <Combobox store={combobox} onOptionSubmit={(val) => {
      field.handleChange(val === "__create__" ? search : val)
      combobox.closeDropdown()
    }}>
      {/* InputBase trigger — shows field.state.value directly (Option A)  */}
      {/* or getLabel(field.state.value) for Option B                       */}
      <Combobox.Dropdown>
        <Combobox.Search value={search} onChange={(e) => setSearch(e.target.value)} />
        <Combobox.Options>
          {options.map(o => <Combobox.Option key={o.value} value={o.label}>{o.label}</Combobox.Option>)}
          {showCreate && (
            <Combobox.Option value="__create__">
              <Text size="sm" c="blue">+ {createLabel(search)}</Text>
            </Combobox.Option>
          )}
          {/* empty states... */}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
```

Note: `onOptionSubmit` receives `o.label` (the name) for existing options — not `o.value` (the ID). This is because `<Combobox.Option value={o.label}>` passes the label through. This is intentional for Option A (value = name). For Option B, pass `o.value` and handle `__new:` sentinel instead.

### Concrete: `CompanySearchField` (Option A — name-based)

```tsx
export function CompanySearchField({ field, label = "Company", ...rest }) {
  const searchHook = useCompanySearch()
  return (
    <CreatableEntitySearchField
      field={field}
      searchHook={searchHook}
      label={label}
      searchPlaceholder="Search or create company..."
      nothingFoundMessage="No companies found"
      {...rest}
    />
  )
}
```

```tsx
// Schema
const schema = z.object({
  companyName: z.string().min(1, "Company is required"),
})

// Form
<form.Field name="companyName">
  {(field) => <CompanySearchField field={field} label="Company" required />}
</form.Field>
```

### Hook: `useCompanySearch`

```ts
// hooks/use-entity-search.ts
export function useCompanySearch() {
  return useEntitySearch({
    entityKey: "companies",
    searchFn: (q) => api.searchCompanies(q),
    staleTime: 60_000,
    minChars: 1,
  })
}
```

### Option B variant — ID + `__new:` prefix

Swap these pieces in:

```tsx
// In CreatableEntitySearchField — pass o.value (ID), not o.label
<Combobox.Option key={o.value} value={o.value}>{o.label}</Combobox.Option>

// onOptionSubmit
onOptionSubmit={(val) => {
  if (val === "__create__") {
    field.handleChange(`__new:${search}`)   // synthetic ID
  } else {
    field.handleChange(val)                  // real ID
  }
  combobox.closeDropdown()
}}

// Display — use getLabel with prefix handling
const displayLabel = getLabel(field.state.value)

// Extended getLabel in useEntitySearch (or a custom hook wrapper)
const getLabel = (id: string | null): string => {
  if (!id) return ""
  if (id.startsWith("__new:")) return id.slice(6)
  const cached = queryClient.getQueryData<ResolvedEntity>([entityKey, id])
  return cached?.name ?? id
}
```

Zod schema:
```ts
companyId: z.string().transform(v =>
  v.startsWith("__new:")
    ? { op: "create" as const, name: v.slice(6) }
    : { op: "link"   as const, id: v }
)
```

---

## Edit Mode & Draft Behavior

| Approach | Edit mode | Draft/clone |
|---|---|---|
| **Option A (name)** | `defaultValues: { companyName: "Acme Corp" }` — renders immediately | Serialize as-is, no loader |
| **Option B (`__new:`)** | Existing: loader seeds `["companies", "c42"]` just like any other entity. New (saved draft): `"__new:NewCo"` → `getLabel` decodes inline, no loader | Serialize as-is for new; existing needs loader seed |

Both options handle clone trivially because the field is a plain `string | null`.

---

## Decision Tree

```
Is the company a first-class managed entity with its own ID in the DB?
  │
  ├─ No (freeform suggestions, soft dedup at backend)
  │   └─ Option A: store name string
  │       Field<string | null>, value = name
  │       No getLabel, no cache, no loader step
  │
  └─ Yes (has UUID, has own records, API distinguishes create vs link)
      └─ Option B: __new: prefix
          Field<string | null>, value = ID or "__new:Name"
          Extended getLabel decodes prefix
          Zod transform at submit: { op: "create"|"link", ... }
```

---

## Files

```
hooks/
  use-entity-search.ts     ← add useCompanySearch()

app-fields/
  entity-search-field.tsx  ← add CreatableEntitySearchField (generic)
                              add CompanySearchField (concrete, Option A)
  index.ts                 ← export CompanySearchField
```

The `CreatableEntitySearchField` is generic — it can be used for any entity that needs creatable behavior. Pass any `useEntitySearch`-compatible hook, flip between Option A and B by changing whether you pass `o.label` or `o.value` as the Combobox.Option value.
