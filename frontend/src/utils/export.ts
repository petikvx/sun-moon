import type { DayData } from '../types';

function download(content: BlobPart, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(data: DayData, date: string) {
  const rows = ['time,sun_altitude,sun_azimuth,sun_direction,moon_altitude,moon_azimuth,moon_direction'];
  data.positions.forEach((point) => rows.push([
    point.time, point.sun.altitude, point.sun.azimuth, point.sun.direction,
    point.moon.altitude, point.moon.azimuth, point.moon.direction,
  ].join(',')));
  download(rows.join('\n'), 'text/csv;charset=utf-8', `soleil-lune-${date}.csv`);
}

export function exportJson(data: DayData, date: string) {
  download(JSON.stringify(data, null, 2), 'application/json;charset=utf-8', `soleil-lune-${date}.json`);
}

const icsDate = (iso: string) => iso.replace(/[-:]/g, '').replace('.000', '');

export function exportIcs(data: DayData, date: string) {
  const entries = [
    ['Lever du soleil', data.events.sunrise], ['Coucher du soleil', data.events.sunset],
    ['Lever de la lune', data.events.moonrise], ['Coucher de la lune', data.events.moonset],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const events = entries.map(([summary, time], index) => [
    'BEGIN:VEVENT', `UID:${date}-${index}@soleil-lune`, `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(time)}`, `SUMMARY:${summary}`, 'DURATION:PT10M', 'END:VEVENT',
  ].join('\r\n'));
  download(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PetiK//Soleil & Lune//FR', ...events, 'END:VCALENDAR'].join('\r\n'), 'text/calendar;charset=utf-8', `ephemerides-${date}.ics`);
}

export function exportChartPng() {
  const svg = document.querySelector<SVGSVGElement>('#sky-chart');
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1560;
    canvas.height = 470;
    const context = canvas.getContext('2d');
    context?.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) download(blob, 'image/png', 'trajectoire-soleil-lune.png'); });
    URL.revokeObjectURL(url);
  };
  image.src = url;
}
