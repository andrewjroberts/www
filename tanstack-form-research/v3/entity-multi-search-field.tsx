// =============================================================================
// app-fields/entity-multi-search-field.tsx — Multi async search combobox
// =============================================================================
//
// Same search hook as single, but with pills, toggle selection, backspace
// remove, and reactive label resolution via useQueries.
//
// Value: string[] (array of entity IDs)
//
// Usage:
//   <form.Field name="assigneeIds">
//     {(field) => (
//       <UserMultiSearchField field={field} label="Assignees" required />
//     )}
//   </form.Field>
//
// Labels for pre-selected IDs are resolved from Query cache.
// The loader should seed the cache before mount:
//
//   // In loader:
//   assignees.forEach(a => queryClient.setQueryData(["users", a.id], a))
//
// If a cache miss happens, useResolvedLabels falls back to individual fetch.
// =============================================================================

import {
  Combobox,
  Pill,
  PillsInput,
  ScrollArea,
  Loader,
  Group,
  Avatar,
  Text,
  Skeleton,
  Stack,
  CheckIcon,
  useCombobox,
} from "@mantine/core";
import type { ReactNode } from "react";
import { type Field, type ComboboxOption, firstError } from "@/form-fields/types";
import { useResolvedLabels } from "@/hooks/use-entity-search";

// =============================================================================
//  Generic EntityMultiSearchField
// =============================================================================

type EntityMultiSearchFieldProps = {
  field: Field<string[]>;
  /** Entity key for label resolution (must match search hook's entityKey) */
  entityKey: string;
  /** From useEntitySearch() */
  searchHook: {
    search: string;
    setSearch: (value: string) => void;
    clearSearch: () => void;
    options: ComboboxOption[];
    isLoading: boolean;
  };
  /** Optional: individual fetch for cache misses */
  fetchById?: (id: string) => Promise<{ id: string; name: string }>;
  renderOption?: (option: ComboboxOption, selected: boolean) => ReactNode;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxDropdownHeight?: number;
  maxValues?: number;
  nothingFoundMessage?: string;
  searchPlaceholder?: string;
  /** Wrap all results in a Combobox.Group with this label (e.g. "SEARCH RESULTS") */
  groupLabel?: string;
  /** Hint text shown above results when options are present */
  hint?: string;
  /** Custom loading state — defaults to <Combobox.Empty>Searching...</Combobox.Empty> */
  loadingElement?: ReactNode;
  /** Icon or element shown in the left section of the trigger */
  leftSection?: ReactNode;
  leftSectionWidth?: number;
};

