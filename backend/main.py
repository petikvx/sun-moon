from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    from .calculator import (
        get_astronomical_events,
        get_daily_positions,
        get_light_events,
        get_moon_details,
    )
except ImportError:
    from calculator import (
        get_astronomical_events,
        get_daily_positions,
        get_light_events,
        get_moon_details,
    )

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _request_values(date: str, timezone_name: str):
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date invalide. Utilisez le format AAAA-MM-JJ.")

    if not datetime(1899, 7, 29) <= date_obj <= datetime(2053, 10, 8):
        raise HTTPException(
            status_code=400,
            detail="La date doit être comprise entre le 29/07/1899 et le 08/10/2053.",
        )

    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=400, detail="Fuseau horaire inconnu.")

    return date_obj


@app.get("/api/events")
async def get_events(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone_name: str = Query("UTC", alias="timezone"),
):
    date_obj = _request_values(date, timezone_name)
    return get_astronomical_events(date_obj, lat, lon, timezone_name)


@app.get("/api/day")
async def get_day(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone_name: str = Query("UTC", alias="timezone"),
):
    date_obj = _request_values(date, timezone_name)
    return {
        "timezone": timezone_name,
        "events": get_astronomical_events(date_obj, lat, lon, timezone_name),
        "light": get_light_events(date_obj, lat, lon, timezone_name),
        "moon_details": get_moon_details(date_obj, timezone_name),
        "positions": get_daily_positions(date_obj, lat, lon, timezone_name),
    }


@app.get("/api/forecast")
async def get_forecast(
    start: str = Query(..., description="Start date in YYYY-MM-DD format"),
    days: int = Query(7, ge=1, le=7, description="Number of days"),
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone_name: str = Query("UTC", alias="timezone"),
):
    start_date = _request_values(start, timezone_name)
    end_date = start_date + timedelta(days=days - 1)
    if end_date > datetime(2053, 10, 8):
        raise HTTPException(status_code=400, detail="La période dépasse la limite de l’éphéméride.")

    forecast_days = []
    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        forecast_days.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "events": get_astronomical_events(current_date, lat, lon, timezone_name),
            "light": get_light_events(current_date, lat, lon, timezone_name),
            "moon_details": get_moon_details(
                current_date,
                timezone_name,
                include_next_phases=False,
            ),
        })

    return {"timezone": timezone_name, "days": forecast_days}
