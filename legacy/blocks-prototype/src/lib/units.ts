export type Units = "metric" | "imperial";

export const METERS_TO_FEET = 3.28084;
export const SQUARE_METERS_TO_FEET = METERS_TO_FEET * METERS_TO_FEET;

export const LENGTH_LABEL: Record<Units, string> = {
  metric: "m",
  imperial: "ft",
};

export const AREA_LABEL: Record<Units, string> = {
  metric: "m\u00B2",
  imperial: "ft\u00B2",
};

export const toDisplayUnits = (valueInMeters: number, units: Units) =>
  units === "imperial" ? valueInMeters * METERS_TO_FEET : valueInMeters;

export const fromDisplayUnits = (value: number, units: Units) =>
  units === "imperial" ? value / METERS_TO_FEET : value;

export const toDisplayArea = (valueInSquareMeters: number, units: Units) =>
  units === "imperial" ? valueInSquareMeters * SQUARE_METERS_TO_FEET : valueInSquareMeters;
