// =============================================================================
// example-ticket-form.tsx — Full example: loader + form + all field types
// =============================================================================
//
// Shows the complete production pattern:
//   1. Loader prefetches ref data + resolves entity IDs
//   2. Form uses typed defaults
//   3. Mix of AppFields (low-level) and app-fields (smart)
//   4. Zod narrows at submit
// =============================================================================

import { z } from "zod";
import {
  Stack,
  Button,
  Group,
  Alert,
} from "@mantine/core";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useAppForm } from "@/use-app-form";
import { AppForm } from "@/app-form";
import { FormTextInput, FormTextarea } from "@/form-fields/text";
import { FormSelect } from "@/form-fields/select";
import {
  CountrySelectField,
  TeamSelectField,
  UserSearchField,
  UserMultiSearchField,
} from "@/app-fields";
import {
  countriesQueryOptions,
  teamsQueryOptions,
  enumToSelectData,
} from "@/hooks/use-ref-data";

// =============================================================================
//  Enums
// =============================================================================

enum Priority {
  Low = "LOW",
  Medium = "MEDIUM",
  High = "HIGH",
  Critical = "CRITICAL",
}

enum TicketStatus {
  Open = "OPEN",
  InProgress = "IN_PROGRESS",
  Review = "REVIEW",
  Done = "DONE",
}

const PRIORITY_OPTIONS = enumToSelectData(Priority, {
  [Priority.Low]: "Low",
  [Priority.Medium]: "Medium",
  [Priority.High]: "High",
  [Priority.Critical]: "Critical",
});

const STATUS_OPTIONS = enumToSelectData(TicketStatus, {
  [TicketStatus.Open]: "Open",
  [TicketStatus.InProgress]: "In Progress",
  [TicketStatus.Review]: "In Review",
  [TicketStatus.Done]: "Done",
});

// =============================================================================
//  Schema — what the API receives
// =============================================================================

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().transform((v) => v || null),
  priority: z.nativeEnum(Priority, { error: "Priority is required" }),
  status: z.nativeEnum(TicketStatus, { error: "Status is required" }),
  country: z.string().min(1, "Country is required"),
  teamId: z.string().min(1, "Team is required"),
  assigneeId: z.string({ error: "Assignee is required" }),
  reviewerIds: z.array(z.string()),
});

type TicketSubmission = z.infer<typeof ticketSchema>;

// =============================================================================
//  Form state type — what components emit during editing
// =============================================================================

type TicketForm = {
  title: string;
  description: string;
  priority: string | null;
  status: string | null;
  country: string | null;
  teamId: string | null;
  assigneeId: string | null;
  reviewerIds: string[];
};

// =============================================================================
//  Defaults
// =============================================================================

type TicketApiData = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TicketStatus;
  country: string;
  teamId: string;
  assigneeId: string;
  reviewerIds: string[];
};

const getTicketDefaults = (initial?: TicketApiData): TicketForm => ({
  title: initial?.title ?? "",
  description: initial?.description ?? "",
  priority: initial?.priority ?? null,
  status: initial?.status ?? TicketStatus.Open,
  country: initial?.country ?? null,
  teamId: initial?.teamId ?? null,
  assigneeId: initial?.assigneeId ?? null,
  reviewerIds: initial?.reviewerIds ?? [],
});

// =============================================================================
//  Loader — prefetch ref data + resolve entity IDs into Query cache
// =============================================================================

// Shared queryClient — typically exported from a central module
declare const queryClient: ReturnType<typeof useQueryClient>;

export async function loader({ params }: LoaderFunctionArgs) {
  const ticket = await api.getTicket(params.id!);

  // Fire all in parallel — warms the Query cache
  const [_countries, _teams, assignee, reviewers] = await Promise.all([
    queryClient.ensureQueryData(countriesQueryOptions),
    queryClient.ensureQueryData(teamsQueryOptions),

    // Resolve single assignee → seed into cache
    api.getUser(ticket.assigneeId).then((user) => {
      queryClient.setQueryData(["users", user.id], user);
      return user;
    }),

    // Batch resolve reviewer IDs → seed each into cache
    ticket.reviewerIds.length > 0
      ? api.getUsersByIds(ticket.reviewerIds).then((users) => {
          users.forEach((u) =>
            queryClient.setQueryData(["users", u.id], u)
          );
          return users;
        })
      : Promise.resolve([]),
  ]);

  return { ticket };
}

