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
