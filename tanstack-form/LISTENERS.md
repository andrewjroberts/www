# TanStack Form — Listeners & Reactive Patterns Guide

## Two Systems, Two Jobs

TanStack Form has two reactive primitives. They do completely different things:

| Primitive | Job | Triggers |
|---|---|---|
| `form.Subscribe` | **Rendering** — show/hide UI, display derived state | Selector output changes |
| `listeners` | **Side effects** — reset fields, fetch APIs, re-validate | Field or form value changes |

Never use listeners for rendering. Never use Subscribe for side effects.

---

## form.Subscribe

Reactive subscription to a slice of form state. Only re-renders when the `selector` output changes.

### Basic conditional rendering

```tsx
<form.Subscribe
  selector={(state) => state.values.accountType}
  children={(accountType) =>
    accountType === "business" ? (
      <form.Field name="companyName" children={(field) =>
        <FormTextInput field={field} label="Company" required />
      } />
    ) : null
  }
/>
```

### Multi-value selectors

Return an object or tuple. Subscribe uses shallow comparison, so it only re-renders when the values actually change:

```tsx
<form.Subscribe
  selector={(state) => ({
    type: state.values.accountType,
    country: state.values.country,
  })}
  children={({ type, country }) =>
    type === "business" && country === "US" ? (
      <form.Field name="ein" children={(field) =>
        <FormTextInput field={field} label="EIN" required />
      } />
    ) : null
  }
/>
```

### Displaying derived state

```tsx
{/* Submission status */}
<form.Subscribe
  selector={(state) => state.isSubmitting}
  children={(isSubmitting) => (
    <Button type="submit" loading={isSubmitting}>Submit</Button>
  )}
/>

{/* Dirty indicator */}
<form.Subscribe
  selector={(state) => state.isDirty}
  children={(isDirty) =>
    isDirty ? <Badge color="yellow">Unsaved changes</Badge> : null
  }
/>

{/* Form-level errors */}
<form.Subscribe
  selector={(state) => state.errors}
  children={(errors) =>
    errors.length > 0 ? (
      <Alert color="red">{errors.join(", ")}</Alert>
    ) : null
  }
/>

{/* Live character count */}
<form.Subscribe
  selector={(state) => state.values.bio.length}
  children={(len) => (
    <Text size="sm" c={len > 500 ? "red" : "dimmed"}>{len}/500</Text>
  )}
/>
```

### Nested conditionals

Each Subscribe is independent. Stack them for multi-level conditional logic:

```tsx
<form.Subscribe
  selector={(state) => state.values.accountType}
  children={(accountType) =>
    accountType === "business" ? (
      <>
        <form.Field name="companyName" children={(field) =>
          <FormTextInput field={field} label="Company" required />
        } />

        <form.Field name="needsBilling" children={(field) =>
          <FormCheckbox field={field} label="Enable billing" />
        } />

        {/* Nested — only re-renders when needsBilling changes */}
        <form.Subscribe
          selector={(state) => state.values.needsBilling}
          children={(needsBilling) =>
            needsBilling ? (
              <>
                <form.Field name="billingEmail" children={(field) =>
                  <FormTextInput field={field} label="Billing Email" required />
                } />
                <form.Field name="billingAddress" children={(field) =>
                  <FormTextarea field={field} label="Billing Address" />
                } />
              </>
            ) : null
          }
        />
      </>
    ) : null
  }
/>
```

Performance: the inner Subscribe doesn't re-render when `accountType` changes (it stays mounted since its parent already handles that). And the outer Subscribe doesn't re-render when `needsBilling` changes. Each is surgical.

---

## Field Listeners

Side effects that fire when a field's value changes. Declared on the **source** field — the one that triggers the effect.

### Syntax

```tsx
<form.Field
  name="sourceField"
  listeners={{
    onChange: ({ value, fieldApi }) => { ... },
    onChangeDebounceMs: 500,                      // optional debounce
    onBlur: ({ value, fieldApi }) => { ... },
  }}
  children={(field) => <FormTextInput field={field} />}
/>
```

### Reset dependent fields

When a parent selection changes, clear its children:

```tsx
<form.Field
  name="country"
  listeners={{
    onChange: ({ value }) => {
      // Country changed — reset state/province which is now invalid
      form.setFieldValue("state", null)
      form.setFieldValue("city", "")
      form.setFieldValue("postalCode", "")
    },
  }}
  children={(field) =>
    <FormSelect field={field} label="Country" data={countries} required />
  }
/>

{/* These fields don't need listeners — they're just targets */}
<form.Field name="state" children={(field) =>
  <FormSelect field={field} label="State" data={statesForCountry} />
} />
<form.Field name="city" children={(field) =>
  <FormTextInput field={field} label="City" />
} />
```

