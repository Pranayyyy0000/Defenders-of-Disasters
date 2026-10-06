"""
Hyperlocal Disaster Risk Engine Module for Defenders of Disasters.

Computes deterministic, explainable risk scores (0-100) and classifications
(LOW, MODERATE, HIGH, CRITICAL) along with explicit contributing factor breakdowns
and recommended actions.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional


@dataclass
class ContributingFactor:
    factor: str
    description: str
    value: Any
    points_contributed: float
    max_points: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class HyperlocalRiskAssessment:
    location: str
    disaster_type: str
    risk_score: int  # 0 - 100
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL
    contributing_factors: List[ContributingFactor]
    factor_summaries: List[str]  # Human-readable bullets explaining WHY
    recommended_action: str
    explicit_weights: Dict[str, float]

    def __getitem__(self, item: str) -> Any:
        return self.to_dict()[item]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "contributing_factors": self.factor_summaries,
            "recommended_action": self.recommended_action,
            "location": self.location,
            "disaster_type": self.disaster_type,
            "detailed_factors": [cf.to_dict() for cf in self.contributing_factors],
            "factor_summaries": self.factor_summaries,
            "explicit_weights": self.explicit_weights,
        }

    def to_folium_popup_html(self, max_width: int = 280) -> str:
        """
        Integrates explainable risk score into a Folium map popup with high contrast styling.
        """
        level_colors = {
            "LOW": "#10B981",
            "MODERATE": "#F59E0B",
            "HIGH": "#FF5A36",
            "CRITICAL": "#DC2626",
        }
        color = level_colors.get(self.risk_level, "#FF5A36")
        factors_li = "".join([f"<li style='margin-bottom: 2px;'>{s}</li>" for s in self.factor_summaries])

        return f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #0A0A0B; max-width: {max_width}px; line-height: 1.4;">
  <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 6px; margin-bottom: 8px;">
    <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.03em;">{self.location}</strong>
    <span style="background: {color}; color: #FFFFFF; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px;">{self.risk_level}</span>
  </div>
  <div style="display: flex; align-items: baseline; margin-bottom: 8px;">
    <span style="font-size: 22px; font-weight: 800; color: {color}; font-variant-numeric: tabular-nums;">{self.risk_score}</span>
    <span style="font-size: 11px; color: #64748B; margin-left: 4px;">/ 100 Risk Score</span>
  </div>
  <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Contributing factors:</div>
  <ul style="margin: 0 0 10px 0; padding-left: 16px; font-size: 11px; color: #334155;">
    {factors_li}
  </ul>
  <div style="background: rgba(0,0,0,0.04); border-left: 3px solid {color}; padding: 6px 8px; font-size: 11px; border-radius: 0 4px 4px 0;">
    <strong>Action:</strong> {self.recommended_action}
  </div>
</div>"""

    def to_folium_popup(self, max_width: int = 280) -> Any:
        """
        Creates a folium.Popup instance if folium is installed, otherwise returns the popup HTML string.
        """
        html = self.to_folium_popup_html(max_width=max_width)
        try:
            import folium  # type: ignore
            return folium.Popup(html, max_width=max_width)
        except ImportError:
            return html


# Explicit, transparent weight configurations (sum of max_points = 100)
FLOOD_CONFIG = {
    "ml_prob": {"max_points": 35.0, "name": "ML Danger Probability"},
    "precip": {"max_points": 25.0, "name": "Precipitation"},
    "soil": {"max_points": 20.0, "name": "Soil Moisture"},
    "humidity": {"max_points": 12.0, "name": "Relative Humidity"},
    "wind": {"max_points": 8.0, "name": "Wind Speed"},
}

HEATWAVE_CONFIG = {
    "ml_prob": {"max_points": 35.0, "name": "ML Danger Probability"},
    "temperature": {"max_points": 35.0, "name": "Ambient Temperature"},
    "heat_index": {"max_points": 20.0, "name": "Heat Index (HI)"},
    "wind_arid": {"max_points": 10.0, "name": "Wind / Atmospheric Aridity"},
}


