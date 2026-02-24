// =============================================================================
// example-ticket-form.tsx — Full example: loader + form + all field types
// =============================================================================
//
// Shows the complete production pattern:
//   1. Loader prefetches domain data + resolves entity IDs via toOption mappers
//   2. Form uses typed defaults
//   3. Mix of low-level wrappers and app-fields
//   4. Zod narrows at submit
//   5. Creatable combobox for company (Option A: name string)
// =============================================================================

import { z } from "zod";
import { Stack, Button, Group, Alert, Checkbox } from "@mantine/core";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useAppForm } from "@/use-app-form";
import { AppForm } from "@/app-form";
import { FormTextInput, FormTextarea } from "@/form-fields/text";
import { FormSelect } from "@/form-fields/select";
import { FormCheckboxGroup } from "@/form-fields/checkbox-group";
import {
  CountrySelectField,
  TeamSelectField,
  UserSearchField,
  UserMultiSearchField,
  CompanyNameSearchField,
} from "@/app-fields";
import {
  countriesQueryOptions,
  teamsQueryOptions,
  enumToSelectData,
} from "@/hooks/use-domain-data";
import { userToOption } from "@/hooks/use-entity-search";

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

enum NotifyChannel {
  Email = "EMAIL",
  Slack = "SLACK",
  SMS = "SMS",
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

const NOTIFY_OPTIONS = enumToSelectData(NotifyChannel, {
  [NotifyChannel.Email]: "Email",
  [NotifyChannel.Slack]: "Slack",
  [NotifyChannel.SMS]: "SMS",
});

// =============================================================================
//  Schema
// =============================================================================

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().transform((v) => v || null),
  companyName: z.string().min(1, "Company is required"),
  priority: z.nativeEnum(Priority, { error: "Priority is required" }),
  status: z.nativeEnum(TicketStatus, { error: "Status is required" }),
  country: z.string().min(1, "Country is required"),
  teamId: z.string().min(1, "Team is required"),
  assigneeId: z.string({ error: "Assignee is required" }),
  reviewerIds: z.array(z.string()),
  notifyChannels: z.array(z.nativeEnum(NotifyChannel)),
});

type TicketSubmission = z.infer<typeof ticketSchema>;

// =============================================================================
//  Form state type
// =============================================================================

type TicketForm = {
  title: string;
  description: string;
  companyName: string | null;
  priority: string | null;
  status: string | null;
  country: string | null;
  teamId: string | null;
  assigneeId: string | null;
  reviewerIds: string[];
  notifyChannels: string[];
};

// =============================================================================
//  Defaults
// =============================================================================

type TicketApiData = {
  id: string;
  title: string;
  description: string | null;
  companyName: string;
  priority: Priority;
  status: TicketStatus;
  country: string;
  teamId: string;
  assigneeId: string;
  reviewerIds: string[];
  notifyChannels: NotifyChannel[];
};

const getTicketDefaults = (initial?: TicketApiData): TicketForm => ({
  title: initial?.title ?? "",
  description: initial?.description ?? "",
  companyName: initial?.companyName ?? null,
  priority: initial?.priority ?? null,
  status: initial?.status ?? TicketStatus.Open,
  country: initial?.country ?? null,
  teamId: initial?.teamId ?? null,
  assigneeId: initial?.assigneeId ?? null,
  reviewerIds: initial?.reviewerIds ?? [],
  notifyChannels: initial?.notifyChannels ?? [],
});

// =============================================================================
//  Loader
// =============================================================================

declare const queryClient: ReturnType<typeof useQueryClient>;

