import { Units } from '../types';

const FEET_IN_METER = 3.28084;

export function toMeters(value: number, units: Units) {
  return units === 'imperial' ? value / FEET_IN_METER : value;
}

export function toFeet(value: number, units: Units) {
  return units === 'metric' ? value * FEET_IN_METER : value;
}

export function squareValue(value: number, units: Units) {
  return units === 'imperial' ? value / (FEET_IN_METER * FEET_IN_METER) : value;
}

export function formatArea(value: number, units: Units) {
  const suffix = units === 'imperial' ? 'ft²' : 'm²';
  return `${Math.round(value).toLocaleString()} ${suffix}`;
}