class HyperlocalRiskEngine:
    """
    Deterministic, explainable risk assessment engine.
    Calculates numerical hazard scores (0-100) without LLM randomness.
    """

    @staticmethod
    def get_risk_level(score: int) -> str:
        """
        Risk level tiers:
        0 - 25:   LOW
        26 - 50:  MODERATE
        51 - 75:  HIGH
        76 - 100: CRITICAL
        """
        if score <= 25:
            return "LOW"
        elif score <= 50:
            return "MODERATE"
        elif score <= 75:
            return "HIGH"
        else:
            return "CRITICAL"

    @classmethod
    def get_recommended_action(cls, risk_level: str, disaster_type: str) -> str:
        if risk_level == "LOW":
            return (
                "Conditions nominal. Continue routine monitoring and stay tuned to local meteorological advisories."
            )
        elif risk_level == "MODERATE":
            if disaster_type == "flood":
                return "Advisory alert. Inspect local drainage channels, secure vulnerable livestock, and identify nearest relief shelter."
            else:
                return "Thermal advisory. Limit unshaded outdoor exertion, maintain continuous hydration, and avoid peak noon sun."
        elif risk_level == "HIGH":
            if disaster_type == "flood":
                return "Severe flood warning. High likelihood of inundation. Prepare emergency go-kit and ready vulnerable family members for evacuation."
            else:
                return "Severe heatwave warning. Hazardous thermal conditions. Suspend outdoor physical labor; seek designated cool relief shelter."
        else:  # CRITICAL
            if disaster_type == "flood":
                return "CRITICAL EMERGENCY: Immediate evacuation advised. Move along designated blue evacuation route to assigned relief shelter immediately."
            else:
                return "CRITICAL THERMAL CRISIS: Life-threatening heat hazard. Move to air-conditioned/cooled shelter immediately; medical evacuation standby."

    @classmethod
    def evaluate(
        cls,
        location: str,
        disaster_type: str,
        ml_probability: float,
        precipitation: float,
        wind_speed: float,
        humidity: float,
        soil_moisture: float,
        temperature: float,
    ) -> HyperlocalRiskAssessment:
        """
        Calculates deterministic hyperlocal risk score (0-100) with explainable contributing factors.
        """
        norm_disaster = "heatwave" if "heat" in disaster_type.lower() else "flood"
        factors: List[ContributingFactor] = []
        summaries: List[str] = []

        # Bound inputs
        safe_prob = max(0.0, min(1.0, float(ml_probability)))
        safe_precip = max(0.0, float(precipitation))
        safe_wind = max(0.0, float(wind_speed))
        safe_humidity = max(0.0, min(100.0, float(humidity)))
        safe_soil = max(0.0, min(1.0, float(soil_moisture)))
        safe_temp = float(temperature)

        if norm_disaster == "flood":
            # 1. ML Probability Contribution (0 - 35 points)
            ml_pts = round(safe_prob * FLOOD_CONFIG["ml_prob"]["max_points"], 1)
            factors.append(
                ContributingFactor(
                    factor="ML danger probability",
                    description=f"Model hazard classification probability of {safe_prob:.2f}",
                    value=safe_prob,
                    points_contributed=ml_pts,
                    max_points=FLOOD_CONFIG["ml_prob"]["max_points"],
                )
            )
            if safe_prob >= 0.5:
                summaries.append(f"ML danger probability ({int(safe_prob * 100)}%)")

            # 2. Precipitation Contribution (0 - 25 points)
            # Thresholds: < 3mm -> 0-7 pts; 3-7mm -> 8-18 pts; > 7mm -> 19-25 pts
            if safe_precip <= 0.5:
                precip_pts = 0.0
            elif safe_precip < 3.0:
                precip_pts = 3.0 + (safe_precip / 3.0) * 4.0
            elif safe_precip <= 7.0:
                precip_pts = 8.0 + ((safe_precip - 3.0) / 4.0) * 10.0
            else:
                precip_pts = min(25.0, 18.0 + ((safe_precip - 7.0) / 10.0) * 7.0)
            precip_pts = round(precip_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Precipitation accumulation",
                    description=f"Hourly rainfall of {safe_precip:.1f} mm",
                    value=f"{safe_precip:.1f} mm",
                    points_contributed=precip_pts,
                    max_points=FLOOD_CONFIG["precip"]["max_points"],
                )
            )
            if safe_precip >= 3.0:
                summaries.append(
                    f"{'Torrential' if safe_precip >= 7.0 else 'Moderate'} precipitation ({safe_precip:.1f} mm)"
                )

            # 3. Soil Moisture Contribution (0 - 20 points)
            # Thresholds: < 0.35 -> 0-5 pts; 0.35-0.50 -> 6-13 pts; > 0.50 -> 14-20 pts
            if safe_soil < 0.25:
                soil_pts = (safe_soil / 0.25) * 3.0
            elif safe_soil <= 0.35:
                soil_pts = 3.0 + ((safe_soil - 0.25) / 0.10) * 3.0
            elif safe_soil <= 0.50:
                soil_pts = 6.0 + ((safe_soil - 0.35) / 0.15) * 7.0
            else:
                soil_pts = min(20.0, 13.0 + ((safe_soil - 0.50) / 0.20) * 7.0)
            soil_pts = round(soil_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Soil moisture saturation",
                    description=f"Subsurface ground moisture at {safe_soil:.2f} m³/m³",
                    value=f"{safe_soil:.2f} m³/m³",
                    points_contributed=soil_pts,
                    max_points=FLOOD_CONFIG["soil"]["max_points"],
                )
            )
            if safe_soil >= 0.35:
                summaries.append(
                    f"{'Saturated' if safe_soil >= 0.5 else 'Elevated'} soil moisture ({safe_soil:.2f} m³/m³)"
                )

            # 4. Humidity Contribution (0 - 12 points)
            # Thresholds: < 80% -> 0-3 pts; 80-90% -> 4-8 pts; > 90% -> 9-12 pts
            if safe_humidity < 70.0:
                hum_pts = (safe_humidity / 70.0) * 2.0
            elif safe_humidity <= 84.0:
                hum_pts = 2.0 + ((safe_humidity - 70.0) / 14.0) * 3.0
            elif safe_humidity <= 90.0:
                hum_pts = 5.0 + ((safe_humidity - 84.0) / 6.0) * 3.0
            else:
                hum_pts = min(12.0, 8.0 + ((safe_humidity - 90.0) / 10.0) * 4.0)
            hum_pts = round(hum_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Atmospheric relative humidity",
                    description=f"Air moisture index at {safe_humidity:.1f}%",
                    value=f"{safe_humidity:.1f}%",
                    points_contributed=hum_pts,
                    max_points=FLOOD_CONFIG["humidity"]["max_points"],
                )
            )
            if safe_humidity >= 84.0:
                summaries.append(f"High atmospheric humidity ({safe_humidity:.0f}%)")

            # 5. Wind Speed Contribution (0 - 8 points)
            if safe_wind < 7.0:
                wind_pts = (safe_wind / 7.0) * 1.5
            elif safe_wind <= 20.0:
                wind_pts = 1.5 + ((safe_wind - 7.0) / 13.0) * 3.5
            else:
                wind_pts = min(8.0, 5.0 + ((safe_wind - 20.0) / 20.0) * 3.0)
            wind_pts = round(wind_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Surface wind velocity",
                    description=f"Sustained wind speed of {safe_wind:.1f} km/h",
                    value=f"{safe_wind:.1f} km/h",
                    points_contributed=wind_pts,
                    max_points=FLOOD_CONFIG["wind"]["max_points"],
                )
            )
            if safe_wind >= 15.0:
                summaries.append(f"Strong surface winds ({safe_wind:.1f} km/h)")

            raw_total = ml_pts + precip_pts + soil_pts + hum_pts + wind_pts
            weights_used = {k: v["max_points"] for k, v in FLOOD_CONFIG.items()}

        else:
            # HEATWAVE SCORING
            heat_index = safe_temp + 0.33 * safe_humidity - 0.7

            # 1. ML Probability Contribution (0 - 35 points)
            ml_pts = round(safe_prob * HEATWAVE_CONFIG["ml_prob"]["max_points"], 1)
            factors.append(
                ContributingFactor(
                    factor="ML danger probability",
                    description=f"Model heatwave classification probability of {safe_prob:.2f}",
                    value=safe_prob,
                    points_contributed=ml_pts,
                    max_points=HEATWAVE_CONFIG["ml_prob"]["max_points"],
                )
            )
            if safe_prob >= 0.5:
                summaries.append(f"ML danger probability ({int(safe_prob * 100)}%)")

            # 2. Temperature Contribution (0 - 35 points)
            # Thresholds: < 35°C -> 0-8 pts; 35-42°C -> 9-22 pts; > 42°C -> 23-35 pts
            if safe_temp < 32.0:
                temp_pts = max(0.0, (safe_temp / 32.0) * 5.0)
            elif safe_temp < 35.0:
                temp_pts = 5.0 + ((safe_temp - 32.0) / 3.0) * 3.0
            elif safe_temp < 42.0:
                temp_pts = 8.0 + ((safe_temp - 35.0) / 7.0) * 14.0
            else:
                temp_pts = min(35.0, 22.0 + ((safe_temp - 42.0) / 6.0) * 13.0)
            temp_pts = round(temp_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Ambient temperature",
                    description=f"Extreme dry bulb temperature at {safe_temp:.1f}°C",
                    value=f"{safe_temp:.1f}°C",
                    points_contributed=temp_pts,
                    max_points=HEATWAVE_CONFIG["temperature"]["max_points"],
                )
            )
            if safe_temp >= 35.0:
                summaries.append(
                    f"{'Extreme' if safe_temp >= 42.0 else 'Elevated'} ambient temperature ({safe_temp:.1f}°C)"
                )

            # 3. Heat Index Contribution (0 - 20 points)
            if heat_index < 35.0:
                hi_pts = 2.0
            elif heat_index < 42.0:
                hi_pts = 3.0 + ((heat_index - 35.0) / 7.0) * 7.0
            elif heat_index < 50.0:
                hi_pts = 10.0 + ((heat_index - 42.0) / 8.0) * 7.0
            else:
                hi_pts = min(20.0, 17.0 + ((heat_index - 50.0) / 10.0) * 3.0)
            hi_pts = round(hi_pts, 1)

            factors.append(
                ContributingFactor(
                    factor="Heat Index (HI)",
                    description=f"Apparent thermal stress index of {heat_index:.1f}°C",
                    value=f"{heat_index:.1f}°C",
                    points_contributed=hi_pts,
                    max_points=HEATWAVE_CONFIG["heat_index"]["max_points"],
                )
            )
            if heat_index >= 40.0:
                summaries.append(f"Severe apparent Heat Index ({heat_index:.1f}°C)")

            # 4. Aridity / Wind Contribution (0 - 10 points)
            arid_pts = min(10.0, round((safe_wind / 20.0) * 5.0 + max(0.0, (40.0 - safe_humidity) / 10.0), 1))
            factors.append(
                ContributingFactor(
                    factor="Atmospheric Aridity",
                    description=f"Dry convective conditions (humidity {safe_humidity:.0f}%, wind {safe_wind:.1f} km/h)",
                    value=f"Hum {safe_humidity:.0f}% / Wind {safe_wind:.1f} km/h",
                    points_contributed=arid_pts,
                    max_points=HEATWAVE_CONFIG["wind_arid"]["max_points"],
                )
            )
            if safe_humidity <= 30.0:
                summaries.append(f"Low relative humidity ({safe_humidity:.0f}%) creating rapid dehydration")

            raw_total = ml_pts + temp_pts + hi_pts + arid_pts
            weights_used = {k: v["max_points"] for k, v in HEATWAVE_CONFIG.items()}

        final_score = int(round(max(0.0, min(100.0, raw_total))))
        risk_level = cls.get_risk_level(final_score)
        action = cls.get_recommended_action(risk_level, norm_disaster)

        if not summaries:
            summaries.append("All observed environmental indicators within nominal baseline")

        return HyperlocalRiskAssessment(
            location=location,
            disaster_type=norm_disaster,
            risk_score=final_score,
            risk_level=risk_level,
            contributing_factors=factors,
            factor_summaries=summaries,
            recommended_action=action,
            explicit_weights=weights_used,
        )
