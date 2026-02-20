# TanStack Form — Architecture Decisions & Patterns

**Context:** Notes from a technical discussion on TanStack Form with Zod validation, covering component layout patterns, validation strategies, and the recommended `useAppForm` / `withForm` architecture.

---

## 1. Rendering Outside the Form Context (Layout Pattern)

**Question:** Can you render components like a submit button outside the form's JSX tree? Does `form.Subscribe` need to be inside a form context? Can `useForm` be called in multiple places?

**Key Decisions:**

- **TanStack Form does not use React Context by default.** `useForm` returns a plain object — no `<FormProvider>` wrapper needed.
- **`form.Subscribe` works anywhere** as long as it has access to the `form` instance (via props, store, etc.).
- **Only call `useForm` once per logical form.** Calling it again creates a separate form instance. Pass the instance to children instead.
- **A layout with a detached footer/submit button is fully valid.** No redesign needed.

**Two implementation approaches:**

### Option A: Pass `form` as a prop, call `form.handleSubmit()` on click

```tsx
function MyPage() {
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => { /* ... */ },
  });

  return (
    <div className="layout">
      <div className="content">
        <FormFields form={form} />
      </div>
      <div className="footer">
        <FooterActions form={form} />
      </div>
    </div>
  );
}

function FooterActions({ form }) {
  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <button
          disabled={!canSubmit || isSubmitting}
          onClick={() => form.handleSubmit()}
        >
          Submit
        </button>
      )}
    </form.Subscribe>
  );
}
```

### Option B: HTML `form` attribute for native semantics (enter-to-submit, etc.)

```tsx
<form id="my-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
  <FormFields form={form} />
</form>

{/* Anywhere in the DOM */}
<button type="submit" form="my-form">Submit</button>
```

The `form="my-form"` attribute is native HTML and associates the button with the `<form>` element regardless of DOM nesting.

---

## 2. Validation with Zod — Full Setup

### 2.1 `useAppForm` + `createFormHook` (One-Time Setup)

Pre-configure the Zod adapter once so every form gets it automatically:

```tsx
// src/hooks/useAppForm.ts
import { createFormHookContexts, createFormHook } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

export const useAppForm = createFormHook({
  fieldContext,
  formContext,
  formOptions: {
    validatorAdapter: zodValidator(),
  },
});
```

### 2.2 Field-Level Zod Validation

Pass Zod schemas directly to individual field validators with timing control:

```tsx
<form.Field
  name="email"
  validators={{
    onChange: z.string().email('Invalid email'),   // every keystroke
    onBlur: z.string().min(1, 'Required'),         // on blur
    onSubmit: z.string().email(),                  // submit only
  }}
>
  {(field) => (
    <div>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.map((err, i) => (
        <p key={i} className="error">{err}</p>
      ))}
    </div>
  )}
</form.Field>
```

**UX pattern:** Validate `onBlur` first (don't yell mid-typing), then switch to `onChange` after first error so users see it clear in real time.

### 2.3 Form-Level Zod Validation (Whole Schema)

Validate the entire form shape at once. Errors distribute to individual fields automatically:

```tsx
const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18),
});

const form = useAppForm({
  defaultValues: { name: '', email: '', age: 0 },
  validators: {
    onChange: formSchema,
  },
  onSubmit: async ({ value }) => { /* ... */ },
});
```

---

## 3. Cross-Field Validation

### Approach A: `onChangeListenTo` + Callback Validator (Field-Level)

A field listens to other fields and re-validates when they change. Requires a **callback** (not Zod schema) because you need access to other field values:

```tsx
<form.Field
  name="confirmPassword"
  validators={{
    onChangeListenTo: ['password'],
    onChange: ({ value, fieldApi }) => {
      const password = fieldApi.form.getFieldValue('password');
      if (value !== password) return 'Passwords do not match';
      return undefined;
    },
  }}
>
  {(field) => ( /* ... */ )}
</form.Field>
```

### Approach B: Zod `.refine()` at Form Level (Schema-Level)

Keep all validation in one exportable schema. Use `path` to route errors to specific fields:

```tsx
const formSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
```

### Tradeoffs: `.refine()` vs `onChangeListenTo`

| Dimension | `.refine()` (Form-Level) | `onChangeListenTo` (Field-Level) |
|---|---|---|
| **Co-location** | All validation in one schema — easy to read and export | Scattered across `<form.Field>` declarations |
| **Reusability** | Schema can be shared server-side (tRPC, API validation) | Tied to TanStack Form API, not portable |
| **Performance** | Runs against *entire* form values on every trigger — wasteful on large forms if set on `onChange` | Surgical — only fires when listened-to fields change |
| **Error routing** | Must manually specify `path` — typo = silent form-level error no field displays | Errors naturally attach to the declaring field |
| **Best for** | Shared schemas, smaller forms, submit-time validation | Real-time UX feedback, large forms, runtime-dependent logic |

**Recommended hybrid:** Use `.refine()` on `onSubmit` (runs once, no perf concern, single source of truth) + `onChangeListenTo` callbacks for real-time UX on specific interactions.

---

## 4. `withForm` — Decomposing Large Forms

HOC for breaking forms into typed sub-components while preserving full type safety:

```tsx
// src/components/PersonalInfoSection.tsx
import { withForm } from '@/hooks/useAppForm';

export const PersonalInfoSection = withForm({
  defaultValues: {
    name: '',
    email: '',
    age: 0,
    password: '',
    confirmPassword: '',
  },
  render: ({ form }) => (
    <div>
      <form.Field
        name="name"  // fully typed, autocompletes from defaultValues
        validators={{ onChange: z.string().min(1, 'Required') }}
      >
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
      {/* more fields */}
    </div>
  ),
});
```

**Usage in parent — wrap sub-components in `form.AppForm`:**

```tsx
function RegistrationForm() {
  const form = useAppForm({
    defaultValues: { name: '', email: '', age: 0, password: '', confirmPassword: '' },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => { /* ... */ },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.AppForm>
        <PersonalInfoSection />
        <PasswordSection />
      </form.AppForm>

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button disabled={!canSubmit || isSubmitting}>Register</button>
        )}
      </form.Subscribe>
    </form>
  );
}
```

`form.AppForm` is the context provider that connects `withForm` sub-components to the form instance without prop drilling.

---

## 5. Quick Decision Framework

| Need | Approach |
|---|---|
| Single field, simple rule | Zod schema on `validators.onChange` / `onBlur` |
| Whole form shape validation | Zod schema on `useAppForm({ validators: { onChange: schema } })` |
| Cross-field (e.g., confirm password) | `onChangeListenTo` + callback, OR `.refine()` at form level |
| Large form, multiple sections | `withForm` sub-components inside `form.AppForm` |
| Submit button outside form tree | Pass `form` as prop, use `form.Subscribe` + `form.handleSubmit()` |
| Shared schema (client + server) | Form-level Zod with `.refine()` on `onSubmit` |
| Real-time cross-field UX | `onChangeListenTo` + callback for responsiveness |
| Hybrid (recommended) | `.refine()` on `onSubmit` for source-of-truth + `onChangeListenTo` for real-time feedback |
