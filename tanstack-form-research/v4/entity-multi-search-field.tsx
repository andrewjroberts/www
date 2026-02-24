// =============================================================================
// app-fields/entity-multi-search-field.tsx — Multi async search combobox
// =============================================================================
//
// Two components:
//
//   EntityMultiSearchField          — search only, picks existing entities
//   CreatableEntityMultiSearchField — search + create inline
//
// Value: string[] (array of entity IDs or names depending on mode)
//
// Creatable supports the same two storage modes as the single variant:
//   "name" — stores display names: ["Acme Corp", "NewCo"]
//   "id"   — stores IDs + sentinels: ["c42", "__new:NewCo"]
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
  CheckIcon,
  useCombobox,
} from "@mantine/core";
import type { ReactNode } from "react";
import { type Field, type ComboboxOption, firstError } from "@/form-fields/types";
import {
  type EntitySearchReturn,
  useResolvedLabels,
  makeCreatedValue,
  isCreatedValue,
  parseCreatedName,
  useUserSearch,
  useAccountSearch,
  useCompanySearch,
} from "@/hooks/use-entity-search";

// =============================================================================
//  EntityMultiSearchField — search only (unchanged)
// =============================================================================

type EntityMultiSearchFieldProps = {
  field: Field<string[]>;
  /** Must match search hook's entityKey — used for label resolution */
  entityKey: string;
  searchHook: EntitySearchReturn;
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
};

