export interface Events {
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
}

export interface LightEvents {
  astronomical_dawn: string | null;
  nautical_dawn: string | null;
  civil_dawn: string | null;
  blue_hour_morning_start: string | null;
  blue_hour_morning_end: string | null;
  golden_hour_morning_start: string | null;
  golden_hour_morning_end: string | null;
  golden_hour_evening_start: string | null;
  golden_hour_evening_end: string | null;
  blue_hour_evening_start: string | null;
  blue_hour_evening_end: string | null;
  civil_dusk: string | null;
  nautical_dusk: string | null;
  astronomical_dusk: string | null;
  day_length_seconds: number | null;
}

export interface MoonPhaseEvent { name: string; time: string }

export interface MoonDetails {
  phase_name: string;
  phase_angle: number;
  illumination_percent: number;
  age_days: number;
  next_phases: MoonPhaseEvent[];
}

export interface BodyPosition {
  altitude: number;
  azimuth: number;
  direction: string;
  above_horizon: boolean;
  distance_km: number;
}

export interface PositionPoint {
  time: string;
  sun: BodyPosition;
  moon: BodyPosition;
}

export interface DayData {
  timezone: string;
  events: Events;
  light: LightEvents;
  moon_details: MoonDetails;
  positions: PositionPoint[];
}

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherHour {
  time: string;
  cloudCover: number;
  visibility: number;
  humidity: number;
  temperature: number;
}

export interface WeatherData {
  hours: WeatherHour[];
  attribution: string;
}