### API lookup / prefill

Fetch external data when a field value changes:

```tsx
<form.Field
  name="lei"
  listeners={{
    onChange: async ({ value }) => {
      if (value.length !== 20) return

      const res = await fetch(`https://api.gleif.org/api/v1/lei-records/${value}`)
      if (!res.ok) return

      const entity = (await res.json()).data.attributes.entity
      form.setFieldValue("entityName", entity.legalName?.name ?? "")
      form.setFieldValue("jurisdiction", entity.jurisdiction ?? "")
      form.setFieldValue("entityStatus", entity.status ?? null)
    },
    onChangeDebounceMs: 500,
  }}
  children={(field) =>
    <FormTextInput field={field} label="LEI" maxLength={20} />
  }
/>
```

### Dynamic options

Update one field's available options based on another:

```tsx
const [stateOptions, setStateOptions] = useState<string[]>([])

<form.Field
  name="country"
  listeners={{
    onChange: async ({ value }) => {
      if (!value) { setStateOptions([]); return }
      const states = await fetchStatesForCountry(value)
      setStateOptions(states)
      form.setFieldValue("state", null)  // reset selection
    },
  }}
  children={(field) =>
    <FormSelect field={field} label="Country" data={countries} />
  }
/>

<form.Field name="state" children={(field) =>
  <FormSelect field={field} label="State" data={stateOptions} />
} />
```

---

## Cross-Field Listeners (onChangeListenTo)

React to changes in **other** fields. Declared on the **target** field — the one that needs to respond.

### Re-validate when sibling changes

```tsx
<form.Field
  name="confirmPassword"
  validators={{
    onChange: () => undefined,  // suppress form-level
    onBlur: ({ value, fieldApi }) => {
      const pw = fieldApi.form.getFieldValue("password")
      return value && value !== pw ? "Doesn't match" : undefined
    },
  }}
  listeners={{
    onChangeListenTo: ["password"],          // watch password field
    onChange: ({ fieldApi }) => {
      fieldApi.validate("blur")              // re-run our validator
    },
  }}
  children={(field) =>
    <FormPasswordInput field={field} label="Confirm Password" />
  }
/>
```

### Derived calculations

```tsx
<form.Field
  name="total"
  listeners={{
    onChangeListenTo: ["quantity", "unitPrice", "discount"],
    onChange: ({ fieldApi }) => {
      const qty = fieldApi.form.getFieldValue("quantity")
      const price = fieldApi.form.getFieldValue("unitPrice")
      const discount = fieldApi.form.getFieldValue("discount")

      const numQty = typeof qty === "number" ? qty : 0
      const numPrice = typeof price === "number" ? price : 0
      const numDiscount = typeof discount === "number" ? discount : 0

      fieldApi.handleChange(numQty * numPrice * (1 - numDiscount / 100))
    },
  }}
  children={(field) =>
    <FormNumberInput field={field} label="Total" disabled />
  }
/>
```

### Cascading resets

```tsx
{/* Country → State → City cascade */}
<form.Field
  name="state"
  listeners={{
    onChangeListenTo: ["country"],
    onChange: ({ fieldApi }) => {
      // Country changed upstream — reset state and its dependent (city)
      fieldApi.handleChange(null)
      fieldApi.form.setFieldValue("city", "")
    },
  }}
  children={(field) => <FormSelect field={field} label="State" data={...} />}
/>

<form.Field
  name="city"
  listeners={{
    onChangeListenTo: ["state"],
    onChange: ({ fieldApi }) => {
      fieldApi.handleChange("")
    },
  }}
  children={(field) => <FormTextInput field={field} label="City" />}
/>
```

---

## Form-Level Listeners

Declared on `useForm` itself. Fire on **any** field change.

### Auto-save

```tsx
const form = useForm({
  defaultValues: { ... },
  listeners: {
    onChange: ({ formApi }) => {
      if (formApi.state.isDirty) {
        saveDraft(formApi.state.values)
      }
    },
    onChangeDebounceMs: 5000,
  },
})
```

### Logging / analytics

```tsx
const form = useForm({
  listeners: {
    onMount: ({ formApi }) => {
      analytics.track("form_opened", { formId: "profile" })
    },
    onChange: ({ formApi, fieldApi }) => {
      // fieldApi is the field that triggered the change
      analytics.track("field_changed", {
        field: fieldApi.name,
        formValid: formApi.state.isValid,
      })
    },
    onChangeDebounceMs: 1000,
  },
})
```

---

## Where Listeners Live: Source vs Target

This is the key mental model. Ask: **"who caused the change?"**

```
SOURCE field (the cause)
  └── listeners.onChange → side effects (reset targets, fetch API, etc.)

