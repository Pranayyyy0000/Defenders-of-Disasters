"""
Routing Service Module for Guardians of Disasters.
Integrates with OpenRouteService to calculate evacuation routes, distances, and travel durations.
"""

from dataclasses import dataclass, asdict
from typing import List, Tuple, Optional, Dict, Any
import os
import json
import urllib.request
import urllib.error

# Optional openrouteservice package support
try:
    import openrouteservice
    from openrouteservice import convert
    HAS_ORS_LIB = True
except ImportError:
    openrouteservice = None  # type: ignore
    convert = None  # type: ignore
    HAS_ORS_LIB = False


class RoutingServiceError(Exception):
    """Base exception for RoutingService errors."""
    pass


class RoutingAPIKeyMissingError(RoutingServiceError):
    """Raised when ORS_API_KEY is not provided."""
    pass


class RoutingTimeoutError(RoutingServiceError):
    """Raised when request times out."""
    pass


@dataclass
class RouteResult:
    coordinates: List[Tuple[float, float]]  # [(lat, lon), ...]
    distance_meters: float
    distance_km: float
    duration_seconds: float
    duration_minutes: float
    summary: Dict[str, Any]
    is_success: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def decode_polyline_coords(polyline_str: str) -> List[Tuple[float, float]]:
    """
    Decodes an encoded polyline string into [(lat, lon), ...]
    Pure Python implementation of Google/ORS Polyline algorithm.
    """
    coordinates: List[Tuple[float, float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(polyline_str)

    while index < length:
        shift = 0
        result = 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = 0
        result = 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append((lat / 1e5, lng / 1e5))

    return coordinates


class RoutingService:
    """Service to generate driving / evacuation routes using OpenRouteService."""

    DEFAULT_BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car"
    DEFAULT_TIMEOUT = 10.0

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key or os.environ.get("ORS_API_KEY", "")
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.timeout = timeout

        self.client = None
        if HAS_ORS_LIB and openrouteservice is not None and self.api_key:
            try:
                self.client = openrouteservice.Client(key=self.api_key, timeout=self.timeout)
            except Exception:
                self.client = None

    def get_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
    ) -> RouteResult:
        """
        Calculates directions between start and destination coordinates.
        Matches notebook Cell 8 get_route_info signature:
        coords = [(start_lon, start_lat), (end_lon, end_lat)]

        Returns:
            RouteResult: Structured route coordinates [(lat, lon), ...], distance, and duration
        """
        if not self.api_key:
            raise RoutingAPIKeyMissingError(
                "ORS_API_KEY is not set. Please provide api_key in constructor or ORS_API_KEY env var."
            )

        # 1. Try official client if available
        if self.client is not None and HAS_ORS_LIB and convert is not None:
            try:
                coords = [(start_lon, start_lat), (end_lon, end_lat)]
                routes = self.client.directions(coords)
                return self._parse_ors_response(routes)
            except Exception as e:
                # If official client fails, propagate or fall back to REST
                if "timeout" in str(e).lower():
                    raise RoutingTimeoutError(f"OpenRouteService client timed out: {e}")
                raise RoutingServiceError(f"OpenRouteService call failed: {e}")

        # 2. REST API Request
        return self._make_rest_request(start_lat, start_lon, end_lat, end_lon)

    def _make_rest_request(
        self, start_lat: float, start_lon: float, end_lat: float, end_lon: float
    ) -> RouteResult:
        """Direct REST HTTP call to ORS."""
        payload = {
            "coordinates": [[start_lon, start_lat], [end_lon, end_lat]],
        }
        data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            self.base_url,
            data=data_bytes,
            headers={
                "Authorization": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "GuardiansOfDisasters-RoutingService/1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result_json = json.loads(response.read().decode("utf-8"))
                return self._parse_ors_response(result_json)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            raise RoutingServiceError(f"OpenRouteService HTTP error {e.code}: {e.reason} - {error_body}")
        except urllib.error.URLError as e:
            if "timed out" in str(e.reason).lower():
                raise RoutingTimeoutError(f"OpenRouteService timed out after {self.timeout}s: {e.reason}")
            raise RoutingServiceError(f"Network error contacting OpenRouteService: {e.reason}")
        except TimeoutError as e:
            raise RoutingTimeoutError(f"OpenRouteService timed out after {self.timeout}s: {e}")
        except json.JSONDecodeError as e:
            raise RoutingServiceError(f"Failed to parse ORS JSON response: {e}")
        except Exception as e:
            raise RoutingServiceError(f"Unexpected routing error: {e}")

    def _parse_ors_response(self, data: Dict[str, Any]) -> RouteResult:
        """Parses ORS directions response into RouteResult."""
        try:
            routes = data.get("routes", [])
            if not routes:
                raise RoutingServiceError("No routes returned by OpenRouteService")

            first_route = routes[0]
            summary = first_route.get("summary", {})
            distance_meters = float(summary.get("distance", 0.0))
            duration_seconds = float(summary.get("duration", 0.0))

            geometry = first_route.get("geometry", "")

            # If geometry is a GeoJSON dict with coordinates
            if isinstance(geometry, dict) and "coordinates" in geometry:
                # GeoJSON coordinates are [lon, lat]
                coordinates = [(c[1], c[0]) for c in geometry["coordinates"]]
            elif isinstance(geometry, str):
                # Encoded polyline string
                if HAS_ORS_LIB and convert is not None:
                    decoded = convert.decode_polyline(geometry)
                    # convert returns {'coordinates': [[lon, lat], ...]}
                    coordinates = [(lon_lat[1], lon_lat[0]) for lon_lat in decoded.get("coordinates", [])]
                else:
                    coordinates = decode_polyline_coords(geometry)
            else:
                coordinates = []

            return RouteResult(
                coordinates=coordinates,
                distance_meters=distance_meters,
                distance_km=round(distance_meters / 1000.0, 2),
                duration_seconds=duration_seconds,
                duration_minutes=round(duration_seconds / 60.0, 1),
                summary=summary,
                is_success=True,
                error=None,
            )
        except RoutingServiceError:
            raise
        except Exception as e:
            raise RoutingServiceError(f"Failed to parse OpenRouteService route structure: {e}")
