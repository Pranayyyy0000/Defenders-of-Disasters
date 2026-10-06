import { WeatherData } from '../types/disaster';

export function calculateHeatIndex(temp: number, humidity: number): number {
  // Equation from notebook Cell 5: return temp + 0.33 * humidity - 0.7
  return Number((temp + 0.33 * humidity - 0.7).toFixed(2));
}

function cleanNumber(val: unknown, fallback: number, min?: number, max?: number): number {
  if (val === null || val === undefined || typeof val === 'boolean') return fallback;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return Number(num.toFixed(2));
}

function getLatestValidReading(arr: unknown[] | undefined, fallback: number): number {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return fallback;
  for (let i = arr.length - 1; i >= 0; i--) {
    const val = arr[i];
    if (val !== null && val !== undefined) {
      const cleaned = cleanNumber(val, NaN);
      if (!isNaN(cleaned)) return cleaned;
    }
  }
  return fallback;
}

// Deterministic offline fallback based on coordinates to simulate consistent test datasets
function getOfflineFallbackWeather(
  lat: number,
  lon: number,
  _locationName: string,
  disasterType: 'flood' | 'heatwave'
): WeatherData {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233)) * 1000;
  const isHighRisk = seed % 10 > 4;

  if (disasterType === 'flood') {
    const windSpeed = isHighRisk ? 22 + (seed % 18) : 6 + (seed % 8);
    const precipitation = isHighRisk ? 8.5 + (seed % 15) : 1.2 + (seed % 2.5);
    const humidity = isHighRisk ? 88 + (seed % 10) : 65 + (seed % 15);
    const soilMoisture = isHighRisk ? 0.52 + ((seed % 15) / 100) : 0.22 + ((seed % 10) / 100);
    const temperature = 24 + (seed % 6);
    return {
      temperature: Number(temperature.toFixed(1)),
      windSpeed: Number(windSpeed.toFixed(1)),
      precipitation: Number(precipitation.toFixed(1)),
      humidity: Number(humidity.toFixed(1)),
      soilMoisture: Number(soilMoisture.toFixed(2)),
      heatIndex: calculateHeatIndex(temperature, humidity),
      isLive: false,
      timestamp: new Date().toLocaleTimeString(),
    };
  } else {
    // Heatwave
    const temperature = isHighRisk ? 42 + (seed % 6) : 32 + (seed % 5);
    const humidity = 25 + (seed % 20);
    const windSpeed = 5 + (seed % 8);
    const precipitation = 0;
    const soilMoisture = 0.08 + ((seed % 6) / 100);
    return {
      temperature: Number(temperature.toFixed(1)),
      windSpeed: Number(windSpeed.toFixed(1)),
      precipitation,
      humidity: Number(humidity.toFixed(1)),
      soilMoisture: Number(soilMoisture.toFixed(2)),
      heatIndex: calculateHeatIndex(temperature, humidity),
      isLive: false,
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}

export async function fetchWeatherForLocation(
  lat: number,
  lon: number,
  locationName: string,
  disasterType: 'flood' | 'heatwave',
  forceSimulated = false
): Promise<WeatherData> {
  if (forceSimulated) {
    return getOfflineFallbackWeather(lat, lon, locationName, disasterType);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m,soil_moisture_1_to_3cm,precipitation`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current_weather || {};
    const hourly = data.hourly || {};

    // Validate and clean all 5 preserved parameters
    const temperature = cleanNumber(current.temperature, 28, -60, 65);
    const windSpeed = cleanNumber(current.windspeed, 10, 0, 300);
    const precipitation = Math.max(0, getLatestValidReading(hourly.precipitation, 0));
    const humidity = Math.min(100, Math.max(0, getLatestValidReading(hourly.relative_humidity_2m, 60)));
    const soilMoisture = Math.min(1, Math.max(0, getLatestValidReading(hourly.soil_moisture_1_to_3cm, 0.25)));

    return {
      temperature,
      windSpeed,
      precipitation,
      humidity,
      soilMoisture,
      heatIndex: calculateHeatIndex(temperature, humidity),
      isLive: true,
      timestamp: new Date().toLocaleTimeString(),
    };
  } catch (_err) {
    // Graceful fallback to meteorological model
    return getOfflineFallbackWeather(lat, lon, locationName, disasterType);
  }
}
