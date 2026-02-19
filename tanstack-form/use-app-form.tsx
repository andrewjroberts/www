// =============================================================================
// use-app-form.tsx — useAppForm + useDraft + DraftControls
// =============================================================================
//
// Composable form + draft pattern:
//
//   const { form, draft } = useAppForm<MyForm>({
//     defaultValues: { ... },
//     validators: { onBlur: mySchema },
//     onSubmit: async ({ value }) => { ... },
//     draft: {
//       onSaveDraft: (values) => api.saveDraft(values),
//       draftSchema: looseSchema,       // optional partial validation
//     },
//   })
//
//   <form>
//     {/* ...fields... */}
//     <DraftControls draft={draft} form={form} />
//   </form>
//
// For auto-save, use TanStack's built-in form listeners instead of setInterval:
//
//   const form = useForm({
//     listeners: {
//       onChange: ({ formApi }) => draft.saveDraft(),
//       onChangeDebounceMs: 3000,
//     },
//   })
//
// =============================================================================

import { useState, useCallback, type ReactNode } from "react";
import {
  useForm,
  type FormApi,
  type FormOptions,
} from "@tanstack/react-form";
import { Button, Group, Text, type ButtonProps } from "@mantine/core";
import type { z } from "zod";

// =============================================================================
//  useDraft
// =============================================================================

type DraftStatus = "idle" | "saving" | "saved" | "error";

type DraftOptions<TFormData> = {
  /** Persist the draft — API, localStorage, IndexedDB, whatever. */
  onSaveDraft: (values: TFormData) => Promise<void>;

  /** Optional looser schema — blocks save if it fails. */
  draftSchema?: z.ZodType<any>;

  /** Reset dirty tracking after save? Default: true. */
  resetAfterSave?: boolean;
};

type DraftReturn<TFormData> = {
  status: DraftStatus;
  saveDraft: () => Promise<void>;
  lastSavedAt: Date | null;
};

export function useDraft<TFormData>(
  form: FormApi<TFormData, any>,
  opts: DraftOptions<TFormData>
): DraftReturn<TFormData> {
  const { onSaveDraft, draftSchema, resetAfterSave = true } = opts;

  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveDraft = useCallback(async () => {
    const raw = form.state.values;

    // Optional partial validation
    if (draftSchema) {
      const result = draftSchema.safeParse(raw);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const fieldName = issue.path[0] as string;
          form.setFieldMeta(fieldName as any, (prev) => ({
            ...prev,
            errors: [issue.message],
          }));
        });
        setStatus("error");
        return;
      }
    }

    setStatus("saving");
    try {
      await onSaveDraft(raw);
      setLastSavedAt(new Date());
      setStatus("saved");
      // New baseline for dirty tracking
      if (resetAfterSave) form.reset(raw);
    } catch {
      setStatus("error");
    }
  }, [form, onSaveDraft, draftSchema, resetAfterSave]);

  return { status, saveDraft, lastSavedAt };
}

// =============================================================================
//  DraftControls
// =============================================================================

type DraftControlsProps = {
  draft: DraftReturn<any>;
  form: FormApi<any, any>;
  submitLabel?: string;
  draftLabel?: string;
  showDiscard?: boolean;
  submitProps?: ButtonProps;
  children?: ReactNode;
};

export function DraftControls({
  draft,
  form,
  submitLabel = "Submit",
  draftLabel = "Save Draft",
  showDiscard = true,
  submitProps,
  children,
}: DraftControlsProps) {
  return (
    <Group justify="space-between">
      <Group>
        <Button
          variant="subtle"
          onClick={draft.saveDraft}
          loading={draft.status === "saving"}
        >
          {draftLabel}
        </Button>

        {draft.lastSavedAt && draft.status === "saved" && (
          <Text size="sm" c="dimmed">
            Saved {draft.lastSavedAt.toLocaleTimeString()}
          </Text>
        )}

        {draft.status === "error" && (
          <Text size="sm" c="red">
            Draft save failed
          </Text>
        )}
      </Group>

      <Group>
        {children}

        {showDiscard && (
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
        )}

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button type="submit" loading={isSubmitting} {...submitProps}>
              {submitLabel}
            </Button>
          )}
        />
      </Group>
    </Group>
  );
}

// =============================================================================
//  useAppForm — bundles useForm + useDraft
// =============================================================================

type AppFormOptions<TFormData> = FormOptions<TFormData> & {
  draft?: DraftOptions<TFormData>;
};

export function useAppForm<TFormData>(opts: AppFormOptions<TFormData>) {
  const { draft: draftOpts, ...formOpts } = opts;
  const form = useForm<TFormData>(formOpts);
  const draft = draftOpts ? useDraft(form, draftOpts) : null;

  return { form, draft };
}

// =============================================================================
//  Exports
// =============================================================================

export type {
  DraftStatus,
  DraftOptions,
  DraftReturn,
  DraftControlsProps,
  AppFormOptions,
};
