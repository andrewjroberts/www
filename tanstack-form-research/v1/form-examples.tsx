// =============================================================================
// form-examples.tsx — Complete Pattern Examples
// =============================================================================
//
// Three forms demonstrating every pattern:
//
//   1. UserProfileForm     — create/edit/clone, draft save, auto-save via
//                            listeners, prefill from URL, reset, nav blocking,
//                            required vs optional, Zod narrowing at submit
//
//   2. EventForm           — cross-field validation, reactive listeners,
//                            conditional fields, field-level overrides,
//                            form-level error display, debounced auto-save
//
//   3. EntityOnboardingForm — LEI API lookup with field listeners + debounce,
//                             prefill from external API, edit mode from server
// =============================================================================

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { useBlocker } from "react-router";
import { Stack, Group, Radio, Alert, Loader } from "@mantine/core";
import {
  FormTextInput,
  FormTextarea,
  FormPasswordInput,
  FormNumberInput,
  FormCheckbox,
  FormSwitch,
  FormSelect,
  FormMultiSelect,
  FormDateInput,
  FormDatePickerInputRange,
} from "./form-fields";
import { useAppForm, useDraft, DraftControls } from "./use-app-form";

// =============================================================================
//  EXAMPLE 1: User Profile
// =============================================================================
//
// Demonstrates:
//   ✓ Create / edit / clone modes via defaultValues
//   ✓ Manual draft save button
//   ✓ Auto-save via form listeners + debounce
//   ✓ Prefill from URL params (marks fields dirty)
//   ✓ Reset / discard
//   ✓ Navigation blocking on dirty state
//   ✓ Required vs optional fields
//   ✓ Form-level Zod validation (onBlur)
//   ✓ Zod narrowing at submit boundary
//   ✓ Looser draft schema (partial validation)
// =============================================================================

// ── Schemas ─────────────────────────────────────────────────────────────────

// Full validation — used for form-level onBlur + submit narrowing
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  bio: z.string(), // optional — no .min()
  country: z.string({ error: "Country is required" }), // rejects null
  referral: z.string().nullable(), // null is fine
  startDate: z.date({ error: "Start date is required" }), // rejects null
});

// Draft schema — only name required to save incomplete work
const profileDraftSchema = z.object({
  name: z.string().min(1, "Name required to save draft"),
});

type ProfileSubmission = z.infer<typeof profileSchema>;

// ── Form state type ─────────────────────────────────────────────────────────
// Dictated by what UI components emit, NOT by business rules.

type ProfileForm = {
  name: string; // TextInput → always string, "" when empty
  email: string; // same
  bio: string; // optional — "" is valid
  country: string | null; // Select → null when cleared
  referral: string | null; // same, but null is also valid
  startDate: Date | null; // DateInput → null when cleared
};

// ── API data (what the server returns for edit/clone) ───────────────────────

