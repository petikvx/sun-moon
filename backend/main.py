from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    from .calculator import get_astronomical_events, get_daily_positions
except ImportError:
    from calculator import get_astronomical_events, get_daily_positions

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
        "positions": get_daily_positions(date_obj, lat, lon, timezone_name),
    }
