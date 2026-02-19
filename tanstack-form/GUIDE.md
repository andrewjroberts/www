# TanStack Form + Mantine — Architecture Guide

## Files

| File | What it owns |
|------|-------------|
| `form-fields.tsx` | 34 Mantine wrappers with structural `Field<T>` types |
| `use-app-form.tsx` | `useAppForm`, `useDraft`, `<DraftControls>` |
| `form-examples.tsx` | Three complete forms demonstrating every pattern |

---

## Core Concept: Structural Field Types

The wrappers use a structural type that mirrors `FieldApi`:

```ts
type Field<TValue> = {
  state: { value: TValue; meta: { errors: ValidationError[] } };
  handleChange: (value: TValue) => void;
  handleBlur: () => void;
};
```

When TanStack's `<form.Field name="email">` resolves the concrete `FieldApi`, TypeScript checks structurally against the wrapper's `Field<string>`. No generics, no casts. Mismatches are compile errors:

```tsx
// ✅ name is string → Field<string> → FormTextInput
<form.Field name="name" children={(field) =>
  <FormTextInput field={field} label="Name" />
} />

// ❌ age is number → Field<number> ≠ Field<string> → compile error
<form.Field name="age" children={(field) =>
  <FormTextInput field={field} />
} />
```

### Why not generics?

TypeScript cannot reduce `DeepValue<TFormData, TName>` to `string` inside a generic function body, even with constraints. Any generic wrapper would need internal casts — technically safe but dishonest. The structural approach eliminates all casts because the concrete type resolution happens at the call site.

---

## Wrapper Reference

### Value types per component

| Value type | Components |
|---|---|
| `string` | TextInput, Textarea, Password, ColorInput, ColorPicker, NativeSelect, PinInput, JsonInput, Autocomplete, RadioGroup, SegmentedControl, TimeInput, TimePicker |
| `boolean` | Checkbox, Switch, Chip |
| `number` | Slider, AngleSlider, Rating |
| `number \| string` | NumberInput |
| `[number, number]` | RangeSlider |
| `string \| null` | Select |
| `string[]` | MultiSelect, TagsInput |
| `File \| null` | FileInput |
| `File[]` | FileInputMultiple |
| `Date \| null` | DateInput, DatePickerInput, DateTimePicker, DatePicker, MonthPickerInput, YearPickerInput |
| `Date[]` | DatePickerInputMultiple, DatePickerMultiple |
| `[Date \| null, Date \| null]` | DatePickerInputRange, DatePickerRange |

### Components NOT wrapped (and why)

These are structural/display components, not controlled form inputs:

- **Fieldset** — layout wrapper, not a value holder
- **Input** — base unstyled primitive, use TextInput etc. instead
- **Combobox** — headless dropdown primitive for custom selects
- **Pill / PillsInput** — visual components used inside MultiSelect/TagsInput
- **MiniCalendar / Calendar** — display-only, use DatePicker for selection
- **MonthPicker / YearPicker** — inline grids without input box, use the `*Input` variants
- **TimeGrid** — display grid, not a controlled input
- **TimeValue** — utility type, not a component

---

## Three Type Zones

```
FORM STATE              VALIDATION              SUBMISSION
(what components emit)  (what passes through)   (what your API gets)
─────────────────────   ─────────────────────   ─────────────────────
string                  .min(1) rejects ""      z.string().min(1)
string | null           z.string() rejects null z.string()
boolean                 z.literal(true)         z.literal(true)
string                  (no validator)          z.string()
string | null           (no validator)          z.string().nullable()
boolean                 (no validator)          z.boolean()
```

**Wrappers live in zone 1.** They don't know or care about validation. The field type is dictated by what the Mantine component emits, not by your business rules.

---

## Validation Strategy

### Form-level Zod (preferred default)

Pass a Zod schema to `validators`. Errors auto-propagate to fields by path:

```tsx
const form = useForm<MyForm>({
  validators: {
    onBlur: myZodSchema,    // validates entire form on any field blur
  },
})
```

No field-level validators needed. Fields just render.

### Field-level overrides

Field-level validators override form-level for the **same event**:

```tsx
<form.Field
  name="expensiveField"
  validators={{
    onBlur: ({ value }) =>          // overrides form-level onBlur for this field
      value.length < 10 ? "Too short" : undefined,
  }}
/>
```

### Suppressing form-level for a field

Override the event with a no-op:

```tsx
<form.Field
  name="confirmPassword"
  validators={{
    onChange: () => undefined,   // suppresses form-level onChange
    onBlur: ({ value, fieldApi }) => {
      const pw = fieldApi.form.getFieldValue("password");
      return value !== pw ? "Doesn't match" : undefined;
    },
  }}
/>
```

### Cross-field validation

**Error on a specific field:**

```tsx
<form.Field
  name="endDate"
  validators={{
    onBlur: ({ value, fieldApi }) => {
      const start = fieldApi.form.getFieldValue("startDate");
      return start && value && value < start ? "Must be after start" : undefined;
    },
  }}
  listeners={{
    onChangeListenTo: ["startDate"],       // re-validate when start changes
    onChange: ({ fieldApi }) => fieldApi.validate("blur"),
  }}
/>
```

**Error on the form (not tied to a field):**

```tsx
const form = useForm({
  validators: {
    onBlur: ({ value }) => {
      if (someFormLevelCheck(value)) return "Form-level error message";
      return undefined;
    },
  },
})

// Display form-level errors
<form.Subscribe
  selector={(state) => state.errors}
  children={(errors) =>
    errors.length ? <Alert color="red">{errors.join(", ")}</Alert> : null
  }
/>
```

---

## Required vs Optional

The wrapper never changes. The difference is validation + Zod narrowing.

| Pattern | Field type | Schema | Visual |
|---|---|---|---|
| Required string | `string` | `z.string().min(1)` | `required` prop |
| Optional string | `string` | `z.string()` | no `required` |
| Required nullable | `string \| null` | `z.string()` (rejects null) | `required` prop |
| Optional nullable | `string \| null` | `z.string().nullable()` | no `required` |
| Must be true | `boolean` | `z.literal(true)` | — |
| Either fine | `boolean` | `z.boolean()` | — |
| At least one | `string[]` | `z.array().min(1)` | `required` prop |
| Optional array | `string[]` | `z.array()` | no `required` |

### Narrowing at submit

Your form state is wide (nulls, empty strings). Zod narrows it:

```tsx
onSubmit: async ({ value }) => {
  const payload = mySchema.parse(value);
  //    ^? Narrow type — string instead of string | null, etc.
  await api.submit(payload);
}
```

---

## Draft Save

### Manual save button

```tsx
const { form, draft } = useAppForm<MyForm>({
  defaultValues: { ... },
  onSubmit: async ({ value }) => { ... },
  draft: {
    onSaveDraft: (values) => api.saveDraft(values),
    draftSchema: looseSchema,   // optional partial validation
  },
})

// In JSX:
<DraftControls draft={draft} form={form} />
```

`DraftControls` renders: Save Draft (with loading) | timestamp | Discard (when dirty) | Submit (with loading).

### Auto-save via form listeners

Use TanStack's built-in listener debounce instead of `setInterval`:

```tsx
const { form, draft } = useAppForm<MyForm>({
  // ...
  listeners: {
    onChange: ({ formApi }) => {
      if (formApi.state.isDirty) draft?.saveDraft();
    },
    onChangeDebounceMs: 5000,
  },
  draft: {
    onSaveDraft: (values) => api.saveDraft(values),
  },
})
```

### How draft save works

- Reads `form.state.values` directly — **no validators run**
- Optional `draftSchema` for partial validation (e.g. "at least give it a name")
- After save: `form.reset(values)` resets dirty baseline so isDirty becomes false
- Submit button still goes through `handleSubmit` → full validation → `onSubmit`

---

## Create / Edit / Clone

All three are the same form with different `defaultValues` and submit behavior:

```tsx
function MyForm({ mode, initialData }: Props) {
  const defaults = initialData ? mapApiToForm(initialData) : emptyDefaults;

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      const payload = schema.parse(value);
      if (mode === "edit") await api.update(initialData!.id, payload);
      else await api.create(payload);   // create + clone both POST
    },
  })
}
```

Clone is just create with prefilled `defaultValues`. Strip the ID, change the submit.

---

## Prefills

**From URL params / external source:**

```tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  if (name) form.setFieldValue("name", name);
  // Fields are now dirty — correct for prefills
}, [])
```

**From API (e.g. LEI lookup):**

Use field listeners with built-in debounce:

```tsx
<form.Field
  name="lei"
  listeners={{
    onChange: async ({ value }) => {
      if (value.length !== 20) return;
      const data = await fetchLEI(value);
      form.setFieldValue("entityName", data.name);
      form.setFieldValue("jurisdiction", data.jurisdiction);
    },
    onChangeDebounceMs: 500,
  }}
  children={(field) => <FormTextInput field={field} label="LEI" />}
/>
```