TARGET field (the effect)
  └── listeners.onChangeListenTo → re-validate, recalculate
  └── (or no listener at all — it's just a dumb field that got setFieldValue'd)
```

### Example: country → state → city cascade

```
country (SOURCE)
  ├── listeners.onChange → fetch states, reset state + city
  └── Subscribe → show/hide state field if country requires it

state (TARGET of country, SOURCE of city)
  ├── listeners.onChangeListenTo: ["country"] → reset self
  └── listeners.onChange → fetch cities, reset city

city (TARGET of state)
  └── listeners.onChangeListenTo: ["state"] → reset self
```

### When targets DON'T need listeners

If the source already handles everything via `form.setFieldValue`, targets don't need their own listeners. This is simpler:

```tsx
// Source handles all resets — targets are dumb
<form.Field
  name="country"
  listeners={{
    onChange: ({ value }) => {
      form.setFieldValue("state", null)
      form.setFieldValue("city", "")
    },
  }}
  children={(field) => <FormSelect field={field} label="Country" data={...} />}
/>

// No listeners needed
<form.Field name="state" children={(field) => ... } />
<form.Field name="city" children={(field) => ... } />
```

vs targets managing themselves:

```tsx
// Each target resets itself — source doesn't need to know about them
<form.Field name="country" children={(field) => ... } />

<form.Field name="state"
  listeners={{
    onChangeListenTo: ["country"],
    onChange: ({ fieldApi }) => fieldApi.handleChange(null),
  }}
  children={(field) => ... }
/>
```

**Use source-driven** when the source knows all its targets (simpler, centralized).
**Use target-driven** when targets are independent/reusable and shouldn't be hardcoded into the source.

---

## Debouncing

Built-in on both field and form listeners:

```tsx
// Field-level debounce
<form.Field
  name="search"
  listeners={{
    onChange: async ({ value }) => {
      const results = await api.search(value)
      form.setFieldValue("suggestions", results)
    },
    onChangeDebounceMs: 300,
  }}
/>

// Form-level debounce
const form = useForm({
  listeners: {
    onChange: ({ formApi }) => autoSave(formApi.state.values),
    onChangeDebounceMs: 5000,
  },
})
```

For fixed-length inputs (like LEI = 20 chars), length checking acts as a natural gate — debounce is optional since the API call only fires when complete:

```tsx
onChange: async ({ value }) => {
  if (value.length !== 20) return  // natural debounce
  await fetchLEI(value)
},
onChangeDebounceMs: 500,  // still useful to catch rapid paste/delete/paste
```

---

## Conditional Fields + Listeners Decision Tree

```
Does the field appear/disappear based on other state?
  └── YES → form.Subscribe handles visibility

Does a field's VALUE need to change when another field changes?
  └── YES → listener on source (onChange → setFieldValue)
       or → listener on target (onChangeListenTo → handleChange)

Does a field need RE-VALIDATION when another field changes?
  └── YES → listener on target (onChangeListenTo → validate)

Does the whole form need to react to any change?
  └── YES → form-level listener (auto-save, analytics, logging)

None of the above?
  └── No listener needed. It's just a field.
```

---

## Quick Reference

| Pattern | Tool | Where declared |
|---|---|---|
| Show/hide fields | `form.Subscribe` | Parent of conditional block |
| Display derived state (count, status) | `form.Subscribe` | Wherever you need it |
| Reset dependent fields | `listeners.onChange` | Source field |
| Fetch API on value change | `listeners.onChange` + debounce | Source field |
| Dynamic options based on sibling | `listeners.onChange` + local state | Source field |
| Re-validate when sibling changes | `listeners.onChangeListenTo` | Target field |
| Derived calculations | `listeners.onChangeListenTo` | Target (computed) field |
| Cascading resets | `listeners.onChangeListenTo` | Each level in the cascade |
| Auto-save drafts | Form `listeners.onChange` + debounce | `useForm` config |
| Analytics / logging | Form `listeners.onChange` or `onMount` | `useForm` config |
| Suppress form-level validation | `validators: { onChange: () => undefined }` | Target field |

### Subscribe selectors for common cases

| Need | Selector |
|---|---|
| Single field value | `(s) => s.values.fieldName` |
| Multiple values | `(s) => ({ a: s.values.a, b: s.values.b })` |
| Is dirty | `(s) => s.isDirty` |
| Is submitting | `(s) => s.isSubmitting` |
| Is valid | `(s) => s.isValid` |
| Form-level errors | `(s) => s.errors` |
| Specific field errors | `(s) => s.fieldMeta.fieldName?.errors` |