// =============================================================================
//  Page component
// =============================================================================

type TicketFormPageProps = {
  mode: "create" | "edit";
};

export default function TicketFormPage({ mode }: TicketFormPageProps) {
  const loaderData = mode === "edit" ? useLoaderData<typeof loader>() : null;

  const form = useAppForm({
    defaultValues: getTicketDefaults(loaderData?.ticket),
    validators: { onBlur: ticketSchema },
    onSubmit: async ({ value }) => {
      const payload: TicketSubmission = ticketSchema.parse(value);

      if (mode === "edit" && loaderData?.ticket) {
        console.log("PUT /tickets/" + loaderData.ticket.id, payload);
      } else {
        console.log("POST /tickets", payload);
      }
    },
  });

  return (
    <AppForm form={form} maw={600}>
      {/* ── Text fields — low-level wrappers ──────────────────────────── */}

      <form.Field name="title">
        {(field) => (
          <FormTextInput field={field} label="Title" required />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormTextarea
            field={field}
            label="Description"
            placeholder="Optional details..."
            minRows={3}
            autosize
          />
        )}
      </form.Field>

      {/* ── Enum selects — low-level wrapper + hardcoded data ─────────── */}

      <Group grow>
        <form.Field name="priority">
          {(field) => (
            <FormSelect
              field={field}
              label="Priority"
              data={PRIORITY_OPTIONS}
              clearable
              required
            />
          )}
        </form.Field>

        <form.Field name="status">
          {(field) => (
            <FormSelect
              field={field}
              label="Status"
              data={STATUS_OPTIONS}
              required
            />
          )}
        </form.Field>
      </Group>

      {/* ── Ref data selects — app-level, bring own data ──────────────── */}

      <Group grow>
        <form.Field name="country">
          {(field) => (
            <CountrySelectField field={field} required />
          )}
        </form.Field>

        <form.Field name="teamId">
          {(field) => (
            <TeamSelectField field={field} label="Team" required />
          )}
        </form.Field>
      </Group>

      {/* ── Async search — single, app-level ──────────────────────────── */}

      <form.Field name="assigneeId">
        {(field) => (
          <UserSearchField field={field} label="Assignee" required />
        )}
      </form.Field>

      {/* ── Async search — multi, app-level ───────────────────────────── */}

      <form.Field name="reviewerIds">
        {(field) => (
          <UserMultiSearchField
            field={field}
            label="Reviewers"
            maxValues={5}
          />
        )}
      </form.Field>

      {/* ── Form-level errors ─────────────────────────────────────────── */}

      <form.Subscribe
        selector={(state) => state.errors}
      >
        {(errors) =>
          errors.length > 0 ? (
            <Alert color="red">{errors.join(", ")}</Alert>
          ) : null
        }
      </form.Subscribe>

      {/* ── Actions ───────────────────────────────────────────────────── */}

      <Group justify="flex-end">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" loading={isSubmitting}>
              {mode === "edit" ? "Save" : "Create"}
            </Button>
          )}
        </form.Subscribe>
      </Group>
    </AppForm>
  );
}

// =============================================================================
//  Placeholder API — replace with your actual API module
// =============================================================================

const api = {
  getTicket: async (id: string): Promise<TicketApiData> => {
    throw new Error("Replace with real API call");
  },
  getUser: async (id: string): Promise<{ id: string; name: string }> => {
    throw new Error("Replace with real API call");
  },
  getUsersByIds: async (
    ids: string[]
  ): Promise<Array<{ id: string; name: string }>> => {
    throw new Error("Replace with real API call");
  },
};
