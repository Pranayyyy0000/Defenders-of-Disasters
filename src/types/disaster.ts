export type DisasterType = 'flood' | 'heatwave';

export type RegionKey = 'kerala' | 'assam' | 'bihar' | 'hyderabad' | 'custom';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'N/A';

export type MLPrediction = 'Safe' | 'Danger' | 'Heatwave';

export interface LocationEntry {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state: string;
  district: string;
  disasterType: DisasterType;
}

export interface ReliefCamp {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  capacity: number;
  state: string;
  assignedTo?: string;
  distanceKm?: number;
}

export interface WeatherData {
  temperature: number; // °C
  windSpeed: number; // km/h
  precipitation: number; // mm
  humidity: number; // %
  soilMoisture: number; // m³/m³
  heatIndex: number; // calculated HI
  isLive: boolean;
  timestamp: string;
}

export interface MonitoredZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state: string;
  district: string;
  disasterType: DisasterType;
  weather: WeatherData;
  mlPrediction: MLPrediction;
  severityScore: number;
  severityLevel: SeverityLevel;
  nearestCamp?: {
    camp: ReliefCamp;
    distanceKm: number;
    durationMin: number;
  };
  nearbyRisks?: {
    dangerZoneName: string;
    lat: number;
    lon: number;
    distanceKm: number;
  }[];
}

export interface EvacuationRoute {
  fromLocation: string;
  fromCoords: [number, number];
  toLocation: string;
  toCoords: [number, number];
  distanceKm: number;
  durationMin: number;
  type: 'danger-to-camp' | 'safe-to-danger';
  color: string;
}

export interface ModelMetrics {
  rfAccuracy: number;
  lrAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sampleCount: number;
  trainCount: number;
  testCount: number;
  randomState: number;
  safeCount: number;
  dangerCount: number;
  confusionMatrix: {
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
    truePositive: number;
  };
  classificationReport: {
    className: string;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }[];
  featureWeights: { feature: string; weight: number }[];
  thresholdUsed: number;
  isProxyLabel: boolean;
  disclaimer: string;
}

export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'as'
  | 'or';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export interface SMSAlertLog {
  id: string;
  timestamp: string;
  disasterType: DisasterType;
  recipient: string;
  message: string;
  status: 'delivered' | 'sent' | 'simulated';
  region: string;
  dangerZonesCount: number;
}
