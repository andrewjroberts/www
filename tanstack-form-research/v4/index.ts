// app-fields/index.ts — Barrel export

// Single search (search only)
export { EntitySearchField, UserSearchField, AccountSearchField } from "./entity-search-field";

// Single search (creatable)
export {
  CreatableEntitySearchField,
  CompanyNameSearchField,
  CompanyIdSearchField,
} from "./entity-search-field";

// Multi search (search only)
export { EntityMultiSearchField, UserMultiSearchField, AccountMultiSearchField } from "./entity-multi-search-field";

// Multi search (creatable)
export {
  CreatableEntityMultiSearchField,
  TagMultiSearchField,
} from "./entity-multi-search-field";

// Domain data selects
export { CountrySelectField, TeamSelectField, RoleSelectField } from "./select-fields";
