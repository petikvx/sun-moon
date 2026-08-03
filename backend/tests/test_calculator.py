import asyncio
import unittest
from datetime import datetime

from backend.calculator import (
    get_daily_positions,
    get_light_events,
    get_moon_details,
)
from backend.main import _request_values, get_forecast
from fastapi import HTTPException


class CalculatorTests(unittest.TestCase):
    def test_positions_use_ten_minute_steps(self):
        positions = get_daily_positions(
            datetime(2026, 8, 2), 48.8566, 2.3522, "Europe/Paris"
        )
        self.assertEqual(len(positions), 145)
        self.assertEqual(positions[1]["time"], "2026-08-01T22:10:00Z")

    def test_daylight_saving_days_have_variable_lengths(self):
        spring = get_daily_positions(
            datetime(2026, 3, 29), 48.8566, 2.3522, "Europe/Paris"
        )
        autumn = get_daily_positions(
            datetime(2026, 10, 25), 48.8566, 2.3522, "Europe/Paris"
        )
        self.assertEqual(len(spring), 139)
        self.assertEqual(len(autumn), 151)

    def test_moon_details_are_in_valid_ranges(self):
        details = get_moon_details(datetime(2026, 8, 2), "Europe/Paris")
        self.assertGreaterEqual(details["illumination_percent"], 0)
        self.assertLessEqual(details["illumination_percent"], 100)
        self.assertGreater(len(details["next_phases"]), 0)

    def test_light_events_have_expected_order(self):
        light = get_light_events(
            datetime(2026, 8, 2), 48.8566, 2.3522, "Europe/Paris"
        )
        self.assertLess(light["astronomical_dawn"], light["civil_dawn"])
        self.assertGreater(light["astronomical_dusk"], light["civil_dusk"])
        self.assertGreater(light["day_length_seconds"], 0)

    def test_api_rejects_unknown_timezone(self):
        with self.assertRaises(HTTPException) as context:
            _request_values("2026-08-03", "Mars/Olympus_Mons")
        self.assertEqual(context.exception.status_code, 400)

    def test_forecast_endpoint_returns_seven_lightweight_days(self):
        result = asyncio.run(get_forecast(
            start="2026-08-03",
            days=7,
            lat=48.8566,
            lon=2.3522,
            timezone_name="Europe/Paris",
        ))
        self.assertEqual(len(result["days"]), 7)
        self.assertEqual(result["days"][0]["date"], "2026-08-03")
        self.assertEqual(result["days"][-1]["date"], "2026-08-09")
        self.assertNotIn("positions", result["days"][0])
        self.assertEqual(result["days"][0]["moon_details"]["next_phases"], [])


if __name__ == "__main__":
    unittest.main()