type ProfileData = {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  country: string | null;
  referral: string | null;
  startDate: string | null; // ISO string from API
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const emptyProfileDefaults: ProfileForm = {
  name: "",
  email: "",
  bio: "",
  country: null,
  referral: null,
  startDate: null,
};

function profileApiToForm(data: ProfileData): ProfileForm {
  return {
    name: data.name,
    email: data.email,
    bio: data.bio ?? "",
    country: data.country ?? null,
    referral: data.referral ?? null,
    startDate: data.startDate ? new Date(data.startDate) : null,
  };
}

// ── The form ────────────────────────────────────────────────────────────────

type ProfileFormProps = {
  mode: "create" | "edit" | "clone";
  initialData?: ProfileData;
};

export function UserProfileForm({ mode, initialData }: ProfileFormProps) {
  const defaults = initialData
    ? profileApiToForm(initialData)
    : emptyProfileDefaults;

  const { form, draft } = useAppForm<ProfileForm>({
    defaultValues: defaults,

    // Form-level Zod validation — errors auto-propagate to fields on blur
    validators: {
      onBlur: profileSchema,
    },

    // Auto-save via form listeners — fires on any field change, debounced
    listeners: {
      onChange: ({ formApi }) => {
        // Only auto-save if something has actually changed
        if (formApi.state.isDirty) {
          draft?.saveDraft();
        }
      },
      onChangeDebounceMs: 5000,
    },

    onSubmit: async ({ value }) => {
      // Zod narrows the type: string | null → string for required fields
      const payload: ProfileSubmission = profileSchema.parse(value);

      if (mode === "edit" && initialData) {
        console.log("PUT /profiles/" + initialData.id, payload);
      } else {
        // create + clone both POST — clone is just create with prefilled data
        console.log("POST /profiles", payload);
      }
    },

    // Draft config
    draft: {
      onSaveDraft: async (values) => {
        const key = initialData?.id ?? "new-profile";
        console.log("Draft saved:", key, values);
        // await api.saveDraft("profile", key, values)
      },
      draftSchema: profileDraftSchema,
    },
  });

  // Prefill from URL params — additive, marks fields dirty
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const email = params.get("email");
    const country = params.get("country");

    if (name) form.setFieldValue("name", name);
    if (email) form.setFieldValue("email", email);
    if (country) form.setFieldValue("country", country);
  }, []);

  // Block navigation on unsaved changes
  const blocker = useBlocker(() => form.state.isDirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      const leave = window.confirm("You have unsaved changes. Leave?");
      if (leave) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker.state]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Stack gap="md">
        {/* ── Required string ──────────────────────────────────
             Form-level schema: z.string().min(1)
             No field-level validator needed.
             `required` prop = visual red asterisk only.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="name"
          children={(field) => (
            <FormTextInput field={field} label="Name" required />
          )}
        />

        {/* ── Required string with format ──────────────────────
             Form-level schema: z.string().email()
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="email"
          children={(field) => (
            <FormTextInput field={field} label="Email" required />
          )}
        />

        {/* ── Optional string ──────────────────────────────────
             Schema: z.string() — empty string passes.
             No `required` prop — no red asterisk.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="bio"
          children={(field) => (
            <FormTextarea
              field={field}
              label="Bio"
              placeholder="Tell us about yourself (optional)"
            />
          )}
        />

        {/* ── Required nullable ────────────────────────────────
             Select ALWAYS emits string | null. Field type must be
             string | null. Schema rejects null → error on blur.
             Zod narrows to string at submit.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="country"
          children={(field) => (
            <FormSelect
              field={field}
              label="Country"
              required
              clearable
              data={["United States", "United Kingdom", "Canada", "Germany"]}
            />
          )}
        />

        {/* ── Optional nullable ────────────────────────────────
             Schema: z.string().nullable() — null passes fine.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="referral"
          children={(field) => (
            <FormSelect
              field={field}
              label="How did you hear about us?"
              clearable
              data={["Google", "Friend", "Twitter", "Other"]}
            />
          )}
        />

        {/* ── Required date ────────────────────────────────────
             DateInput emits Date | null. Schema rejects null.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="startDate"
          children={(field) => (
            <FormDateInput field={field} label="Start Date" required />
          )}
        />

        {/* ── Controls ─────────────────────────────────────────
             DraftControls renders: Save Draft / status / Discard / Submit
        ──────────────────────────────────────────────────────── */}
        {draft && (
          <DraftControls
            draft={draft}
            form={form}
            submitLabel={mode === "edit" ? "Save" : "Create"}
          />
        )}
      </Stack>
    </form>
  );
}

// =============================================================================
//  EXAMPLE 2: Event Form
// =============================================================================
//
// Demonstrates:
//   ✓ Cross-field validation (confirmPassword matches password)
//   ✓ Reactive listeners (re-validate field B when field A changes)
//   ✓ Conditional field rendering (approverEmail shown when checkbox checked)
//   ✓ Field-level validator overrides form-level
//   ✓ Suppress form-level for a specific field (onChange: () => undefined)
//   ✓ Form-level error display (errors not tied to a specific field)
//   ✓ Debounced auto-save via form listeners
// =============================================================================

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  maxAttendees: z.union([z.number().min(1, "At least 1"), z.literal("")]),
  dateRange: z.tuple([
    z.date({ error: "Start date required" }),
    z.date({ error: "End date required" }),
  ]),
  requiresApproval: z.boolean(),
  approverEmail: z.string().email("Invalid email").optional(),
  tags: z.array(z.string()),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
});

type EventForm = {
  title: string;
  description: string;
  maxAttendees: number | string;
  dateRange: [Date | null, Date | null];
  requiresApproval: boolean;
  approverEmail: string;
  tags: string[];
  password: string;
  confirmPassword: string;
};

