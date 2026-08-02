import type { City } from './types';

export const CITIES: City[] = [
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
  { id: 'lyon', name: 'Lyon', country: 'France', lat: 45.764, lon: 4.8357, timezone: 'Europe/Paris' },
  { id: 'marseille', name: 'Marseille', country: 'France', lat: 43.2965, lon: 5.3698, timezone: 'Europe/Paris' },
  { id: 'london', name: 'Londres', country: 'Royaume-Uni', lat: 51.5072, lon: -0.1276, timezone: 'Europe/London' },
  { id: 'montreal', name: 'Montréal', country: 'Canada', lat: 45.5019, lon: -73.5674, timezone: 'America/Toronto' },
  { id: 'new-york', name: 'New York', country: 'États-Unis', lat: 40.7128, lon: -74.006, timezone: 'America/New_York' },
  { id: 'cairo', name: 'Le Caire', country: 'Égypte', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
  { id: 'reunion', name: 'Saint-Denis', country: 'La Réunion', lat: -20.8789, lon: 55.4481, timezone: 'Indian/Reunion' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japon', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'Australie', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
];

export const MIN_DATE = '1899-07-29';
export const MAX_DATE = '2053-10-08';
