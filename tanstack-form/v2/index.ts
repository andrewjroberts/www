// form-fields/index.ts — Barrel export
//
// Import everything from one place:
//   import { FormTextInput, FormSelect, FormDateInput } from "@/form-fields"
//
// Or import from specific files for smaller bundles:
//   import { FormTextInput } from "@/form-fields/text"

// Types
export { type Field, type FieldMeta, firstError } from "./types";

// Text
export { FormTextInput, FormTextarea, FormPasswordInput, FormJsonInput, FormPinInput } from "./text";

// Number
export { FormNumberInput } from "./number";

// Boolean
export { FormCheckbox, FormSwitch, FormChip } from "./boolean";

// Select / Combobox
export { FormSelect, FormMultiSelect, FormAutocomplete, FormTagsInput, FormNativeSelect } from "./select";

// Radio / Segmented
export { FormRadioGroup, FormSegmentedControl } from "./radio";

// Slider / Rating
export { FormSlider, FormRangeSlider, FormAngleSlider, FormRating } from "./slider";

// Color
export { FormColorInput, FormColorPicker } from "./color";

// File
export { FormFileInput, FormFileInputMultiple } from "./file";

// Date
export {
  FormDateInput,
  FormDatePickerInput,
  FormDatePickerInputMultiple,
  FormDatePickerInputRange,
  FormDateTimePicker,
  FormDatePicker,
  FormDatePickerMultiple,
  FormDatePickerRange,
  FormMonthPickerInput,
  FormYearPickerInput,
} from "./date";

// Time
export { FormTimeInput, FormTimePicker } from "./time";
