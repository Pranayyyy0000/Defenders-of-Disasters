"""
Weather Service Module for Guardians of Disasters.
Integrates with Open-Meteo API to retrieve real-time meteorological observations.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
import json
import urllib.request
import urllib.error
import urllib.parse

# Optional requests import support
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    requests = None  # type: ignore
    HAS_REQUESTS = False


class WeatherServiceError(Exception):
    """Base exception for WeatherService errors."""
    pass


class WeatherTimeoutError(WeatherServiceError):
    """Raised when request times out."""
    pass


class WeatherHTTPError(WeatherServiceError):
    """Raised when an HTTP error occurs."""
    def __init__(self, status_code: int, message: str):
        super().__init__(f"HTTP {status_code}: {message}")
        self.status_code = status_code


@dataclass
class WeatherResult:
    latitude: float
    longitude: float
    temperature: float
    wind_speed: float
    precipitation: float
    humidity: float
    soil_moisture: float
    raw_response: Optional[Dict[str, Any]] = None
    is_success: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WeatherService:
    """Service to fetch real-time and hourly weather observations from Open-Meteo."""

    DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast"
    DEFAULT_TIMEOUT = 10.0

    def __init__(self, base_url: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.timeout = timeout

    def get_weather(self, lat: float, lon: float) -> WeatherResult:
        """
        Retrieves current and hourly weather for a specific latitude and longitude.

        Parameters:
            lat (float): Latitude of the monitored location
            lon (float): Longitude of the monitored location

        Returns:
            WeatherResult: Structured weather observations
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": "true",
            "hourly": "relative_humidity_2m,soil_moisture_1_to_3cm,precipitation",
        }
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}?{query_string}"

        raw_data = self._make_request(url)

        return self._parse_response(lat, lon, raw_data)

    def _make_request(self, url: str) -> Dict[str, Any]:
        """Performs HTTP request with timeout and error handling."""
        if HAS_REQUESTS and requests is not None:
            try:
                response = requests.get(url, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except requests.Timeout as e:
                raise WeatherTimeoutError(f"Weather request timed out after {self.timeout}s: {e}")
            except requests.HTTPError as e:
                status_code = e.response.status_code if e.response is not None else 500
                raise WeatherHTTPError(status_code, str(e))
            except Exception as e:
                raise WeatherServiceError(f"Weather request failed: {e}")

        # Standard library urllib fallback
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "GuardiansOfDisasters-EmergencyService/1.0"}
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                payload = response.read().decode("utf-8")
                return json.loads(payload)
        except urllib.error.HTTPError as e:
            raise WeatherHTTPError(e.code, e.reason)
        except urllib.error.URLError as e:
            if "timed out" in str(e.reason).lower():
                raise WeatherTimeoutError(f"Weather request timed out after {self.timeout}s: {e.reason}")
            raise WeatherServiceError(f"Network error: {e.reason}")
        except TimeoutError as e:
            raise WeatherTimeoutError(f"Weather request timed out after {self.timeout}s: {e}")
        except json.JSONDecodeError as e:
            raise WeatherServiceError(f"Failed to parse weather JSON response: {e}")
        except Exception as e:
            raise WeatherServiceError(f"Unexpected error retrieving weather: {e}")

    def _parse_response(self, lat: float, lon: float, data: Dict[str, Any]) -> WeatherResult:
        """Parses Open-Meteo response into structured WeatherResult."""
        try:
            current = data.get("current_weather")
            hourly = data.get("hourly")
            if not isinstance(current, dict) or not isinstance(hourly, dict):
                raise WeatherServiceError("Response missing current_weather or hourly payload")

            temperature = float(current.get("temperature", 0.0))
            wind_speed = float(current.get("windspeed", 0.0))

            precipitation_list = hourly.get("precipitation", [0.0])
            humidity_list = hourly.get("relative_humidity_2m", [0.0])
            soil_moisture_list = hourly.get("soil_moisture_1_to_3cm", [0.0])

            # Notebook logic: index = -1 (latest data)
            precipitation = float(precipitation_list[-1]) if precipitation_list else 0.0
            humidity = float(humidity_list[-1]) if humidity_list else 0.0
            soil_moisture = float(soil_moisture_list[-1]) if soil_moisture_list else 0.0

            return WeatherResult(
                latitude=lat,
                longitude=lon,
                temperature=temperature,
                wind_speed=wind_speed,
                precipitation=precipitation,
                humidity=humidity,
                soil_moisture=soil_moisture,
                raw_response=data,
                is_success=True,
                error=None,
            )
        except (KeyError, IndexError, ValueError, TypeError) as e:
            raise WeatherServiceError(f"Malformed Open-Meteo response data: {e}")