export function EntityMultiSearchField({
  field,
  entityKey,
  searchHook,
  fetchById,
  renderOption,
  label,
  description,
  placeholder = "Search...",
  required,
  disabled,
  maxDropdownHeight = 250,
  maxValues = 0,
  nothingFoundMessage = "Nothing found",
  searchPlaceholder = "Type to search...",
  groupLabel,
  hint,
  loadingElement,
  leftSection,
  leftSectionWidth,
}: EntityMultiSearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading } = searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  const selectedValues = field.state.value;

  // Reactive label resolution — re-renders when cache populates.
  // If loader seeded the cache, fetchFn never fires.
  const resolvedLabels = useResolvedLabels({
    entityKey,
    ids: selectedValues,
    fetchFn: fetchById,
  });

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSelect = (val: string) => {
    if (selectedValues.includes(val)) {
      field.handleChange(selectedValues.filter((v) => v !== val));
    } else {
      if (maxValues > 0 && selectedValues.length >= maxValues) return;
      field.handleChange([...selectedValues, val]);
    }
    setSearch("");
  };

  const handleRemove = (val: string) => {
    field.handleChange(selectedValues.filter((v) => v !== val));
  };

  // ── Pills ─────────────────────────────────────────────────────────────

  const pills = resolvedLabels.map(({ id, label: pillLabel }) => (
    <Pill key={id} withRemoveButton onRemove={() => handleRemove(id)}>
      {pillLabel}
    </Pill>
  ));

  // ── Options ───────────────────────────────────────────────────────────

  const optionElements = options.map((o) => {
    const selected = selectedValues.includes(o.value);
    return (
      <Combobox.Option value={o.value} key={o.value} active={selected}>
        {renderOption ? (
          renderOption(o, selected)
        ) : (
          <Group gap="xs">
            {selected && <CheckIcon size={12} />}
            <div>
              <Text size="sm">{o.label}</Text>
              {o.description && (
                <Text size="xs" c="dimmed">
                  {o.description}
                </Text>
              )}
            </div>
          </Group>
        )}
      </Combobox.Option>
    );
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleSelect}
      withinPortal={false}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={label}
          description={description}
          required={required}
          disabled={disabled}
          onClick={() => combobox.openDropdown()}
          onBlur={field.handleBlur}
          error={firstError(field.state.meta)}
          leftSection={leftSection}
          leftSectionWidth={leftSectionWidth}
          rightSection={
            isLoading ? <Loader size={16} /> : <Combobox.Chevron />
          }
          rightSectionPointerEvents="none"
        >
          <Pill.Group>
            {pills}
            <Combobox.EventsTarget>
              <PillsInput.Field
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  combobox.updateSelectedOptionIndex();
                  combobox.openDropdown();
                }}
                onFocus={() => combobox.openDropdown()}
                onKeyDown={(e) => {
                  if (
                    e.key === "Backspace" &&
                    search === "" &&
                    selectedValues.length > 0
                  ) {
                    handleRemove(selectedValues[selectedValues.length - 1]);
                  }
                }}
                placeholder={
                  selectedValues.length === 0 ? placeholder : ""
                }
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={maxDropdownHeight} type="scroll">
            {optionElements.length > 0 ? (
              <>
                {hint && (
                  <Text size="xs" c="dimmed" px="sm" py={4}>
                    {hint}
                  </Text>
                )}
                {groupLabel ? (
                  <Combobox.Group label={groupLabel}>
                    {optionElements}
                  </Combobox.Group>
                ) : (
                  optionElements
                )}
              </>
            ) : isLoading ? (
              loadingElement ?? <Combobox.Empty>Searching...</Combobox.Empty>
            ) : search.length > 0 ? (
              <Combobox.Empty>{nothingFoundMessage}</Combobox.Empty>
            ) : (
              <Combobox.Empty>Type to search</Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// =============================================================================
//  Concrete: UserMultiSearchField
// =============================================================================

import { useUserSearch } from "@/hooks/use-entity-search";
// In your app: import { RiSearchLine } from "@remixicon/react"

const MAX_DISPLAYED_USERS = 15;

const userSkeletons = (
  <Stack gap={8} px="sm" py={4}>
    <Skeleton height={16} radius="sm" />
    <Skeleton height={16} radius="sm" />
    <Skeleton height={16} radius="sm" />
  </Stack>
);

type UserMultiSearchFieldProps = {
  field: Field<string[]>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  maxValues?: number;
};

export function UserMultiSearchField({
  field,
  label = "Users",
  description,
  required,
  disabled,
  maxValues = 0,
}: UserMultiSearchFieldProps) {
  const searchHook = useUserSearch();

  return (
    <EntityMultiSearchField
      field={field}
      entityKey="users"
      searchHook={searchHook}
      label={label}
      description={description}
      required={required}
      disabled={disabled}
      maxValues={maxValues}
      searchPlaceholder="Search users..."
      nothingFoundMessage="No users found"
      groupLabel="SEARCH RESULTS"
      hint={`Showing up to ${MAX_DISPLAYED_USERS} results. Refine your search to see more.`}
      loadingElement={userSkeletons}
      // leftSection={<RiSearchLine size={18} />}
      renderOption={(o, selected) => (
        <Group gap="sm">
          {selected && <CheckIcon size={12} />}
          <Avatar size="sm" radius="xl">
            {o.label.charAt(0)}
          </Avatar>
          <Text size="sm" fw={500}>
            {o.label}
          </Text>
          {o.description && (
            <Text size="xs" c="dimmed">
              {o.description}
            </Text>
          )}
        </Group>
      )}
    />
  );
}

// =============================================================================
//  Concrete: AccountMultiSearchField
// =============================================================================

import { useAccountSearch } from "@/hooks/use-entity-search";

type AccountMultiSearchFieldProps = {
  field: Field<string[]>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  maxValues?: number;
};

export function AccountMultiSearchField({
  field,
  label = "Accounts",
  required,
  disabled,
  maxValues = 0,
}: AccountMultiSearchFieldProps) {
  const searchHook = useAccountSearch();

  return (
    <EntityMultiSearchField
      field={field}
      entityKey="accounts"
      searchHook={searchHook}
      label={label}
      required={required}
      disabled={disabled}
      maxValues={maxValues}
      searchPlaceholder="Search accounts..."
      nothingFoundMessage="No accounts found"
    />
  );
}
