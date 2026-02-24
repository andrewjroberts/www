// =============================================================================
// app-fields/entity-search-field.tsx — Single async search combobox
// =============================================================================
//
// Two components:
//
//   EntitySearchField          — search only, picks existing entities
//   CreatableEntitySearchField — search + create inline
//
// Creatable supports two storage modes:
//
//   "name" (Option A): field stores the display name directly.
//     Picking "Acme Corp" → field.state.value = "Acme Corp"
//     Creating "NewCo"    → field.state.value = "NewCo"
//     No cache, no getLabel, no loader needed. Best for freeform suggestions.
//
//   "id" (Option B): field stores entity ID or __new:Name sentinel.
//     Picking "Acme Corp" → field.state.value = "c42"
//     Creating "NewCo"    → field.state.value = "__new:NewCo"
//     Uses getLabel (handles __new: prefix). Best for first-class entities.
// =============================================================================

import {
  Combobox,
  InputBase,
  Input,
  ScrollArea,
  Loader,
  CloseButton,
  Group,
  Avatar,
  Text,
  useCombobox,
} from "@mantine/core";
import type { ReactNode } from "react";
import { type Field, type ComboboxOption, firstError } from "@/form-fields/types";
import {
  type EntitySearchReturn,
  makeCreatedValue,
  useUserSearch,
  useAccountSearch,
  useCompanySearch,
} from "@/hooks/use-entity-search";

// =============================================================================
//  EntitySearchField — search only (unchanged)
// =============================================================================

type EntitySearchFieldProps = {
  field: Field<string | null>;
  searchHook: EntitySearchReturn;
  renderOption?: (option: ComboboxOption, selected: boolean) => ReactNode;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  maxDropdownHeight?: number;
  nothingFoundMessage?: string;
  searchPlaceholder?: string;
};

export function EntitySearchField({
  field,
  searchHook,
  renderOption,
  label,
  description,
  placeholder = "Search...",
  required,
  clearable = true,
  disabled,
  maxDropdownHeight = 250,
  nothingFoundMessage = "Nothing found",
  searchPlaceholder = "Type to search...",
}: EntitySearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading, getLabel } =
    searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  const displayLabel = getLabel(field.state.value);

  const optionElements = options.map((o) => {
    const selected = o.value === field.state.value;
    return (
      <Combobox.Option value={o.value} key={o.value} active={selected}>
        {renderOption ? (
          renderOption(o, selected)
        ) : (
          <div>
            <Text size="sm">{o.label}</Text>
            {o.description && (
              <Text size="xs" c="dimmed">{o.description}</Text>
            )}
          </div>
        )}
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        field.handleChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={label}
          description={description}
          required={required}
          disabled={disabled}
          component="button"
          type="button"
          pointer
          rightSection={
            isLoading ? (
              <Loader size={16} />
            ) : clearable && field.state.value ? (
              <CloseButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  field.handleChange(null);
                }}
              />
            ) : (
              <Combobox.Chevron />
            )
          }
          rightSectionPointerEvents={
            clearable && field.state.value ? "all" : "none"
          }
          onClick={() => combobox.toggleDropdown()}
          onBlur={field.handleBlur}
          error={firstError(field.state.meta)}
        >
          {displayLabel || (
            <Input.Placeholder>{placeholder}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.updateSelectedOptionIndex();
          }}
          placeholder={searchPlaceholder}
          rightSection={isLoading ? <Loader size={16} /> : null}
        />
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
//  CreatableEntitySearchField — search + create inline
// =============================================================================
//
// storeMode controls what gets stored in the field:
//
//   "name" — field stores the display name string.
//            Combobox.Option value = option.label (the name).
//            Create action stores the raw search text.
//            Display reads field.state.value directly.
//
//   "id"   — field stores entity ID or __new:Name sentinel.
//            Combobox.Option value = option.value (the ID).
//            Create action stores makeCreatedValue(search).
//            Display reads getLabel() which decodes __new: prefix.

const CREATE_SENTINEL = "$create";

type CreatableEntitySearchFieldProps = {
  field: Field<string | null>;
  searchHook: EntitySearchReturn;
  /**
   * "name" = store display name (Option A). No cache/loader needed.
   * "id"   = store entity ID or __new:Name sentinel (Option B).
   * Default: "name"
   */
  storeMode?: "name" | "id";
  /** Label for the create option. Receives current search text. */
  createLabel?: (search: string) => string;
  renderOption?: (option: ComboboxOption, selected: boolean) => ReactNode;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  maxDropdownHeight?: number;
  nothingFoundMessage?: string;
  searchPlaceholder?: string;
};

export function CreatableEntitySearchField({
  field,
  searchHook,
  storeMode = "name",
  createLabel = (s) => `Create "${s}"`,
  renderOption,
  label,
  description,
  placeholder = "Search or create...",
  required,
  clearable = true,
  disabled,
  maxDropdownHeight = 250,
  nothingFoundMessage = "Nothing found",
  searchPlaceholder = "Type to search or create...",
}: CreatableEntitySearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading, getLabel } =
    searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  // ── Display value ─────────────────────────────────────────────────────
  //
  // "name" mode: field.state.value IS the display label.
  // "id" mode:   getLabel reads cache or decodes __new: prefix.

  const displayLabel =
    storeMode === "name"
      ? field.state.value ?? ""
      : getLabel(field.state.value);

  // ── Show create option when search doesn't exactly match any label ────

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === search.toLowerCase()
  );
  const showCreate =
    search.length > 0 && !isLoading && !exactMatch;

  // ── Option submit handler ─────────────────────────────────────────────

  const handleSubmit = (val: string) => {
    if (val === CREATE_SENTINEL) {
      // Create: store name or __new:Name depending on mode
      field.handleChange(
        storeMode === "name" ? search : makeCreatedValue(search)
      );
    } else {
      // Existing: val is label (name mode) or ID (id mode)
      field.handleChange(val);
    }
    combobox.closeDropdown();
  };

  // ── Option elements ───────────────────────────────────────────────────
  //
  // "name" mode: Combobox.Option value = o.label (pass name through)
  // "id" mode:   Combobox.Option value = o.value (pass ID through)

  const optionElements = options.map((o) => {
    const optionValue = storeMode === "name" ? o.label : o.value;
    const selected =
      storeMode === "name"
        ? o.label === field.state.value
        : o.value === field.state.value;
    return (
      <Combobox.Option value={optionValue} key={o.value} active={selected}>
        {renderOption ? (
          renderOption(o, selected)
        ) : (
          <div>
            <Text size="sm">{o.label}</Text>
            {o.description && (
              <Text size="xs" c="dimmed">{o.description}</Text>
            )}
          </div>
        )}
      </Combobox.Option>
    );
  });

  return (
    <Combobox store={combobox} onOptionSubmit={handleSubmit}>
      <Combobox.Target>
        <InputBase
          label={label}
          description={description}
          required={required}
          disabled={disabled}
          component="button"
          type="button"
          pointer
          rightSection={
            isLoading ? (
              <Loader size={16} />
            ) : clearable && field.state.value ? (
              <CloseButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  field.handleChange(null);
                }}
              />
            ) : (
              <Combobox.Chevron />
            )
          }
          rightSectionPointerEvents={
            clearable && field.state.value ? "all" : "none"
          }
          onClick={() => combobox.toggleDropdown()}
          onBlur={field.handleBlur}
          error={firstError(field.state.meta)}
        >
          {displayLabel || (
            <Input.Placeholder>{placeholder}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            combobox.updateSelectedOptionIndex();
          }}
          placeholder={searchPlaceholder}
          rightSection={isLoading ? <Loader size={16} /> : null}
        />
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
//  Concrete: UserSearchField (search only)
// =============================================================================

