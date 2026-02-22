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
