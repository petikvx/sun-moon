import { describe, expect, it } from 'vitest';
import type { AstronomyForecast, WeatherData } from '../types';
import { darkDurationSeconds, mergeForecast, scoreForecast, scoreLabel } from './forecast';

const weather: WeatherData = {
  attribution: 'test',
  hours: Array.from({ length: 6 }, (_, index) => ({
    time: `2026-08-03T${String(index + 18).padStart(2, '0')}:00`,
    cloudCover: 10, visibility: 20_000, humidity: 45, temperature: 16,
    precipitationProbability: 5, windSpeed: 8,
  })),
};

const astronomy: AstronomyForecast = {
  timezone: 'Europe/Paris',
  days: [{
    date: '2026-08-03',
    events: { sunrise: null, sunset: null, moonrise: null, moonset: null },
    light: {
      astronomical_dawn: '2026-08-03T03:00:00Z', nautical_dawn: null, civil_dawn: null,
      blue_hour_morning_start: null, blue_hour_morning_end: null, golden_hour_morning_start: null,
      golden_hour_morning_end: null, golden_hour_evening_start: null, golden_hour_evening_end: null,
      blue_hour_evening_start: null, blue_hour_evening_end: null, civil_dusk: null, nautical_dusk: null,
      astronomical_dusk: '2026-08-03T21:00:00Z', day_length_seconds: 50_000,
    },
    moon_details: { phase_name: 'Dernier quartier', phase_angle: 270, illumination_percent: 30, age_days: 22, next_phases: [] },
  }],
};

describe('observation forecast', () => {
  it('scores clear conditions above cloudy conditions', () => {
    const clear = scoreForecast(weather.hours, 10, 28_800);
    const cloudy = scoreForecast(weather.hours.map((hour) => ({ ...hour, cloudCover: 100 })), 90, 5_000);
    expect(clear).not.toBeNull(); expect(cloudy).not.toBeNull(); expect(clear!).toBeGreaterThan(cloudy!);
  });

  it('computes astronomical darkness and merges weather', () => {
    expect(darkDurationSeconds('2026-08-03T03:00:00Z', '2026-08-03T21:00:00Z')).toBe(21_600);
    const result = mergeForecast(astronomy, weather);
    expect(result).toHaveLength(1); expect(result[0].cloudCover).toBe(10); expect(result[0].score).toBeGreaterThan(50);
  });

  it('returns understandable score labels', () => {
    expect(scoreLabel(80)).toBe('Excellente nuit');
    expect(scoreLabel(null)).toBe('Météo indisponible');
  });
});
