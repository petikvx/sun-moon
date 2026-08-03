import axios from 'axios';
import type { GeocodingResult, WeatherData } from '../types';

export async function searchLocations(name: string): Promise<GeocodingResult[]> {
  if (name.trim().length < 2) return [];
  const response = await axios.get<{ results?: GeocodingResult[] }>('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: name.trim(), count: 6, language: 'fr', format: 'json' },
  });
  return response.data.results ?? [];
}

interface ForecastResponse {
  timezone?: string;
  hourly?: {
    time: string[];
    cloud_cover: number[];
    visibility: number[];
    relative_humidity_2m: number[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
  };
}

export async function getWeather(lat: number, lon: number, date: string, timezone: string): Promise<WeatherData | null> {
  try {
    const response = await axios.get<ForecastResponse>('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'cloud_cover,visibility,relative_humidity_2m,temperature_2m,precipitation_probability,wind_speed_10m',
        timezone,
        start_date: date,
        end_date: date,
      },
    });
    const hourly = response.data.hourly;
    if (!hourly) return null;
    return {
      hours: hourly.time.map((time, index) => ({
        time,
        cloudCover: hourly.cloud_cover[index],
        visibility: hourly.visibility[index],
        humidity: hourly.relative_humidity_2m[index],
        temperature: hourly.temperature_2m[index],
        precipitationProbability: hourly.precipitation_probability?.[index],
        windSpeed: hourly.wind_speed_10m?.[index],
      })),
      attribution: 'Prévisions Open-Meteo',
    };
  } catch {
    return null;
  }
}

export async function getSevenDayWeather(lat: number, lon: number, timezone: string): Promise<WeatherData | null> {
  try {
    const response = await axios.get<ForecastResponse>('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'cloud_cover,visibility,relative_humidity_2m,temperature_2m,precipitation_probability,wind_speed_10m',
        timezone,
        forecast_days: 7,
      },
    });
    const hourly = response.data.hourly;
    if (!hourly) return null;
    return {
      hours: hourly.time.map((time, index) => ({
        time,
        cloudCover: hourly.cloud_cover[index],
        visibility: hourly.visibility[index],
        humidity: hourly.relative_humidity_2m[index],
        temperature: hourly.temperature_2m[index],
        precipitationProbability: hourly.precipitation_probability?.[index],
        windSpeed: hourly.wind_speed_10m?.[index],
      })),
      attribution: 'Prévisions Open-Meteo',
    };
  } catch {
    return null;
  }
}

export async function resolveTimezone(lat: number, lon: number): Promise<string> {
  const response = await axios.get<ForecastResponse>('https://api.open-meteo.com/v1/forecast', {
    params: { latitude: lat, longitude: lon, timezone: 'auto', forecast_days: 1 },
  });
  return response.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