export function EntityMultiSearchField({
  field,
  entityKey,
  searchHook,
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
}: EntityMultiSearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading } = searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  const selectedValues = field.state.value;

  const resolvedLabels = useResolvedLabels(entityKey, selectedValues);

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

  const pills = resolvedLabels.map(({ id, label: pillLabel }) => (
    <Pill key={id} withRemoveButton onRemove={() => handleRemove(id)}>
      {pillLabel}
    </Pill>
  ));

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
                <Text size="xs" c="dimmed">{o.description}</Text>
              )}
            </div>
          </Group>
        )}
      </Combobox.Option>
    );
  });

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
                placeholder={selectedValues.length === 0 ? placeholder : ""}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={maxDropdownHeight} type="scroll">
            {optionElements.length > 0 ? (
              optionElements
            ) : isLoading ? (
              <Combobox.Empty>Searching...</Combobox.Empty>
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
//  CreatableEntityMultiSearchField — search + create inline
// =============================================================================

const CREATE_SENTINEL = "$create";

type CreatableEntityMultiSearchFieldProps = {
  field: Field<string[]>;
  entityKey: string;
  searchHook: EntitySearchReturn;
  /**
   * "name" = store display names: ["Acme Corp", "NewCo"]
   * "id"   = store IDs + sentinels: ["c42", "__new:NewCo"]
   * Default: "name"
   */
  storeMode?: "name" | "id";
  createLabel?: (search: string) => string;
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
};

export function CreatableEntityMultiSearchField({
  field,
  entityKey,
  searchHook,
  storeMode = "name",
  createLabel = (s) => `Create "${s}"`,
  renderOption,
  label,
  description,
  placeholder = "Search or create...",
  required,
  disabled,
  maxDropdownHeight = 250,
  maxValues = 0,
  nothingFoundMessage = "Nothing found",
  searchPlaceholder = "Type to search or create...",
}: CreatableEntityMultiSearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading } = searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  const selectedValues = field.state.value;

  // ── Pill labels ───────────────────────────────────────────────────────
  //
  // "name" mode: values ARE labels, resolve directly.
  // "id" mode:   useResolvedLabels handles both real IDs and __new: sentinels.

  const resolvedLabels =
    storeMode === "name"
      ? selectedValues.map((v) => ({ id: v, label: v, isLoading: false }))
      : useResolvedLabels(entityKey, selectedValues);

  // ── Exact match check for create option ───────────────────────────────

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === search.toLowerCase()
  );

  // Also check if the exact name is already selected (prevent duplicate pills)
  const alreadySelected =
    storeMode === "name"
      ? selectedValues.some(
          (v) => v.toLowerCase() === search.toLowerCase()
        )
      : selectedValues.some(
          (v) =>
            isCreatedValue(v) &&
            parseCreatedName(v).toLowerCase() === search.toLowerCase()
        );

  const showCreate =
    search.length > 0 && !isLoading && !exactMatch && !alreadySelected;

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleSubmit = (val: string) => {
    let newValue: string;

    if (val === CREATE_SENTINEL) {
      newValue = storeMode === "name" ? search : makeCreatedValue(search);
    } else {
      newValue = val;
    }

    if (selectedValues.includes(newValue)) {
      field.handleChange(selectedValues.filter((v) => v !== newValue));
    } else {
      if (maxValues > 0 && selectedValues.length >= maxValues) return;
      field.handleChange([...selectedValues, newValue]);
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
    const optionValue = storeMode === "name" ? o.label : o.value;
    const selected =
      storeMode === "name"
        ? selectedValues.includes(o.label)
        : selectedValues.includes(o.value);
    return (
      <Combobox.Option value={optionValue} key={o.value} active={selected}>
        {renderOption ? (
          renderOption(o, selected)
        ) : (
          <Group gap="xs">
            {selected && <CheckIcon size={12} />}
            <div>
              <Text size="sm">{o.label}</Text>
              {o.description && (
                <Text size="xs" c="dimmed">{o.description}</Text>
              )}
            </div>
          </Group>
        )}
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleSubmit}
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
                placeholder={selectedValues.length === 0 ? placeholder : ""}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={maxDropdownHeight} type="scroll">
            {optionElements}

            {showCreate && (
              <Combobox.Option value={CREATE_SENTINEL}>
                <Text size="sm" c="blue" fw={500}>
                  + {createLabel(search)}
                </Text>
              </Combobox.Option>
            )}

            {optionElements.length === 0 &&
              !showCreate &&
              (isLoading ? (
                <Combobox.Empty>Searching...</Combobox.Empty>
              ) : search.length > 0 ? (
                <Combobox.Empty>{nothingFoundMessage}</Combobox.Empty>
              ) : (
                <Combobox.Empty>Type to search</Combobox.Empty>
              ))}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// =============================================================================
//  Concrete: UserMultiSearchField (search only)
// =============================================================================

type UserMultiSearchFieldProps = {
  field: Field<string[]>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  maxValues?: number;
};

export function UserMultiSearchField({
  field,
  label = "Users",
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
      required={required}
      disabled={disabled}
      maxValues={maxValues}
      searchPlaceholder="Search users..."
      nothingFoundMessage="No users found"
      renderOption={(o, selected) => (
        <Group gap="sm">
          {selected && <CheckIcon size={12} />}
          <Avatar size="sm" radius="xl">{o.label.charAt(0)}</Avatar>
          <div>
            <Text size="sm">{o.label}</Text>
            {o.description && (
              <Text size="xs" c="dimmed">{o.description}</Text>
            )}
          </div>
        </Group>
      )}
    />
  );
}

// =============================================================================
//  Concrete: AccountMultiSearchField (search only)
// =============================================================================

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

// =============================================================================
//  Concrete: TagMultiSearchField (creatable, Option A — name strings)
// =============================================================================
//
// Field<string[]>. Values are tag names: ["React", "TypeScript", "NewTag"].
// Schema: z.array(z.string()).min(1, "At least one tag")

type TagMultiSearchFieldProps = {
  field: Field<string[]>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  maxValues?: number;
};

export function TagMultiSearchField({
  field,
  label = "Tags",
  required,
  disabled,
  maxValues = 0,
}: TagMultiSearchFieldProps) {
  // Tags use the same search hook pattern — swap in your own
  const searchHook = useCompanySearch(); // Replace with useTagSearch()

  return (
    <CreatableEntityMultiSearchField
      field={field}
      entityKey="tags"
      searchHook={searchHook}
      storeMode="name"
      label={label}
      required={required}
      disabled={disabled}
      maxValues={maxValues}
      searchPlaceholder="Search or create tags..."
      nothingFoundMessage="No tags found"
      createLabel={(s) => `Create "${s}"`}
    />
  );
}
