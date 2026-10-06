import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error
from src.services.weather_service import (
    WeatherService,
    WeatherResult,
    WeatherServiceError,
    WeatherTimeoutError,
    WeatherHTTPError,
)


class TestWeatherService(unittest.TestCase):

    def setUp(self):
        self.service = WeatherService(timeout=5.0)
        self.mock_response_data = {
            "current_weather": {
                "temperature": 28.5,
                "windspeed": 14.2,
                "weathercode": 3,
                "time": "2026-10-06T00:00",
            },
            "hourly": {
                "time": ["2026-10-06T00:00", "2026-10-06T01:00"],
                "relative_humidity_2m": [82.0, 88.0],
                "soil_moisture_1_to_3cm": [0.42, 0.48],
                "precipitation": [5.2, 7.5],
            },
        }

    @patch("src.services.weather_service.WeatherService._make_request")
    def test_get_weather_success(self, mock_make_request):
        mock_make_request.return_value = self.mock_response_data

        result = self.service.get_weather(lat=11.10, lon=76.10)

        self.assertIsInstance(result, WeatherResult)
        self.assertEqual(result.latitude, 11.10)
        self.assertEqual(result.longitude, 76.10)
        self.assertEqual(result.temperature, 28.5)
        self.assertEqual(result.wind_speed, 14.2)
        # Latest index (-1) values
        self.assertEqual(result.humidity, 88.0)
        self.assertEqual(result.soil_moisture, 0.48)
        self.assertEqual(result.precipitation, 7.5)
        self.assertTrue(result.is_success)
        self.assertIsNone(result.error)

    @patch("urllib.request.urlopen")
    def test_urllib_request_success(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(self.mock_response_data).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = self.service.get_weather(lat=26.01, lon=89.98)

        self.assertEqual(result.temperature, 28.5)
        self.assertEqual(result.precipitation, 7.5)

    @patch("urllib.request.urlopen")
    def test_weather_timeout_error(self, mock_urlopen):
        mock_urlopen.side_effect = TimeoutError("Connection timed out")

        with self.assertRaises(WeatherTimeoutError):
            self.service.get_weather(lat=11.10, lon=76.10)

    @patch("urllib.request.urlopen")
    def test_weather_http_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.open-meteo.com/v1/forecast",
            code=503,
            msg="Service Unavailable",
            hdrs={},
            fp=None,
        )

        with self.assertRaises(WeatherHTTPError) as ctx:
            self.service.get_weather(lat=11.10, lon=76.10)
        self.assertEqual(ctx.exception.status_code, 503)

    @patch("src.services.weather_service.WeatherService._make_request")
    def test_malformed_response_handling(self, mock_make_request):
        mock_make_request.return_value = {"current_weather": None}

        with self.assertRaises(WeatherServiceError):
            self.service.get_weather(lat=11.10, lon=76.10)


if __name__ == "__main__":
    unittest.main()
