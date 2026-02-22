// =============================================================================
// use-app-form.ts — TanStack createFormHook with registered field components
// =============================================================================
//
// TanStack Form's createFormHook lets you register field components once,
// then use them across all forms via a cleaner API:
//
//   BEFORE (render prop):
//     <form.Field name="email" children={(field) =>
//       <FormTextInput field={field} label="Email" required />
//     } />
//
//   AFTER (registered component):
//     <form.AppField name="email" component="TextInput" label="Email" required />
//
// Both are valid. The render prop gives full control. AppField is less
// boilerplate when you just need the standard wrapper.
//
// You can mix and match in the same form — use AppField for simple fields,
// drop to the render prop when you need listeners, validators, or custom logic.
// =============================================================================

import {
  createFormHookContexts,
  createFormHook,
} from "@tanstack/react-form";

// Import all field components
import { FormTextInput, FormTextarea, FormPasswordInput, FormJsonInput, FormPinInput } from "./form-fields/text";
import { FormNumberInput } from "./form-fields/number";
import { FormCheckbox, FormSwitch, FormChip } from "./form-fields/boolean";
import { FormSelect, FormMultiSelect, FormAutocomplete, FormTagsInput, FormNativeSelect } from "./form-fields/select";
import { FormRadioGroup, FormSegmentedControl } from "./form-fields/radio";
import { FormSlider, FormRangeSlider, FormAngleSlider, FormRating } from "./form-fields/slider";
import { FormColorInput, FormColorPicker } from "./form-fields/color";
import { FormFileInput, FormFileInputMultiple } from "./form-fields/file";
import {
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
} from "./form-fields/date";
import { FormTimeInput, FormTimePicker } from "./form-fields/time";

// Import form-level components (optional — things like DraftControls)
import { DraftControls } from "./use-draft";

// =============================================================================
//  1. Create shared context
// =============================================================================

const { fieldContext, formContext } = createFormHookContexts();

// =============================================================================
//  2. Register all field components
// =============================================================================
//
// The keys become the `component` prop on <form.AppField>.
// Register everything here once, use anywhere.

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,

  fieldComponents: {
    // Text
    TextInput: FormTextInput,
    Textarea: FormTextarea,
    PasswordInput: FormPasswordInput,
    JsonInput: FormJsonInput,
    PinInput: FormPinInput,

    // Number
    NumberInput: FormNumberInput,

    // Boolean
    Checkbox: FormCheckbox,
    Switch: FormSwitch,
    Chip: FormChip,

    // Select / Combobox
    Select: FormSelect,
    MultiSelect: FormMultiSelect,
    Autocomplete: FormAutocomplete,
    TagsInput: FormTagsInput,
    NativeSelect: FormNativeSelect,

    // Radio / Segmented
    RadioGroup: FormRadioGroup,
    SegmentedControl: FormSegmentedControl,

    // Slider / Rating
    Slider: FormSlider,
    RangeSlider: FormRangeSlider,
    AngleSlider: FormAngleSlider,
    Rating: FormRating,

    // Color
    ColorInput: FormColorInput,
    ColorPicker: FormColorPicker,

    // File
    FileInput: FormFileInput,
    FileInputMultiple: FormFileInputMultiple,

    // Date
    DateInput: FormDateInput,
    DatePickerInput: FormDatePickerInput,
    DatePickerInputMultiple: FormDatePickerInputMultiple,
    DatePickerInputRange: FormDatePickerInputRange,
    DateTimePicker: FormDateTimePicker,
    DatePicker: FormDatePicker,
    DatePickerMultiple: FormDatePickerMultiple,
    DatePickerRange: FormDatePickerRange,
    MonthPickerInput: FormMonthPickerInput,
    YearPickerInput: FormYearPickerInput,

    // Time
    TimeInput: FormTimeInput,
    TimePicker: FormTimePicker,
  },

  formComponents: {
    DraftControls,
  },
});

// =============================================================================
//  Usage example
// =============================================================================
//
//  import { useAppForm } from "./use-app-form"
//
//  function ProfileForm() {
//    const form = useAppForm({
//      defaultValues: {
//        name: "",
//        email: "",
//        country: null as string | null,
//        startDate: null as Date | null,
//        agreeToTerms: false,
//      },
//      onSubmit: async ({ value }) => { ... },
//    })
//
//    return (
//      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
//        {/* Registered components — clean one-liner */}
//        <form.AppField name="name" component="TextInput" label="Name" required />
//        <form.AppField name="email" component="TextInput" label="Email" required />
//        <form.AppField name="country" component="Select" label="Country"
//          data={["US", "UK", "CA"]} clearable required />
//        <form.AppField name="startDate" component="DateInput" label="Start Date" required />
//        <form.AppField name="agreeToTerms" component="Checkbox" label="I agree" />
//
//        {/* Drop to render prop when you need validators/listeners */}
//        <form.Field
//          name="email"
//          validators={{
//            onBlur: ({ value }) => !value.includes("@") ? "Invalid" : undefined,
//          }}
//          listeners={{
//            onChange: ({ value }) => console.log("email changed:", value),
//            onChangeDebounceMs: 500,
//          }}
//          children={(field) =>
//            <FormTextInput field={field} label="Email" required />
//          }
//        />
//
//        <Button type="submit">Submit</Button>
//      </form>
//    )
//  }
