// form-fields/slider.tsx

import {
  Slider,
  type SliderProps,
  RangeSlider,
  type RangeSliderProps,
  AngleSlider,
  type AngleSliderProps,
  Rating,
  type RatingProps,
} from "@mantine/core";
import { type Field } from "./types";

// ── Slider ───────────────────────────────────────────────────────────────────

type FormSliderProps = {
  field: Field<number>;
} & Omit<SliderProps, "value" | "onChange">;

export function FormSlider({ field, ...rest }: FormSliderProps) {
  return (
    <Slider value={field.state.value} onChange={field.handleChange} {...rest} />
  );
}

// ── RangeSlider ──────────────────────────────────────────────────────────────

type FormRangeSliderProps = {
  field: Field<[number, number]>;
} & Omit<RangeSliderProps, "value" | "onChange">;

export function FormRangeSlider({ field, ...rest }: FormRangeSliderProps) {
  return (
    <RangeSlider
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── AngleSlider ──────────────────────────────────────────────────────────────

type FormAngleSliderProps = {
  field: Field<number>;
} & Omit<AngleSliderProps, "value" | "onChange">;

export function FormAngleSlider({ field, ...rest }: FormAngleSliderProps) {
  return (
    <AngleSlider
      value={field.state.value}
      onChange={field.handleChange}
      {...rest}
    />
  );
}

// ── Rating ───────────────────────────────────────────────────────────────────

type FormRatingProps = {
  field: Field<number>;
} & Omit<RatingProps, "value" | "onChange">;

export function FormRating({ field, ...rest }: FormRatingProps) {
  return (
    <Rating value={field.state.value} onChange={field.handleChange} {...rest} />
  );
}
