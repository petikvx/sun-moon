from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from skyfield import almanac
from skyfield.api import load, wgs84


ephemeris = load(str(Path(__file__).with_name("de421.bsp")))
sun = ephemeris["sun"]
moon = ephemeris["moon"]
earth = ephemeris["earth"]
timescale = load.timescale()

DIRECTIONS = (
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO",
)

MOON_PHASE_NAMES = (
    "Nouvelle lune",
    "Premier croissant",
    "Premier quartier",
    "Lune gibbeuse croissante",
    "Pleine lune",
    "Lune gibbeuse décroissante",
    "Dernier quartier",
    "Dernier croissant",
)

MAJOR_PHASE_NAMES = (
    "Nouvelle lune",
    "Premier quartier",
    "Pleine lune",
    "Dernier quartier",
)

EPHEMERIS_END = datetime(2053, 10, 8, 23, 59, tzinfo=timezone.utc)


def _day_bounds(date: datetime, timezone_name: str):
    zone = ZoneInfo(timezone_name)
    local_start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=zone)
    local_end = local_start + timedelta(days=1)
    utc_start = local_start.astimezone(timezone.utc)
    utc_end = local_end.astimezone(timezone.utc)
    return timescale.from_datetime(utc_start), timescale.from_datetime(utc_end), utc_start, utc_end


def _first_event(observer, body, t0, t1, finder):
    times, found = finder(observer, body, t0, t1)
    for event_time, is_real_event in zip(times, found):
        if is_real_event:
            return event_time.utc_iso()
    return None


def _sun_crossing(observer, t0, t1, altitude: float, rising: bool):
    finder = almanac.find_risings if rising else almanac.find_settings
    times, found = finder(observer, sun, t0, t1, horizon_degrees=altitude)
    for event_time, is_real_event in zip(times, found):
        if is_real_event:
            return event_time.utc_iso()
    return None


def get_astronomical_events(
    date: datetime,
    lat: float,
    lon: float,
    timezone_name: str = "UTC",
):
    t0, t1, _, _ = _day_bounds(date, timezone_name)
    observer = earth + wgs84.latlon(lat, lon)

    return {
        "sunrise": _first_event(observer, sun, t0, t1, almanac.find_risings),
        "sunset": _first_event(observer, sun, t0, t1, almanac.find_settings),
        "moonrise": _first_event(observer, moon, t0, t1, almanac.find_risings),
        "moonset": _first_event(observer, moon, t0, t1, almanac.find_settings),
    }


def get_light_events(
    date: datetime,
    lat: float,
    lon: float,
    timezone_name: str = "UTC",
):
    t0, t1, _, _ = _day_bounds(date, timezone_name)
    observer = earth + wgs84.latlon(lat, lon)
    rising = {
        altitude: _sun_crossing(observer, t0, t1, altitude, True)
        for altitude in (-18.0, -12.0, -6.0, -4.0, 6.0)
    }
    setting = {
        altitude: _sun_crossing(observer, t0, t1, altitude, False)
        for altitude in (-18.0, -12.0, -6.0, -4.0, 6.0)
    }
    events = get_astronomical_events(date, lat, lon, timezone_name)

    day_length_seconds = None
    if events["sunrise"] and events["sunset"]:
        sunrise = datetime.fromisoformat(events["sunrise"].replace("Z", "+00:00"))
        sunset = datetime.fromisoformat(events["sunset"].replace("Z", "+00:00"))
        if sunset >= sunrise:
            day_length_seconds = round((sunset - sunrise).total_seconds())

    return {
        "astronomical_dawn": rising[-18.0],
        "nautical_dawn": rising[-12.0],
        "civil_dawn": rising[-6.0],
        "blue_hour_morning_start": rising[-6.0],
        "blue_hour_morning_end": rising[-4.0],
        "golden_hour_morning_start": rising[-4.0],
        "golden_hour_morning_end": rising[6.0],
        "golden_hour_evening_start": setting[6.0],
        "golden_hour_evening_end": setting[-4.0],
        "blue_hour_evening_start": setting[-4.0],
        "blue_hour_evening_end": setting[-6.0],
        "civil_dusk": setting[-6.0],
        "nautical_dusk": setting[-12.0],
        "astronomical_dusk": setting[-18.0],
        "day_length_seconds": day_length_seconds,
    }


def get_moon_details(date: datetime, timezone_name: str = "UTC"):
    _, _, utc_start, utc_end = _day_bounds(date, timezone_name)
    midpoint = utc_start + (utc_end - utc_start) / 2
    moment = timescale.from_datetime(midpoint)
    phase_angle = float(almanac.moon_phase(ephemeris, moment).degrees)
    moon_position = earth.at(moment).observe(moon).apparent()
    illumination = float(moon_position.fraction_illuminated(sun)) * 100
    phase_index = int((phase_angle + 22.5) // 45) % 8

    search_end = min(midpoint + timedelta(days=40), EPHEMERIS_END)
    next_phases = []
    if search_end > midpoint:
        phase_times, phase_codes = almanac.find_discrete(
            moment,
            timescale.from_datetime(search_end),
            almanac.moon_phases(ephemeris),
        )
        next_phases = [
            {"name": MAJOR_PHASE_NAMES[int(code)], "time": phase_time.utc_iso()}
            for phase_time, code in zip(phase_times, phase_codes)
        ]

    return {
        "phase_name": MOON_PHASE_NAMES[phase_index],
        "phase_angle": round(phase_angle, 1),
        "illumination_percent": round(illumination, 1),
        "age_days": round((phase_angle / 360.0) * 29.530588, 1),
        "next_phases": next_phases,
    }


def _direction(azimuth: float) -> str:
    return DIRECTIONS[round(azimuth / 22.5) % len(DIRECTIONS)]


def _body_positions(observer, body, moments):
    apparent = observer.at(moments).observe(body).apparent()
    altitudes, azimuths, distances = apparent.altaz()
    positions = []
    for altitude, azimuth, distance in zip(
        altitudes.degrees,
        azimuths.degrees,
        distances.km,
    ):
        altitude_degrees = round(float(altitude), 1)
        azimuth_degrees = round(float(azimuth), 1)
        positions.append({
            "altitude": altitude_degrees,
            "azimuth": azimuth_degrees,
            "direction": _direction(azimuth_degrees),
            "above_horizon": altitude_degrees >= 0,
            "distance_km": round(float(distance)),
        })
    return positions


def get_daily_positions(
    date: datetime,
    lat: float,
    lon: float,
    timezone_name: str = "UTC",
):
    _, _, utc_start, utc_end = _day_bounds(date, timezone_name)
    observer = earth + wgs84.latlon(lat, lon)
    duration_steps = int((utc_end - utc_start).total_seconds() // 600)
    datetimes = [utc_start + timedelta(minutes=10 * step) for step in range(duration_steps + 1)]
    moments = timescale.from_datetimes(datetimes)
    sun_positions = _body_positions(observer, sun, moments)
    moon_positions = _body_positions(observer, moon, moments)

    return [
        {
            "time": moment.isoformat().replace("+00:00", "Z"),
            "sun": sun_position,
            "moon": moon_position,
        }
        for moment, sun_position, moon_position in zip(
            datetimes,
            sun_positions,
            moon_positions,
        )
    ]