**Prefill vs clone:** `setFieldValue` marks fields dirty. `defaultValues` does not. Use `setFieldValue` when the user should see "unsaved changes", use `defaultValues` when the data is the starting point.

---

## Reset

```tsx
form.reset()                    // reset all fields to defaultValues
form.reset(newValues)           // reset to new baseline (updates what "default" means)
form.resetField("email")        // reset single field

// Discard button (only shown when dirty)
<form.Subscribe
  selector={(state) => state.isDirty}
  children={(isDirty) =>
    isDirty ? <Button onClick={() => form.reset()}>Discard</Button> : null
  }
/>
```

### Navigation blocking

```tsx
const blocker = useBlocker(() => form.state.isDirty);

useEffect(() => {
  if (blocker.state === "blocked") {
    const leave = window.confirm("Unsaved changes. Leave?");
    if (leave) blocker.proceed();
    else blocker.reset();
  }
}, [blocker.state]);
```

---

## Conditional Fields

Use `form.Subscribe` to reactively show/hide fields:

```tsx
<form.Field name="requiresApproval" children={(field) =>
  <FormCheckbox field={field} label="Requires approval" />
} />

<form.Subscribe
  selector={(state) => state.values.requiresApproval}
  children={(requiresApproval) =>
    requiresApproval ? (
      <form.Field name="approverEmail" children={(field) =>
        <FormTextInput field={field} label="Approver" required />
      } />
    ) : null
  }
/>
```

At submit, exclude hidden fields from the payload conditionally.

---

## Custom Wrappers

### Value transforms

```tsx
type FormPercentInputProps = {
  field: Field<number>;
} & Omit<NumberInputProps, "value" | "onChange" | "onBlur" | "error">;

export function FormPercentInput({ field, ...rest }: FormPercentInputProps) {
  return (
    <NumberInput
      value={field.state.value * 100}
      onChange={(val) => field.handleChange(typeof val === "number" ? val / 100 : 0)}
      onBlur={field.handleBlur}
      error={firstError(field.state.meta)}
      suffix="%"
      {...rest}
    />
  );
}
```

### Multi-field components

```tsx
type CurrencyAmountProps = {
  currencyField: Field<string | null>;
  amountField: Field<number | string>;
};

export function CurrencyAmount({ currencyField, amountField }: CurrencyAmountProps) {
  return (
    <Group>
      <Select value={currencyField.state.value} onChange={currencyField.handleChange}
        data={["USD", "EUR", "GBP"]} w={100} />
      <NumberInput value={amountField.state.value} onChange={amountField.handleChange}
        onBlur={amountField.handleBlur} flex={1} />
    </Group>
  );
}

// Usage — nest Field calls to get both subscriptions
<form.Field name="currency" children={(currencyField) =>
  <form.Field name="amount" children={(amountField) =>
    <CurrencyAmount currencyField={currencyField} amountField={amountField} />
  } />
} />
```

### One-off overrides

Skip the wrapper entirely. Inline the render prop:

```tsx
<form.Field name="price" children={(field) => (
  <NumberInput
    value={field.state.value}
    onChange={(val) => {
      field.handleChange(val);
      recalculateTotals(val);   // one-off side effect
    }}
    onBlur={field.handleBlur}
  />
)} />
```

---

## Decision Framework

| Situation | Approach |
|---|---|
| Standard field | Use the wrapper: `<FormTextInput field={field} />` |
| One-off side effect | Inline the render prop |
| Recurring side effect | Field listeners or new wrapper |
| Different value contract | New wrapper with different `Field<T>` |
| Multiple fields in one visual | Multi-field component accepting multiple field props |
| Form-level validation | `useForm({ validators: { onBlur: zodSchema } })` |
| Field needs different event | Field-level override + suppress form-level |
| Cross-field validation | Field validator + `listeners.onChangeListenTo` |
| API-driven prefill | Field `listeners.onChange` + `form.setFieldValue` |
| Draft save | `useAppForm` with `draft` config + `<DraftControls>` |
| Auto-save | Form `listeners.onChange` + `onChangeDebounceMs` |
| Create/edit/clone | Same form, different `defaultValues` + submit handler |
| Navigation guard | `useBlocker(() => form.state.isDirty)` |