type UserSearchFieldProps = {
  field: Field<string | null>;
  label?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

export function UserSearchField({
  field,
  label = "User",
  required,
  clearable = true,
  disabled,
}: UserSearchFieldProps) {
  const searchHook = useUserSearch();

  return (
    <EntitySearchField
      field={field}
      searchHook={searchHook}
      label={label}
      required={required}
      clearable={clearable}
      disabled={disabled}
      searchPlaceholder="Search users..."
      nothingFoundMessage="No users found"
      renderOption={(o) => (
        <Group gap="sm">
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
//  Concrete: AccountSearchField (search only)
// =============================================================================

type AccountSearchFieldProps = {
  field: Field<string | null>;
  label?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

export function AccountSearchField({
  field,
  label = "Account",
  required,
  clearable = true,
  disabled,
}: AccountSearchFieldProps) {
  const searchHook = useAccountSearch();

  return (
    <EntitySearchField
      field={field}
      searchHook={searchHook}
      label={label}
      required={required}
      clearable={clearable}
      disabled={disabled}
      searchPlaceholder="Search accounts..."
      nothingFoundMessage="No accounts found"
    />
  );
}

// =============================================================================
//  Concrete: CompanySearchField (creatable, Option A — name string)
// =============================================================================
//
// Field<string | null>. Value IS the company name. No ID, no cache, no loader.
// Schema: z.string().min(1, "Company is required")

type CompanyNameSearchFieldProps = {
  field: Field<string | null>;
  label?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

export function CompanyNameSearchField({
  field,
  label = "Company",
  required,
  clearable = true,
  disabled,
}: CompanyNameSearchFieldProps) {
  const searchHook = useCompanySearch();

  return (
    <CreatableEntitySearchField
      field={field}
      searchHook={searchHook}
      storeMode="name"
      label={label}
      required={required}
      clearable={clearable}
      disabled={disabled}
      searchPlaceholder="Search or create company..."
      nothingFoundMessage="No companies found"
      createLabel={(s) => `Create "${s}"`}
    />
  );
}

// =============================================================================
//  Concrete: CompanyIdSearchField (creatable, Option B — ID + __new: sentinel)
// =============================================================================
//
// Field<string | null>. Value is entity ID ("c42") or "__new:NewCo".
// Loader seeds cache for existing IDs. __new: values decode inline.
//
// Schema:
//   z.string().transform(v =>
//     isCreatedValue(v)
//       ? { op: "create" as const, name: parseCreatedName(v) }
//       : { op: "link"   as const, id: v }
//   )

type CompanyIdSearchFieldProps = {
  field: Field<string | null>;
  label?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

export function CompanyIdSearchField({
  field,
  label = "Company",
  required,
  clearable = true,
  disabled,
}: CompanyIdSearchFieldProps) {
  const searchHook = useCompanySearch();

  return (
    <CreatableEntitySearchField
      field={field}
      searchHook={searchHook}
      storeMode="id"
      label={label}
      required={required}
      clearable={clearable}
      disabled={disabled}
      searchPlaceholder="Search or create company..."
      nothingFoundMessage="No companies found"
      createLabel={(s) => `Create "${s}"`}
    />
  );
}
