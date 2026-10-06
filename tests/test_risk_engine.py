import unittest
from src.risk.engine import (
    HyperlocalRiskEngine,
    HyperlocalRiskAssessment,
    FLOOD_CONFIG,
    HEATWAVE_CONFIG,
)


class TestHyperlocalRiskEngine(unittest.TestCase):

    def setUp(self):
        self.engine = HyperlocalRiskEngine()

    def test_explicit_weights_sum_to_100(self):
        flood_total = sum(item["max_points"] for item in FLOOD_CONFIG.values())
        self.assertEqual(flood_total, 100.0)

        heat_total = sum(item["max_points"] for item in HEATWAVE_CONFIG.values())
        self.assertEqual(heat_total, 100.0)

    def test_risk_level_boundaries(self):
        self.assertEqual(self.engine.get_risk_level(0), "LOW")
        self.assertEqual(self.engine.get_risk_level(25), "LOW")
        self.assertEqual(self.engine.get_risk_level(26), "MODERATE")
        self.assertEqual(self.engine.get_risk_level(50), "MODERATE")
        self.assertEqual(self.engine.get_risk_level(51), "HIGH")
        self.assertEqual(self.engine.get_risk_level(75), "HIGH")
        self.assertEqual(self.engine.get_risk_level(76), "CRITICAL")
        self.assertEqual(self.engine.get_risk_level(100), "CRITICAL")

    def test_score_is_strictly_deterministic(self):
        # 10 runs with identical inputs must yield identical numerical scores and factor structures
        res1 = self.engine.evaluate(
            location="Nilambur",
            disaster_type="flood",
            ml_probability=0.88,
            precipitation=14.5,
            wind_speed=26.0,
            humidity=92.0,
            soil_moisture=0.55,
            temperature=27.0,
        )
        for _ in range(9):
            res_repeat = self.engine.evaluate(
                location="Nilambur",
                disaster_type="flood",
                ml_probability=0.88,
                precipitation=14.5,
                wind_speed=26.0,
                humidity=92.0,
                soil_moisture=0.55,
                temperature=27.0,
            )
            self.assertEqual(res1.risk_score, res_repeat.risk_score)
            self.assertEqual(res1.risk_level, res_repeat.risk_level)
            self.assertEqual(res1.factor_summaries, res_repeat.factor_summaries)

    def test_flood_high_severity_evaluation(self):
        res = self.engine.evaluate(
            location="Thennala",
            disaster_type="flood",
            ml_probability=0.95,
            precipitation=18.0,
            wind_speed=35.0,
            humidity=94.0,
            soil_moisture=0.58,
            temperature=26.0,
        )

        self.assertIsInstance(res, HyperlocalRiskAssessment)
        self.assertGreaterEqual(res.risk_score, 76)
        self.assertEqual(res.risk_level, "CRITICAL")
        self.assertIn("Immediate evacuation advised", res.recommended_action)

        # Verify explainability factors
        summaries_text = " ".join(res.factor_summaries)
        self.assertIn("precipitation", summaries_text.lower())
        self.assertIn("soil moisture", summaries_text.lower())
        self.assertIn("ML danger probability", summaries_text)

    def test_flood_nominal_low_severity(self):
        res = self.engine.evaluate(
            location="Kottakkal",
            disaster_type="flood",
            ml_probability=0.05,
            precipitation=0.0,
            wind_speed=5.0,
            humidity=55.0,
            soil_moisture=0.18,
            temperature=26.0,
        )

        self.assertLessEqual(res.risk_score, 25)
        self.assertEqual(res.risk_level, "LOW")
        self.assertIn("Conditions nominal", res.recommended_action)

    def test_heatwave_high_severity_evaluation(self):
        res = self.engine.evaluate(
            location="Gaya",
            disaster_type="heatwave",
            ml_probability=0.92,
            precipitation=0.0,
            wind_speed=12.0,
            humidity=32.0,
            soil_moisture=0.10,
            temperature=45.5,
        )

        self.assertGreaterEqual(res.risk_score, 76)
        self.assertEqual(res.risk_level, "CRITICAL")
        self.assertIn("CRITICAL THERMAL CRISIS", res.recommended_action)

        summaries_text = " ".join(res.factor_summaries)
        self.assertIn("ambient temperature", summaries_text.lower())
        self.assertIn("heat index", summaries_text.lower())

    def test_heatwave_moderate_severity(self):
        res = self.engine.evaluate(
            location="Patna",
            disaster_type="heatwave",
            ml_probability=0.45,
            precipitation=0.0,
            wind_speed=8.0,
            humidity=40.0,
            soil_moisture=0.15,
            temperature=37.0,
        )

        self.assertGreaterEqual(res.risk_score, 26)
        self.assertLessEqual(res.risk_score, 75)
        self.assertIn(res.risk_level, ["MODERATE", "HIGH"])

    def test_input_clamping_and_bounds_safety(self):
        # Probability > 1.0 or < 0.0, negative precipitation
        res = self.engine.evaluate(
            location="TestPoint",
            disaster_type="flood",
            ml_probability=1.5,
            precipitation=-10.0,
            wind_speed=-5.0,
            humidity=150.0,
            soil_moisture=2.0,
            temperature=25.0,
        )

        self.assertGreaterEqual(res.risk_score, 0)
        self.assertLessEqual(res.risk_score, 100)


    def test_output_dict_contract_and_indexing(self):
        res = self.engine.evaluate(
            location="Kottakkal",
            disaster_type="flood",
            ml_probability=0.82,
            precipitation=12.0,
            wind_speed=18.0,
            humidity=88.0,
            soil_moisture=0.48,
            temperature=27.0,
        )
        data = res.to_dict()
        # Verify required output contract
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("contributing_factors", data)
        self.assertIn("recommended_action", data)
        self.assertIsInstance(data["risk_score"], int)
        self.assertIn(data["risk_level"], ["LOW", "MODERATE", "HIGH", "CRITICAL"])
        self.assertIsInstance(data["contributing_factors"], list)
        self.assertIsInstance(data["recommended_action"], str)

        # Verify direct dictionary-style indexing
        self.assertEqual(res["risk_score"], data["risk_score"])
        self.assertEqual(res["risk_level"], data["risk_level"])
        self.assertEqual(res["contributing_factors"], data["contributing_factors"])

    def test_folium_popup_html_integration(self):
        res = self.engine.evaluate(
            location="Thennala",
            disaster_type="flood",
            ml_probability=0.88,
            precipitation=14.0,
            wind_speed=20.0,
            humidity=90.0,
            soil_moisture=0.52,
            temperature=28.0,
        )
        html = res.to_folium_popup_html(max_width=300)
        self.assertIn("THENNALA", html.upper())
        self.assertIn(str(res.risk_score), html)
        self.assertIn(res.risk_level, html)
        self.assertIn("Contributing factors:", html)
        for factor_summary in res.factor_summaries:
            self.assertIn(factor_summary, html)

        popup = res.to_folium_popup()
        self.assertIsNotNone(popup)


if __name__ == "__main__":
    unittest.main()
