"""
Weather Service Module for Defenders of Disasters / Guardians of Disasters.
Integrates with Open-Meteo API to retrieve, validate, and normalize real-time meteorological observations.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List
import json
import math
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


class WeatherValidationError(WeatherServiceError):
    """Raised when weather payload validation fails."""
    pass


@dataclass
class WeatherResult:
    """
    Normalized meteorological data structure.
    Strictly preserves:
      - temperature (°C)
      - wind_speed (km/h)
      - precipitation (mm)
      - humidity (%)
      - soil_moisture (m³/m³)
    """
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

    def to_feature_vector(self, mode: str = "flood") -> List[float]:
        """Returns normalized numerical feature vector for ML models."""
        if mode == "heat":
            heat_index = self.temperature + 0.33 * self.humidity - 0.7
            return [self.temperature, round(heat_index, 2)]
        return [self.wind_speed, self.precipitation, self.humidity, self.soil_moisture]


def clean_float(
    value: Any,
    default: float = 0.0,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
) -> float:
    """
    Validates and normalizes float values, safeguarding against None, null, NaN, or non-numeric types.
    """
    if value is None:
        return default
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        if min_val is not None and f < min_val:
            return min_val
        if max_val is not None and f > max_val:
            return max_val
        return round(f, 3)
    except (ValueError, TypeError):
        return default


def get_latest_valid_value(values: Optional[List[Any]], default: float = 0.0) -> float:
    """
    Traverses hourly list from end to beginning to find latest non-null valid observation.
    """
    if not values or not isinstance(values, list):
        return default
    for val in reversed(values):
        if val is not None:
            cleaned = clean_float(val, default=float("nan"))
            if not math.isnan(cleaned):
                return cleaned
    return default


class WeatherService:
    """Service to fetch real-time and hourly weather observations from Open-Meteo with validation."""

    DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast"
    DEFAULT_TIMEOUT = 10.0

    def __init__(self, base_url: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.timeout = timeout

    def get_weather(self, lat: float, lon: float, raise_on_error: bool = True) -> WeatherResult:
        """
        Retrieves current and hourly weather for a specific latitude and longitude.

        Parameters:
            lat (float): Latitude of monitored location
            lon (float): Longitude of monitored location
            raise_on_error (bool): If False, returns failed WeatherResult instead of raising exception

        Returns:
            WeatherResult: Normalized structured weather observations
        """
        # Validate coordinates
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            err = f"Invalid coordinates lat={lat}, lon={lon}. Latitude must be [-90, 90], Longitude [-180, 180]."
            if raise_on_error:
                raise WeatherValidationError(err)
            return WeatherResult(
                latitude=lat,
                longitude=lon,
                temperature=0.0,
                wind_speed=0.0,
                precipitation=0.0,
                humidity=0.0,
                soil_moisture=0.0,
                is_success=False,
                error=err,
            )

        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": "true",
            "hourly": "relative_humidity_2m,soil_moisture_1_to_3cm,precipitation",
        }
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}?{query_string}"

        try:
            raw_data = self._make_request(url)
            return self._parse_response(lat, lon, raw_data)
        except Exception as e:
            if raise_on_error:
                raise
            return WeatherResult(
                latitude=lat,
                longitude=lon,
                temperature=0.0,
                wind_speed=0.0,
                precipitation=0.0,
                humidity=0.0,
                soil_moisture=0.0,
                is_success=False,
                error=str(e),
            )

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
            headers={"User-Agent": "DefendersOfDisasters-WeatherIngestion/2.0"}
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
        """Parses and validates Open-Meteo response into normalized WeatherResult."""
        if not isinstance(data, dict):
            raise WeatherValidationError("Weather API payload is not a valid dictionary")

        current = data.get("current_weather")
        hourly = data.get("hourly")

        if not isinstance(current, dict) or not isinstance(hourly, dict):
            raise WeatherValidationError("Response missing required 'current_weather' or 'hourly' objects")

        # Validate & clean 5 core preserved metrics:
        # 1. Temperature: reasonable terrestrial bounds [-60, 65]
        temperature = clean_float(current.get("temperature"), default=25.0, min_val=-60.0, max_val=65.0)

        # 2. Wind speed: >= 0 km/h
        wind_speed = clean_float(current.get("windspeed"), default=0.0, min_val=0.0, max_val=300.0)

        # 3. Precipitation: latest valid hourly value, >= 0 mm
        precipitation = get_latest_valid_value(hourly.get("precipitation"), default=0.0)
        precipitation = max(0.0, precipitation)

        # 4. Relative humidity: [0, 100] %
        humidity = get_latest_valid_value(hourly.get("relative_humidity_2m"), default=50.0)
        humidity = min(100.0, max(0.0, humidity))

        # 5. Soil moisture: typically 0.0 to 1.0 m³/m³
        soil_moisture = get_latest_valid_value(hourly.get("soil_moisture_1_to_3cm"), default=0.25)
        soil_moisture = min(1.0, max(0.0, soil_moisture))

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
