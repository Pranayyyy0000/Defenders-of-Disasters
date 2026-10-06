import unittest
from unittest.mock import patch, MagicMock
from src.services.weather_service import (
    WeatherService,
    WeatherResult,
    clean_float,
    get_latest_valid_value,
    WeatherValidationError,
)
from src.ml.evaluation import (
    MLPipelineEvaluator,
    compute_accuracy,
    compute_precision,
    compute_recall,
    compute_f1,
    compute_confusion_matrix,
    build_classification_report,
    train_test_split_dataset,
    PROXY_LABEL_DISCLAIMER,
)


class TestWeatherIngestionAndMLEvaluation(unittest.TestCase):

    def setUp(self):
        self.weather_service = WeatherService(timeout=5.0)
        self.evaluator = MLPipelineEvaluator(random_state=42, test_size=0.25)

        # Mocked weather dataset (12 sample locations)
        self.mock_records = [
            WeatherResult(
                latitude=11.10 + i * 0.05,
                longitude=76.10 + i * 0.05,
                temperature=25.0 + (i % 5),
                wind_speed=8.0 + (i * 2.0),
                precipitation=1.0 + (i * 1.5),
                humidity=70.0 + (i * 2.5),
                soil_moisture=0.30 + (i * 0.03),
                is_success=True,
            )
            for i in range(12)
        ]

    # ==========================================
    # 1. WEATHER INGESTION & NORMALIZATION TESTS
    # ==========================================

    def test_clean_float_handles_null_nan_and_bounds(self):
        self.assertEqual(clean_float(None, default=10.0), 10.0)
        self.assertEqual(clean_float("not_a_number", default=5.0), 5.0)
        self.assertEqual(clean_float(float("nan"), default=0.0), 0.0)
        self.assertEqual(clean_float(12.3456), 12.346)
        # Bounds checking
        self.assertEqual(clean_float(-5.0, min_val=0.0), 0.0)
        self.assertEqual(clean_float(150.0, max_val=100.0), 100.0)

    def test_get_latest_valid_value_skips_nulls(self):
        # Scenario where API returns None for future hours
        hourly_precip = [1.2, 3.4, 5.0, None, None]
        self.assertEqual(get_latest_valid_value(hourly_precip), 5.0)

        # Empty / all None fallback
        self.assertEqual(get_latest_valid_value([None, None], default=0.0), 0.0)
        self.assertEqual(get_latest_valid_value([], default=2.5), 2.5)

    @patch("src.services.weather_service.WeatherService._make_request")
    def test_weather_ingestion_preserves_five_metrics(self, mock_request):
        mock_request.return_value = {
            "current_weather": {"temperature": 32.4, "windspeed": 18.6},
            "hourly": {
                "precipitation": [0.0, 1.2, 4.8],
                "relative_humidity_2m": [60.0, 75.0, 84.0],
                "soil_moisture_1_to_3cm": [0.22, 0.35, 0.48],
            },
        }

        result = self.weather_service.get_weather(lat=11.10, lon=76.10)

        self.assertTrue(result.is_success)
        # Assert preservation of 5 core parameters
        self.assertEqual(result.temperature, 32.4)
        self.assertEqual(result.wind_speed, 18.6)
        self.assertEqual(result.precipitation, 4.8)
        self.assertEqual(result.humidity, 84.0)
        self.assertEqual(result.soil_moisture, 0.48)

    @patch("src.services.weather_service.WeatherService._make_request")
    def test_weather_ingestion_handles_api_failure_gracefully(self, mock_request):
        mock_request.side_effect = Exception("Open-Meteo Gateway 502")

        # With raise_on_error=False, returns structured failed result
        result = self.weather_service.get_weather(lat=11.10, lon=76.10, raise_on_error=False)

        self.assertFalse(result.is_success)
        self.assertIsNotNone(result.error)
        self.assertEqual(result.temperature, 0.0)
        self.assertEqual(result.precipitation, 0.0)

    def test_invalid_coordinates_validation(self):
        with self.assertRaises(WeatherValidationError):
            self.weather_service.get_weather(lat=195.0, lon=76.10)

    # ==========================================
    # 2. ML METHODOLOGY & EVALUATION TESTS
    # ==========================================

    def test_proxy_label_disclaimer_documented(self):
        metrics = self.evaluator.evaluate(self.mock_records, disaster_type="flood")
        self.assertTrue(metrics.is_proxy_label)
        self.assertIn("PROXY LABELS", metrics.disclaimer)
        self.assertIn("not empirical historical disaster ground truth", metrics.disclaimer)

    def test_train_test_split_reproducibility(self):
        X = [[i, i * 2] for i in range(20)]
        y = [1 if i % 2 == 0 else 0 for i in range(20)]

        X_train1, X_test1, y_train1, y_test1 = train_test_split_dataset(X, y, test_size=0.25, random_state=42)
        X_train2, X_test2, y_train2, y_test2 = train_test_split_dataset(X, y, test_size=0.25, random_state=42)

        # Reproducible random_state test
        self.assertEqual(X_train1, X_train2)
        self.assertEqual(X_test1, X_test2)
        self.assertEqual(y_train1, y_train2)
        self.assertEqual(y_test1, y_test2)
        self.assertEqual(len(X_test1), 5)
        self.assertEqual(len(X_train1), 15)

    def test_metric_computations(self):
        y_true = [1, 1, 0, 0, 1, 0]
        y_pred = [1, 0, 0, 0, 1, 1]

        acc = compute_accuracy(y_true, y_pred)
        self.assertAlmostEqual(acc, 4 / 6, places=3)

        cm = compute_confusion_matrix(y_true, y_pred)
        # tn=2 (zeros predicted zero), fp=1 (zero predicted 1)
        # fn=1 (one predicted 0), tp=2 (ones predicted 1)
        self.assertEqual(cm.true_negative, 2)
        self.assertEqual(cm.false_positive, 1)
        self.assertEqual(cm.false_negative, 1)
        self.assertEqual(cm.true_positive, 2)

        prec = compute_precision(y_true, y_pred)
        rec = compute_recall(y_true, y_pred)
        f1 = compute_f1(prec, rec)

        self.assertAlmostEqual(prec, 2 / 3, places=3)
        self.assertAlmostEqual(rec, 2 / 3, places=3)
        self.assertAlmostEqual(f1, 2 / 3, places=3)

    def test_classification_report_generation(self):
        y_true = [0, 0, 1, 1]
        y_pred = [0, 1, 1, 1]
        class_names = {0: "Safe", 1: "Hazard"}

        report = build_classification_report(y_true, y_pred, class_names)
        self.assertIn("Safe", report.classes)
        self.assertIn("Hazard", report.classes)
        self.assertGreater(report.accuracy, 0.5)

        text_report = report.format_text()
        self.assertIn("Safe", text_report)
        self.assertIn("Hazard", text_report)
        self.assertIn("Precision", text_report)

    def test_flood_pipeline_evaluation_with_feature_importance(self):
        metrics = self.evaluator.evaluate(self.mock_records, disaster_type="flood")

        self.assertIsInstance(metrics.accuracy, float)
        self.assertIsInstance(metrics.precision, float)
        self.assertIsInstance(metrics.recall, float)
        self.assertIsInstance(metrics.f1, float)
        self.assertGreater(metrics.train_size, 0)
        self.assertGreater(metrics.test_size, 0)

        # Feature importance should cover all 4 flood features
        self.assertIn("wind_speed", metrics.feature_importance)
        self.assertIn("precipitation", metrics.feature_importance)
        self.assertIn("humidity", metrics.feature_importance)
        self.assertIn("soil_moisture", metrics.feature_importance)

    def test_heatwave_pipeline_evaluation_with_feature_importance(self):
        metrics = self.evaluator.evaluate(self.mock_records, disaster_type="heatwave")

        self.assertIsInstance(metrics.accuracy, float)
        self.assertIn("temperature", metrics.feature_importance)
        self.assertIn("heat_index", metrics.feature_importance)

    @patch("src.services.weather_service.WeatherService.get_weather")
    def test_ingest_and_evaluate_with_mocked_weather(self, mock_get_weather):
        mock_get_weather.side_effect = self.mock_records[:4]

        locations = [
            {"lat": 11.10, "lon": 76.10},
            {"lat": 11.15, "lon": 76.15},
            {"lat": 11.20, "lon": 76.20},
            {"lat": 11.25, "lon": 76.25},
        ]

        metrics = self.evaluator.ingest_and_evaluate(
            locations, self.weather_service, disaster_type="flood"
        )

        self.assertEqual(mock_get_weather.call_count, 4)
        self.assertIsNotNone(metrics.accuracy)


if __name__ == "__main__":
    unittest.main()