export async function loader({ params }: LoaderFunctionArgs) {
  const ticket = await api.getTicket(params.id!);

  const [_countries, _teams, assignee, reviewers] = await Promise.all([
    queryClient.ensureQueryData(countriesQueryOptions),
    queryClient.ensureQueryData(teamsQueryOptions),

    api.getUser(ticket.assigneeId).then((user) => {
      queryClient.setQueryData(["users", user.id], userToOption(user));
      return user;
    }),

    ticket.reviewerIds.length > 0
      ? api.getUsersByIds(ticket.reviewerIds).then((users) => {
          users.forEach((u) =>
            queryClient.setQueryData(["users", u.id], userToOption(u))
          );
          return users;
        })
      : Promise.resolve([]),

    // companyName: no loader step needed — it's stored as a name string (Option A)
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
      {/* ── Text fields ───────────────────────────────────────────────── */}

      <form.Field name="title">
        {(field) => <FormTextInput field={field} label="Title" required />}
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

      {/* ── Creatable company search (Option A — name string) ─────────── */}
      {/*    Value: "Acme Corp" | "NewCo" | null                          */}
      {/*    No loader step. No cache. Value IS the label.                */}

      <form.Field name="companyName">
        {(field) => (
          <CompanyNameSearchField field={field} label="Company" required />
        )}
      </form.Field>

      {/* ── Enum selects ──────────────────────────────────────────────── */}

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

      {/* ── Domain data selects ───────────────────────────────────────── */}

      <Group grow>
        <form.Field name="country">
          {(field) => <CountrySelectField field={field} required />}
        </form.Field>

        <form.Field name="teamId">
          {(field) => <TeamSelectField field={field} label="Team" required />}
        </form.Field>
      </Group>

      {/* ── Async search — single ─────────────────────────────────────── */}

      <form.Field name="assigneeId">
        {(field) => (
          <UserSearchField field={field} label="Assignee" required />
        )}
      </form.Field>

      {/* ── Async search — multi ──────────────────────────────────────── */}

      <form.Field name="reviewerIds">
        {(field) => (
          <UserMultiSearchField
            field={field}
            label="Reviewers"
            maxValues={5}
          />
        )}
      </form.Field>

      {/* ── CheckboxGroup — enum multi ────────────────────────────────── */}

      <form.Field name="notifyChannels">
        {(field) => (
          <FormCheckboxGroup field={field} label="Notify via">
            <Group mt="xs">
              {NOTIFY_OPTIONS.map((o) => (
                <Checkbox key={o.value} value={o.value} label={o.label} />
              ))}
            </Group>
          </FormCheckboxGroup>
        )}
      </form.Field>

      {/* ── Form-level errors ─────────────────────────────────────────── */}

      <form.Subscribe selector={(state) => state.errors}>
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
//  Option B example — for reference (not used in this form)
// =============================================================================
//
// If company were a first-class entity with IDs:
//
//   import { CompanyIdSearchField } from "@/app-fields"
//   import { isCreatedValue, parseCreatedName, companyToOption } from "@/hooks/use-entity-search"
//
//   // Form state: companyId: string | null (ID or "__new:NewCo")
//
//   // Loader seeds cache for existing company:
//   const company = await api.getCompany(ticket.companyId)
//   queryClient.setQueryData(["companies", company.id], companyToOption(company))
//
//   // Schema transforms at submit:
//   companyId: z.string().transform(v =>
//     isCreatedValue(v)
//       ? { op: "create" as const, name: parseCreatedName(v) }
//       : { op: "link"   as const, id: v }
//   )
//
//   // Field:
//   <form.Field name="companyId">
//     {(field) => <CompanyIdSearchField field={field} label="Company" required />}
//   </form.Field>

// =============================================================================
//  Placeholder API
// =============================================================================

type User = { id: string; name: string; email: string; department: string };

const api = {
  getTicket: async (_id: string): Promise<TicketApiData> => {
    throw new Error("Replace with real API call");
  },
  getUser: async (_id: string): Promise<User> => {
    throw new Error("Replace with real API call");
  },
  getUsersByIds: async (_ids: string[]): Promise<User[]> => {
    throw new Error("Replace with real API call");
  },
};
