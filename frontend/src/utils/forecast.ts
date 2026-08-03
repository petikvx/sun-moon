import type { AstronomyForecast, ObservationForecastDay, WeatherData, WeatherHour } from '../types';

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const roundedAverage = (values: number[]) => {
  const result = average(values);
  return result === null ? null : Math.round(result);
};

export function scoreForecast(hours: WeatherHour[], moonIllumination: number, darkSeconds: number | null): number | null {
  if (!hours.length) return null;
  const cloud = average(hours.map((hour) => hour.cloudCover)) ?? 100;
  const humidity = average(hours.map((hour) => hour.humidity)) ?? 100;
  const visibilityKm = (average(hours.map((hour) => hour.visibility)) ?? 0) / 1000;
  const precipitation = average(hours.map((hour) => hour.precipitationProbability ?? 0)) ?? 0;
  const darknessBonus = Math.min(10, ((darkSeconds ?? 0) / 3600) * 1.5);
  const score = 100 - cloud * 0.55 - humidity * 0.12 - precipitation * 0.12 - moonIllumination * 0.08 + Math.min(15, visibilityKm * 0.6) + darknessBonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function darkDurationSeconds(dawn: string | null, dusk: string | null): number | null {
  if (!dawn || !dusk) return null;
  const daylightTwilight = (new Date(dusk).getTime() - new Date(dawn).getTime()) / 1000;
  return Math.max(0, 86400 - daylightTwilight);
}

export function mergeForecast(astronomy: AstronomyForecast, weather: WeatherData | null): ObservationForecastDay[] {
  return astronomy.days.map((day) => {
    const nightHours = (weather?.hours ?? []).filter((hour) => {
      const [hourDate, time = '00:00'] = hour.time.split('T');
      const hourValue = Number(time.slice(0, 2));
      const following = new Date(`${day.date}T12:00:00Z`);
      following.setUTCDate(following.getUTCDate() + 1);
      const followingDate = following.toISOString().slice(0, 10);
      return (hourDate === day.date && hourValue >= 18) || (hourDate === followingDate && hourValue < 6);
    });
    const fallbackHours = (weather?.hours ?? []).filter((hour) => hour.time.startsWith(day.date));
    const hours = nightHours.length ? nightHours : fallbackHours;
    const darkSeconds = darkDurationSeconds(day.light.astronomical_dawn, day.light.astronomical_dusk);
    const temperatures = hours.map((hour) => hour.temperature);
    return {
      ...day,
      cloudCover: roundedAverage(hours.map((hour) => hour.cloudCover)),
      visibility: roundedAverage(hours.map((hour) => hour.visibility)),
      humidity: roundedAverage(hours.map((hour) => hour.humidity)),
      temperatureMin: temperatures.length ? Math.round(Math.min(...temperatures)) : null,
      temperatureMax: temperatures.length ? Math.round(Math.max(...temperatures)) : null,
      precipitationProbability: roundedAverage(hours.map((hour) => hour.precipitationProbability ?? 0)),
      windSpeed: roundedAverage(hours.map((hour) => hour.windSpeed ?? 0)),
      score: scoreForecast(hours, day.moon_details.illumination_percent, darkSeconds),
      darkSeconds,
    };
  });
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'Météo indisponible';
  if (score >= 75) return 'Excellente nuit';
  if (score >= 55) return 'Conditions favorables';
  if (score >= 35) return 'Conditions moyennes';
  return 'Observation difficile';
}