export function EventFormExample() {
  const form = useForm<EventForm>({
    defaultValues: {
      title: "",
      description: "",
      maxAttendees: "",
      dateRange: [null, null],
      requiresApproval: false,
      approverEmail: "",
      tags: [],
      password: "",
      confirmPassword: "",
    },

    // Form-level Zod validation on blur
    validators: {
      onBlur: eventSchema,
    },

    // Auto-save draft on change, debounced 3s
    listeners: {
      onChange: ({ formApi }) => {
        if (formApi.state.isDirty) {
          console.log("Auto-saving draft:", formApi.state.values);
          // draft.saveDraft() or direct API call
        }
      },
      onChangeDebounceMs: 3000,
    },

    onSubmit: async ({ value }) => {
      console.log("Submitting event:", value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Stack gap="md">
        {/* ── Basic fields — form-level validation handles these ── */}

        <form.Field
          name="title"
          children={(field) => (
            <FormTextInput field={field} label="Event Title" required />
          )}
        />

        <form.Field
          name="description"
          children={(field) => (
            <FormTextarea field={field} label="Description" />
          )}
        />

        <form.Field
          name="maxAttendees"
          children={(field) => (
            <FormNumberInput field={field} label="Max Attendees" min={1} />
          )}
        />

        <form.Field
          name="tags"
          children={(field) => (
            <FormMultiSelect
              field={field}
              label="Tags"
              data={["Conference", "Workshop", "Meetup", "Webinar"]}
            />
          )}
        />

        {/* ── Date range + cross-field validation ──────────────
             Field-level validator checks end > start.
             This overrides form-level for this field.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="dateRange"
          validators={{
            onBlur: ({ value }) => {
              const [start, end] = value;
              if (start && end && end < start) {
                return "End date must be after start date";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <FormDatePickerInputRange
              field={field}
              label="Event Dates"
              required
            />
          )}
        />

        {/* ── Password with field-level override ───────────────
             Field-level onBlur overrides form-level onBlur
             for this specific field.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="password"
          validators={{
            onBlur: ({ value }) =>
              value.length > 0 && value.length < 8
                ? "At least 8 characters"
                : undefined,
          }}
          children={(field) => (
            <FormPasswordInput field={field} label="Event Password" />
          )}
        />

        {/* ── Cross-field: confirm must match password ─────────
             1. Suppress form-level onChange for this field
             2. Custom onBlur checks against sibling field
             3. Listener re-validates when password changes
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="confirmPassword"
          validators={{
            onChange: () => undefined, // suppress form-level for this field
            onBlur: ({ value, fieldApi }) => {
              const pw = fieldApi.form.getFieldValue("password");
              if (value && value !== pw) return "Passwords don't match";
              return undefined;
            },
          }}
          listeners={{
            onChangeListenTo: ["password"],
            onChange: ({ fieldApi }) => {
              fieldApi.validate("blur"); // re-validate when password changes
            },
          }}
          children={(field) => (
            <FormPasswordInput field={field} label="Confirm Password" />
          )}
        />

        {/* ── Conditional field ─────────────────────────────────
             form.Subscribe reactively shows/hides the field.
             The field always exists in state (as ""), but is only
             rendered and validated when the checkbox is checked.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="requiresApproval"
          children={(field) => (
            <FormCheckbox field={field} label="Requires approval" />
          )}
        />

        <form.Subscribe
          selector={(state) => state.values.requiresApproval}
          children={(requiresApproval) =>
            requiresApproval ? (
              <form.Field
                name="approverEmail"
                validators={{
                  onBlur: ({ value }) =>
                    !value.includes("@") ? "Valid email required" : undefined,
                }}
                children={(field) => (
                  <FormTextInput
                    field={field}
                    label="Approver Email"
                    required
                  />
                )}
              />
            ) : null
          }
        />

        {/* ── Form-level errors ─────────────────────────────────
             Errors returned by form-level validators that aren't
             tied to a specific field show up here.
        ──────────────────────────────────────────────────────── */}
        <form.Subscribe
          selector={(state) => state.errors}
          children={(errors) =>
            errors.length > 0 ? (
              <Alert color="red">{errors.join(", ")}</Alert>
            ) : null
          }
        />

        <Group justify="flex-end">
          <form.Subscribe
            selector={(state) => state.isDirty}
            children={(isDirty) =>
              isDirty ? (
                <Button variant="subtle" c="red" onClick={() => form.reset()}>
                  Discard
                </Button>
              ) : null
            }
          />
          <Button type="submit">Create Event</Button>
        </Group>
      </Stack>
    </form>
  );
}

// =============================================================================
//  EXAMPLE 3: Entity Onboarding (LEI Lookup)
// =============================================================================
//
// Demonstrates:
//   ✓ Field listeners for API lookup on value change
//   ✓ Built-in onChangeDebounceMs (no manual refs/timeouts)
//   ✓ Prefill multiple fields from external API (form.setFieldValue)
//   ✓ Loading state during async lookup
//   ✓ Prefilled fields remain editable (user can override)
//   ✓ Edit mode loading from server data
// =============================================================================

const onboardingSchema = z.object({
  lei: z.string().length(20, "LEI must be exactly 20 characters"),
  entityName: z.string().min(1, "Entity name is required"),
  jurisdiction: z.string(),
  legalAddress: z.string(),
  entityStatus: z.string({ error: "Status is required" }),
  notes: z.string(),
});

type OnboardingForm = {
  lei: string;
  entityName: string;
  jurisdiction: string;
  legalAddress: string;
  entityStatus: string | null;
  notes: string;
};

type EntityData = {
  id: string;
  lei: string;
  entityName: string;
  jurisdiction: string;
  legalAddress: string;
  entityStatus: string;
  notes: string;
};

const emptyOnboardingDefaults: OnboardingForm = {
  lei: "",
  entityName: "",
  jurisdiction: "",
  legalAddress: "",
  entityStatus: null,
  notes: "",
};

function entityApiToForm(data: EntityData): OnboardingForm {
  return {
    lei: data.lei,
    entityName: data.entityName,
    jurisdiction: data.jurisdiction,
    legalAddress: data.legalAddress,
    entityStatus: data.entityStatus,
    notes: data.notes,
  };
}

type OnboardingFormProps = {
  mode: "create" | "edit";
  initialData?: EntityData;
};

export function EntityOnboardingForm({
  mode,
  initialData,
}: OnboardingFormProps) {
  const defaults = initialData
    ? entityApiToForm(initialData)
    : emptyOnboardingDefaults;

  const { form, draft } = useAppForm<OnboardingForm>({
    defaultValues: defaults,
    validators: { onBlur: onboardingSchema },

    onSubmit: async ({ value }) => {
      const payload = onboardingSchema.parse(value);
      if (mode === "edit" && initialData) {
        console.log("PUT /entities/" + initialData.id, payload);
      } else {
        console.log("POST /entities", payload);
      }
    },

    draft: {
      onSaveDraft: async (values) => {
        console.log("Draft saved:", values);
      },
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Stack gap="md">
        {/* ── LEI field with API lookup ─────────────────────────
             When the user types a valid 20-char LEI, we fetch the
             GLEIF API and prefill the remaining fields.

             Key details:
               - listeners.onChange fires on every keystroke
               - onChangeDebounceMs: 500 debounces the API call
               - form.setFieldValue prefills other fields
               - Prefilled fields are dirty (correct for this flow)
               - User can still edit prefilled values
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="lei"
          validators={{
            onBlur: ({ value }) =>
              value && value.length !== 20
                ? "LEI must be 20 characters"
                : undefined,
          }}
          listeners={{
            onChange: async ({ value }) => {
              // Only look up when we have a complete LEI
              if (value.length !== 20) return;

              try {
                const res = await fetch(
                  `https://api.gleif.org/api/v1/lei-records/${value}`
                );
                if (!res.ok) return;

                const data = await res.json();
                const entity = data.data.attributes.entity;

                // Prefill the rest of the form
                form.setFieldValue(
                  "entityName",
                  entity.legalName?.name ?? ""
                );
                form.setFieldValue(
                  "jurisdiction",
                  entity.jurisdiction ?? ""
                );
                form.setFieldValue(
                  "legalAddress",
                  [
                    entity.legalAddress?.addressLines?.join(", "),
                    entity.legalAddress?.city,
                    entity.legalAddress?.country,
                  ]
                    .filter(Boolean)
                    .join(", ")
                );
                form.setFieldValue("entityStatus", entity.status ?? null);
              } catch {
                // Lookup failed — user fills manually, no error shown
              }
            },
            onChangeDebounceMs: 500,
          }}
          children={(field) => (
            <FormTextInput
              field={field}
              label="LEI"
              placeholder="e.g. 5493001KJTIIGC8Y1R12"
              maxLength={20}
              required
              description="Enter a 20-character LEI to auto-fill entity details"
            />
          )}
        />

        {/* ── Prefilled fields — still editable ────────────────
             These get populated by the LEI lookup above via
             form.setFieldValue. User can override any of them.
        ──────────────────────────────────────────────────────── */}
        <form.Field
          name="entityName"
          children={(field) => (
            <FormTextInput field={field} label="Entity Name" required />
          )}
        />

        <form.Field
          name="jurisdiction"
          children={(field) => (
            <FormTextInput field={field} label="Jurisdiction" />
          )}
        />

        <form.Field
          name="legalAddress"
          children={(field) => (
            <FormTextarea field={field} label="Legal Address" />
          )}
        />

        <form.Field
          name="entityStatus"
          children={(field) => (
            <FormSelect
              field={field}
              label="Entity Status"
              required
              data={["ACTIVE", "INACTIVE", "LAPSED", "RETIRED"]}
            />
          )}
        />

        <form.Field
          name="notes"
          children={(field) => (
            <FormTextarea
              field={field}
              label="Internal Notes"
              placeholder="Optional"
            />
          )}
        />

        {draft && (
          <DraftControls
            draft={draft}
            form={form}
            submitLabel={mode === "edit" ? "Update Entity" : "Create Entity"}
          />
        )}
      </Stack>
    </form>
  );
}
