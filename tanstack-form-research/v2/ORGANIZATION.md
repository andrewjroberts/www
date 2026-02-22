# Form Fields — Organization, Registration & Enums

## File Structure

```
form-fields/
  types.ts       — Field<T>, FieldMeta, firstError
  text.tsx       — TextInput, Textarea, PasswordInput, JsonInput, PinInput
  number.tsx     — NumberInput
  boolean.tsx    — Checkbox, Switch, Chip
  select.tsx     — Select, MultiSelect, Autocomplete, TagsInput, NativeSelect
  radio.tsx      — RadioGroup, SegmentedControl
  slider.tsx     — Slider, RangeSlider, AngleSlider, Rating
  color.tsx      — ColorInput, ColorPicker
  file.tsx       — FileInput, FileInputMultiple
  date.tsx       — DateInput, DatePickerInput (×3), DateTimePicker,
                   DatePicker (×3), MonthPickerInput, YearPickerInput
  time.tsx       — TimeInput, TimePicker
  index.ts       — Barrel re-export

use-app-form.ts  — createFormHook registration (all fields + form components)
```

### Two ways to import

```tsx
// Barrel — grab what you need from one path
import { FormTextInput, FormSelect, FormDateInput } from "@/form-fields"

// Direct — smaller import, explicit dependency
import { FormTextInput } from "@/form-fields/text"
import { FormSelect } from "@/form-fields/select"
```

Both work. Barrel is convenient. Direct is explicit. Tree-shaking handles either.

---

## Field Registration with createFormHook

TanStack Form's `createFormHook` lets you register all field components once, then use them across every form with less boilerplate.

### Setup (use-app-form.ts)

```tsx
import { createFormHookContexts, createFormHook } from "@tanstack/react-form"
import { FormTextInput } from "./form-fields/text"
import { FormSelect } from "./form-fields/select"
// ... all other imports

const { fieldContext, formContext } = createFormHookContexts()

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextInput: FormTextInput,
    Select: FormSelect,
    Checkbox: FormCheckbox,
    DateInput: FormDateInput,
    // ... register all 34 wrappers
  },
  formComponents: {
    DraftControls,
  },
})
```

### Using registered fields

```tsx
import { useAppForm } from "./use-app-form"

function ProfileForm() {
  const form = useAppForm({
    defaultValues: {
      name: "",
      country: null as string | null,
    },
    onSubmit: async ({ value }) => { ... },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      {/* AppField — registered component, one-liner */}
      <form.AppField name="name" component="TextInput" label="Name" required />
      <form.AppField name="country" component="Select" label="Country"
        data={["US", "UK"]} clearable required />
    </form>
  )
}
```

### When to use AppField vs render prop

| Situation | Use |
|---|---|
| Simple field, no validators/listeners | `form.AppField` — clean one-liner |
| Field needs `validators` or `listeners` | `form.Field` render prop |
| Cross-field validation | `form.Field` render prop |
| Conditional rendering | `form.Subscribe` + `form.Field` |
| One-off inline customization | `form.Field` render prop |

You can mix both in the same form. `AppField` for the 80% that are straightforward, `Field` for the 20% that need custom logic.

### Register all or pick per form?

**Register all.** The registration map is just a lookup table — unused components aren't instantiated. Tree-shaking removes them from the bundle if you're using a bundler that supports it. There's no runtime cost to registering 34 components when a form only uses 5.

---

## Enums

### The Problem

TypeScript enums are strings at runtime. Select/Combobox deal in `string | null`. How do they connect?

```tsx
enum AccountStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Suspended = "SUSPENDED",
}
```

### The Answer: Form State Is String, Enum Is Validation

This follows the three type zones exactly:

```
FORM STATE          VALIDATION                  SUBMISSION
string | null       z.nativeEnum(AccountStatus) AccountStatus
```

The form field type is `string | null` — because that's what Select emits. The enum constrains what values are valid — that's Zod's job at the validation boundary. At submit, Zod narrows `string` to `AccountStatus`.

**Why not type the form field as `AccountStatus | null`?**

Function parameter contravariance. If the form field is `AccountStatus | null`, then `handleChange` expects `AccountStatus | null`. But `FormSelect`'s `Field<string | null>` calls `handleChange(string | null)`. A function accepting a narrow type isn't assignable to one accepting a wide type. It won't compile.

The wrapper doesn't know about your enum. It shouldn't. The wrapper deals in strings. The enum is a validation concern.

### Full Pattern

