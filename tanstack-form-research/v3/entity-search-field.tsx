// =============================================================================
// app-fields/entity-search-field.tsx — Single async search combobox
// =============================================================================
//
// App-level component that wires a search hook into a Mantine Combobox.
// Brings its own data via useEntitySearch. Drop into any form.
//
// Value: string | null (entity ID or null)
//
// Usage:
//   <form.Field name="assigneeId">
//     {(field) => (
//       <UserSearchField field={field} label="Assignee" required />
//     )}
//   </form.Field>
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

// =============================================================================
//  Generic EntitySearchField
// =============================================================================
//
// Use this directly if you want to pass a search hook from outside.
// Or use the concrete wrappers below (UserSearchField, etc.) which
// bake in the specific hook.

type EntitySearchFieldProps = {
  field: Field<string | null>;
  /** From useEntitySearch() */
  searchHook: {
    search: string;
    setSearch: (value: string) => void;
    clearSearch: () => void;
    options: ComboboxOption[];
    isLoading: boolean;
    getLabel: (id: string | null) => string;
  };
  /** Custom option renderer */
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
              <Text size="xs" c="dimmed">
                {o.description}
              </Text>
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
//  Concrete: UserSearchField
// =============================================================================

import { useUserSearch } from "@/hooks/use-entity-search";

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
          <Avatar size="sm" radius="xl">
            {o.label.charAt(0)}
          </Avatar>
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
    />
  );
}

// =============================================================================
//  CreatableEntitySearchField — search + create new (value = label string)
// =============================================================================
//
// Like EntitySearchField but for fields where value = the display name itself,
// not an entity ID. Users can pick an existing option OR type a new value.
//
// When search returns no matches, a "+ Create '[search]'" option appears.
// Selecting it stores the raw search text as the field value.
//
// Because value = name, no getLabel cache lookup is needed — the form value
// renders directly. This makes clone/draft/edit-mode trivially simple.
//
// Usage:
//   <form.Field name="companyName">
//     {(field) => <CompanySearchField field={field} label="Company" required />}
//   </form.Field>

type CreatableEntitySearchFieldProps = {
  field: Field<string | null>;
  searchHook: {
    search: string;
    setSearch: (value: string) => void;
    clearSearch: () => void;
    options: ComboboxOption[];
    isLoading: boolean;
  };
  creatable?: boolean;
  createLabel?: (search: string) => string;
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
  creatable = true,
  createLabel = (s) => `Create "${s}"`,
  label,
  description,
  placeholder = "Select or create...",
  required,
  clearable = true,
  disabled,
  maxDropdownHeight = 250,
  nothingFoundMessage = "Nothing found",
  searchPlaceholder = "Type to search...",
}: CreatableEntitySearchFieldProps) {
  const { search, setSearch, clearSearch, options, isLoading } = searchHook;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      clearSearch();
    },
  });

  // Value IS the name — render it directly, no cache lookup needed.
  const displayValue = field.state.value;

  const showCreate =
    creatable && search.length > 0 && options.length === 0 && !isLoading;

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        if (val === "__create__") {
          field.handleChange(search);
        } else {
          // val = option.label (company name), not option.value (id)
          field.handleChange(val);
        }
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
          {displayValue || (
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
            {options.length > 0 ? (
              options.map((o) => (
                // Pass label as value so onOptionSubmit receives the name
                <Combobox.Option
                  value={o.label}
                  key={o.value}
                  active={o.label === field.state.value}
                >
                  <Text size="sm">{o.label}</Text>
                  {o.description && (
                    <Text size="xs" c="dimmed">
                      {o.description}
                    </Text>
                  )}
                </Combobox.Option>
              ))
            ) : showCreate ? (
              <Combobox.Option value="__create__">
                <Text size="sm" c="blue">
                  + {createLabel(search)}
                </Text>
              </Combobox.Option>
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
//  Concrete: CompanySearchField
// =============================================================================

import { useCompanySearch } from "@/hooks/use-entity-search";

type CompanySearchFieldProps = {
  field: Field<string | null>;
  label?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

export function CompanySearchField({
  field,
  label = "Company",
  required,
  clearable = true,
  disabled,
}: CompanySearchFieldProps) {
  const searchHook = useCompanySearch();

  return (
    <CreatableEntitySearchField
      field={field}
      searchHook={searchHook}
      label={label}
      required={required}
      clearable={clearable}
      disabled={disabled}
      placeholder="Select or type company name..."
      searchPlaceholder="Search or create company..."
      nothingFoundMessage="No companies found"
    />
  );
}

// =============================================================================
//  Concrete: AccountSearchField
// =============================================================================

import { useAccountSearch } from "@/hooks/use-entity-search";

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
