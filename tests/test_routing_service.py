import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error
from src.services.routing_service import (
    RoutingService,
    RouteResult,
    RoutingServiceError,
    RoutingAPIKeyMissingError,
    RoutingTimeoutError,
    decode_polyline_coords,
)


class TestRoutingService(unittest.TestCase):

    def setUp(self):
        self.api_key = "test_ors_api_key_12345"
        self.service = RoutingService(api_key=self.api_key, timeout=5.0)
        self.mock_ors_response = {
            "routes": [
                {
                    "summary": {
                        "distance": 4500.0,  # 4.5 km
                        "duration": 420.0,   # 7.0 minutes
                    },
                    "geometry": {
                        "coordinates": [
                            [76.10, 11.10],
                            [76.105, 11.105],
                            [76.109, 11.109],
                        ]
                    },
                }
            ]
        }

    def test_missing_api_key_raises_error(self):
        service = RoutingService(api_key="")
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(RoutingAPIKeyMissingError):
                service.get_route(11.10, 76.10, 11.109, 76.109)

    @patch("src.services.routing_service.RoutingService._make_rest_request")
    def test_get_route_success(self, mock_rest):
        mock_rest.return_value = RouteResult(
            coordinates=[(11.10, 76.10), (11.109, 76.109)],
            distance_meters=4500.0,
            distance_km=4.5,
            duration_seconds=420.0,
            duration_minutes=7.0,
            summary={"distance": 4500.0, "duration": 420.0},
            is_success=True,
        )

        result = self.service.get_route(11.10, 76.10, 11.109, 76.109)
        self.assertIsInstance(result, RouteResult)
        self.assertEqual(result.distance_km, 4.5)
        self.assertEqual(result.duration_minutes, 7.0)
        self.assertEqual(len(result.coordinates), 2)

    @patch("urllib.request.urlopen")
    def test_parse_ors_geojson_geometry(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(self.mock_ors_response).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = self.service._make_rest_request(11.10, 76.10, 11.109, 76.109)
        self.assertEqual(result.distance_meters, 4500.0)
        self.assertEqual(result.distance_km, 4.5)
        self.assertEqual(result.duration_minutes, 7.0)
        # Verify (lat, lon) format
        self.assertEqual(result.coordinates[0], (11.10, 76.10))

    def test_decode_polyline_coords(self):
        # Encoded polyline for points (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
        encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        coords = decode_polyline_coords(encoded)
        self.assertEqual(len(coords), 3)
        self.assertAlmostEqual(coords[0][0], 38.5, places=1)
        self.assertAlmostEqual(coords[0][1], -120.2, places=1)

    @patch("urllib.request.urlopen")
    def test_routing_timeout_error(self, mock_urlopen):
        mock_urlopen.side_effect = TimeoutError("ORS timed out")

        with self.assertRaises(RoutingTimeoutError):
            self.service._make_rest_request(11.10, 76.10, 11.109, 76.109)

    @patch("urllib.request.urlopen")
    def test_routing_api_failure(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.openrouteservice.org",
            code=403,
            msg="Forbidden - Invalid Key",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"error":"Invalid Key"}'),
        )

        with self.assertRaises(RoutingServiceError):
            self.service._make_rest_request(11.10, 76.10, 11.109, 76.109)


if __name__ == "__main__":
    unittest.main()