```tsx
import { z } from "zod"
import { useAppForm } from "./use-app-form"

// ── Define the enum ──────────────────────────────────────────────────────

enum AccountStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Suspended = "SUSPENDED",
}

// ── Helper: enum → Select data ──────────────────────────────────────────

// Reusable for any enum. Maps enum values to { value, label } pairs.
function enumToSelectData<T extends Record<string, string>>(
  enumObj: T,
  labels?: Partial<Record<T[keyof T], string>>
): Array<{ value: string; label: string }> {
  return Object.values(enumObj).map((value) => ({
    value,
    label: labels?.[value as T[keyof T]] ?? value,
  }));
}

const STATUS_OPTIONS = enumToSelectData(AccountStatus, {
  [AccountStatus.Active]: "Active",
  [AccountStatus.Inactive]: "Inactive",
  [AccountStatus.Suspended]: "Suspended",
});
// → [{ value: "ACTIVE", label: "Active" }, ...]

// ── Schema ──────────────────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().min(1, "Required"),
  status: z.nativeEnum(AccountStatus, {
    error: "Status is required",
  }),
  // Note: z.nativeEnum(AccountStatus) rejects null AND invalid strings.
  // At the form state level, status is string | null.
  // z.nativeEnum narrows it to AccountStatus at submit.
})

type AccountSubmission = z.infer<typeof accountSchema>
// { name: string; status: AccountStatus }

// ── Form state ──────────────────────────────────────────────────────────

type AccountForm = {
  name: string;
  status: string | null;  // NOT AccountStatus | null
}

// ── The form ────────────────────────────────────────────────────────────

function AccountForm() {
  const form = useAppForm({
    defaultValues: {
      name: "",
      status: null,      // null = nothing selected yet
    } satisfies AccountForm,

    validators: { onBlur: accountSchema },

    onSubmit: async ({ value }) => {
      const payload: AccountSubmission = accountSchema.parse(value)
      // payload.status is AccountStatus, not string
      console.log(payload.status) // "ACTIVE" | "INACTIVE" | "SUSPENDED"
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <form.AppField name="name" component="TextInput" label="Name" required />
      <form.AppField name="status" component="Select" label="Status"
        data={STATUS_OPTIONS} clearable required />
    </form>
  )
}
```

### Enum with SegmentedControl or RadioGroup

For enums with few values where all options should be visible (no dropdown):

```tsx
// SegmentedControl — Field<string>, not nullable (always has a value)
type SettingsForm = {
  theme: string;  // "light" | "dark" | "system" at runtime, string to TS
}

<form.AppField name="theme" component="SegmentedControl"
  data={enumToSelectData(Theme)} />

// RadioGroup — same deal, Field<string>
<form.Field name="priority" children={(field) => (
  <FormRadioGroup field={field} label="Priority">
    <Group>
      <Radio value={Priority.Low} label="Low" />
      <Radio value={Priority.Medium} label="Medium" />
      <Radio value={Priority.High} label="High" />
    </Group>
  </FormRadioGroup>
)} />
```

### Enum with MultiSelect

```tsx
enum Permission {
  Read = "READ",
  Write = "WRITE",
  Admin = "ADMIN",
}

type RoleForm = {
  permissions: string[];  // NOT Permission[], same contravariance reason
}

const permissionSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)).min(1, "At least one"),
})

<form.AppField name="permissions" component="MultiSelect" label="Permissions"
  data={enumToSelectData(Permission)} required />
```

### The enumToSelectData helper

One utility handles all enums:

```tsx
// No custom labels — uses the enum value as the label
enumToSelectData(AccountStatus)
// → [{ value: "ACTIVE", label: "ACTIVE" }, ...]

// With custom labels
enumToSelectData(AccountStatus, {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
})
// → [{ value: "ACTIVE", label: "Active" }, ...]

// With descriptions (for Combobox)
function enumToComboboxData<T extends Record<string, string>>(
  enumObj: T,
  config: Record<T[keyof T], { label: string; description?: string }>
): Array<{ value: string; label: string; description?: string }> {
  return Object.values(enumObj).map((value) => ({
    value,
    ...config[value as T[keyof T]],
  }));
}
```

---

## Quick Reference

### File → Components

| File | Components | Field type |
|---|---|---|
| `text.tsx` | TextInput, Textarea, PasswordInput, JsonInput, PinInput | `string` |
| `number.tsx` | NumberInput | `number \| string` |
| `boolean.tsx` | Checkbox, Switch, Chip | `boolean` |
| `select.tsx` | Select | `string \| null` |
| `select.tsx` | MultiSelect, TagsInput | `string[]` |
| `select.tsx` | Autocomplete, NativeSelect | `string` |
| `radio.tsx` | RadioGroup, SegmentedControl | `string` |
| `slider.tsx` | Slider, AngleSlider, Rating | `number` |
| `slider.tsx` | RangeSlider | `[number, number]` |
| `color.tsx` | ColorInput, ColorPicker | `string` |
| `file.tsx` | FileInput | `File \| null` |
| `file.tsx` | FileInputMultiple | `File[]` |
| `date.tsx` | DateInput, DatePickerInput, DateTimePicker, DatePicker, MonthPickerInput, YearPickerInput | `Date \| null` |
| `date.tsx` | DatePickerInputMultiple, DatePickerMultiple | `Date[]` |
| `date.tsx` | DatePickerInputRange, DatePickerRange | `[Date \| null, Date \| null]` |
| `time.tsx` | TimeInput, TimePicker | `string` |

### Enum decision tree

```
How many enum values?
  2-4 and all visible → SegmentedControl (Field<string>)
  2-4 with labels     → RadioGroup (Field<string>)
  5+                   → Select (Field<string | null>)
  5+ multi-select      → MultiSelect (Field<string[]>)
  5+ with custom UI    → FormComboboxSelect (Field<string | null>)

Type the form field as string (or string | null), NOT the enum.
Use z.nativeEnum() in the schema to validate + narrow.
Use enumToSelectData() to generate the data prop.
```

### AppField vs Field decision

```
Need validators, listeners, or custom rendering?
  YES → form.Field with render prop
  NO  → form.AppField with component name
```
