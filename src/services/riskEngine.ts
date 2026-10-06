import {
  DisasterType,
  WeatherData,
  HyperlocalRiskAssessment,
  HyperlocalRiskLevel,
  RiskContributingFactor,
} from '../types/disaster';

export function getRiskLevelFromScore(score: number): HyperlocalRiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

export function evaluateHyperlocalRisk(
  location: string,
  disasterType: DisasterType,
  mlProbability: number,
  weather: WeatherData
): HyperlocalRiskAssessment {
  const isFlood = disasterType === 'flood';
  const factors: RiskContributingFactor[] = [];
  const summaries: string[] = [];

  const safeProb = Math.max(0, Math.min(1, mlProbability));
  const safePrecip = Math.max(0, weather.precipitation);
  const safeWind = Math.max(0, weather.windSpeed);
  const safeHumidity = Math.max(0, Math.min(100, weather.humidity));
  const safeSoil = Math.max(0, Math.min(1, weather.soilMoisture));
  const safeTemp = weather.temperature;

  let rawTotal = 0;

  if (isFlood) {
    // 1. ML Probability (0 - 35 points)
    const mlPts = Number((safeProb * 35).toFixed(1));
    factors.push({
      factor: 'ML danger probability',
      description: `Model classification probability of ${(safeProb * 100).toFixed(0)}%`,
      value: `${(safeProb * 100).toFixed(0)}%`,
      points: mlPts,
      maxPoints: 35,
    });
    if (safeProb >= 0.5) {
      summaries.push(`ML danger probability (${(safeProb * 100).toFixed(0)}%)`);
    }

    // 2. Precipitation (0 - 25 points)
    let precipPts = 0;
    if (safePrecip <= 0.5) precipPts = 0;
    else if (safePrecip < 3.0) precipPts = 3 + (safePrecip / 3) * 4;
    else if (safePrecip <= 7.0) precipPts = 8 + ((safePrecip - 3) / 4) * 10;
    else precipPts = Math.min(25, 18 + ((safePrecip - 7) / 10) * 7);
    precipPts = Number(precipPts.toFixed(1));

    factors.push({
      factor: 'Precipitation accumulation',
      description: `Hourly rainfall of ${safePrecip.toFixed(1)} mm`,
      value: `${safePrecip.toFixed(1)} mm`,
      points: precipPts,
      maxPoints: 25,
    });
    if (safePrecip >= 3.0) {
      summaries.push(`${safePrecip >= 7.0 ? 'Torrential' : 'Moderate'} precipitation (${safePrecip.toFixed(1)} mm)`);
    }

    // 3. Soil Moisture (0 - 20 points)
    let soilPts = 0;
    if (safeSoil < 0.25) soilPts = (safeSoil / 0.25) * 3;
    else if (safeSoil <= 0.35) soilPts = 3 + ((safeSoil - 0.25) / 0.1) * 3;
    else if (safeSoil <= 0.5) soilPts = 6 + ((safeSoil - 0.35) / 0.15) * 7;
    else soilPts = Math.min(20, 13 + ((safeSoil - 0.5) / 0.2) * 7);
    soilPts = Number(soilPts.toFixed(1));

    factors.push({
      factor: 'Soil moisture saturation',
      description: `Ground saturation at ${safeSoil.toFixed(2)} m³/m³`,
      value: `${safeSoil.toFixed(2)} m³/m³`,
      points: soilPts,
      maxPoints: 20,
    });
    if (safeSoil >= 0.35) {
      summaries.push(`${safeSoil >= 0.5 ? 'Saturated' : 'Elevated'} soil moisture (${safeSoil.toFixed(2)} m³/m³)`);
    }

    // 4. Relative Humidity (0 - 12 points)
    let humPts = 0;
    if (safeHumidity < 70) humPts = (safeHumidity / 70) * 2;
    else if (safeHumidity <= 84) humPts = 2 + ((safeHumidity - 70) / 14) * 3;
    else if (safeHumidity <= 90) humPts = 5 + ((safeHumidity - 84) / 6) * 3;
    else humPts = Math.min(12, 8 + ((safeHumidity - 90) / 10) * 4);
    humPts = Number(humPts.toFixed(1));

    factors.push({
      factor: 'Atmospheric humidity',
      description: `Relative air moisture at ${safeHumidity.toFixed(0)}%`,
      value: `${safeHumidity.toFixed(0)}%`,
      points: humPts,
      maxPoints: 12,
    });
    if (safeHumidity >= 84) {
      summaries.push(`High atmospheric humidity (${safeHumidity.toFixed(0)}%)`);
    }

    // 5. Wind Speed (0 - 8 points)
    let windPts = 0;
    if (safeWind < 7) windPts = (safeWind / 7) * 1.5;
    else if (safeWind <= 20) windPts = 1.5 + ((safeWind - 7) / 13) * 3.5;
    else windPts = Math.min(8, 5 + ((safeWind - 20) / 20) * 3);
    windPts = Number(windPts.toFixed(1));

    factors.push({
      factor: 'Surface wind velocity',
      description: `Sustained wind at ${safeWind.toFixed(1)} km/h`,
      value: `${safeWind.toFixed(1)} km/h`,
      points: windPts,
      maxPoints: 8,
    });
    if (safeWind >= 15) {
      summaries.push(`Strong surface winds (${safeWind.toFixed(1)} km/h)`);
    }

    rawTotal = mlPts + precipPts + soilPts + humPts + windPts;
  } else {
    // Heatwave
    const heatIndex = safeTemp + 0.33 * safeHumidity - 0.7;

    // 1. ML Probability (0 - 35 points)
    const mlPts = Number((safeProb * 35).toFixed(1));
    factors.push({
      factor: 'ML danger probability',
      description: `Model heatwave probability of ${(safeProb * 100).toFixed(0)}%`,
      value: `${(safeProb * 100).toFixed(0)}%`,
      points: mlPts,
      maxPoints: 35,
    });
    if (safeProb >= 0.5) {
      summaries.push(`ML danger probability (${(safeProb * 100).toFixed(0)}%)`);
    }

    // 2. Temperature (0 - 35 points)
    let tempPts = 0;
    if (safeTemp < 32) tempPts = Math.max(0, (safeTemp / 32) * 5);
    else if (safeTemp < 35) tempPts = 5 + ((safeTemp - 32) / 3) * 3;
    else if (safeTemp < 42) tempPts = 8 + ((safeTemp - 35) / 7) * 14;
    else tempPts = Math.min(35, 22 + ((safeTemp - 42) / 6) * 13);
    tempPts = Number(tempPts.toFixed(1));

    factors.push({
      factor: 'Ambient temperature',
      description: `Dry bulb temperature at ${safeTemp.toFixed(1)}°C`,
      value: `${safeTemp.toFixed(1)}°C`,
      points: tempPts,
      maxPoints: 35,
    });
    if (safeTemp >= 35) {
      summaries.push(`${safeTemp >= 42 ? 'Extreme' : 'Elevated'} ambient temperature (${safeTemp.toFixed(1)}°C)`);
    }

    // 3. Heat Index (0 - 20 points)
    let hiPts = 0;
    if (heatIndex < 35) hiPts = 2;
    else if (heatIndex < 42) hiPts = 3 + ((heatIndex - 35) / 7) * 7;
    else if (heatIndex < 50) hiPts = 10 + ((heatIndex - 42) / 8) * 7;
    else hiPts = Math.min(20, 17 + ((heatIndex - 50) / 10) * 3);
    hiPts = Number(hiPts.toFixed(1));

    factors.push({
      factor: 'Heat Index (HI)',
      description: `Apparent thermal stress index of ${heatIndex.toFixed(1)}°C`,
      value: `${heatIndex.toFixed(1)}°C`,
      points: hiPts,
      maxPoints: 20,
    });
    if (heatIndex >= 40) {
      summaries.push(`Severe apparent Heat Index (${heatIndex.toFixed(1)}°C)`);
    }

    // 4. Aridity / Wind (0 - 10 points)
    const aridPts = Number(Math.min(10, (safeWind / 20) * 5 + Math.max(0, (40 - safeHumidity) / 10)).toFixed(1));
    factors.push({
      factor: 'Atmospheric aridity',
      description: `Dry convective condition (humidity ${safeHumidity.toFixed(0)}%, wind ${safeWind.toFixed(1)} km/h)`,
      value: `Hum ${safeHumidity.toFixed(0)}% / Wind ${safeWind.toFixed(1)} km/h`,
      points: aridPts,
      maxPoints: 10,
    });
    if (safeHumidity <= 30) {
      summaries.push(`Low relative humidity (${safeHumidity.toFixed(0)}%) accelerating thermal distress`);
    }

    rawTotal = mlPts + tempPts + hiPts + aridPts;
  }

  const riskScore = Math.round(Math.max(0, Math.min(100, rawTotal)));
  const riskLevel = getRiskLevelFromScore(riskScore);

  let recommendedAction = '';
  if (riskLevel === 'LOW') {
    recommendedAction = 'Conditions nominal. Continue routine monitoring and stay tuned to local meteorological advisories.';
  } else if (riskLevel === 'MODERATE') {
    recommendedAction = isFlood
      ? 'Advisory alert. Inspect local drainage channels, secure livestock, and identify nearest relief shelter.'
      : 'Thermal advisory. Limit unshaded outdoor exertion, maintain continuous hydration, and avoid peak noon sun.';
  } else if (riskLevel === 'HIGH') {
    recommendedAction = isFlood
      ? 'Severe flood warning. High likelihood of inundation. Prepare emergency go-kit and ready family for evacuation.'
      : 'Severe heatwave warning. Hazardous thermal conditions. Suspend outdoor physical labor; seek designated cool relief shelter.';
  } else {
    // CRITICAL
    recommendedAction = isFlood
      ? 'CRITICAL EMERGENCY: Immediate evacuation advised. Move along designated blue route to assigned relief shelter immediately.'
      : 'CRITICAL THERMAL CRISIS: Life-threatening heat hazard. Move to cooled shelter immediately; medical standby.';
  }

  if (summaries.length === 0) {
    summaries.push('All observed environmental indicators within nominal baseline');
  }

  return {
    riskScore,
    riskLevel,
    contributingFactors: factors,
    factorSummaries: summaries,
    recommendedAction,
  };
}
