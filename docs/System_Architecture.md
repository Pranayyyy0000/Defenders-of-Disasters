# System Architecture

## Guardians of Disasters — AI-Driven Emergency Response System

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUARDIANS OF DISASTERS                        │
│              AI-Driven Emergency Response System                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  INPUT LAYER     │    │  PROCESSING LAYER│    │  OUTPUT LAYER    │
│                  │    │                  │    │                  │
│ • GPS Coords     │───▶│ • Weather API    │───▶│ • Folium Map     │
│ • Location Data  │    │ • ML Models      │    │ • SMS Alerts     │
│ • Relief Camps   │    │ • Severity Score │    │ • HTML Export    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Component Architecture

### 1. Data Layer
| Component | Description |
|---|---|
| `locations.csv` | GPS coordinates for all monitored locations |
| `relief_camps.csv` | Government schools & public buildings as shelters |
| `sample_weather.csv` | Sample weather data for offline testing |

### 2. Weather Intelligence Layer
- **API**: Open-Meteo (free, no key required)
- **Parameters collected**: Wind Speed, Precipitation, Relative Humidity, Soil Moisture, Temperature
- **Heat Index Formula**: `HI = Temperature + (0.33 × Humidity) - 0.7`

### 3. Machine Learning Layer
| Model | Purpose | Algorithm |
|---|---|---|
| Flood Classifier | Safe vs Danger zone | Random Forest + Logistic Regression |
| Heatwave Classifier | Safe vs Heatwave zone | Random Forest + Logistic Regression |

**Features used for Flood:**
- Wind Speed, Precipitation, Relative Humidity, Soil Moisture

**Features used for Heatwave:**
- Temperature, Heat Index

### 4. Severity Scoring Layer
```
Flood Severity Score = wind_score + precipitation_score + humidity_score + soil_score

Score ≤ 2  →  LOW     (Orange)
Score ≤ 5  →  MEDIUM  (Pink/Dark Orange)
Score > 5  →  HIGH    (Red)
```

```
Heatwave Severity:
Temperature < 35°C  →  LOW
Temperature < 45°C  →  MEDIUM
Temperature ≥ 45°C  →  HIGH
```

### 5. GIS Visualization Layer
- **Library**: Folium (built on Leaflet.js)
- **Map Features**: CircleMarkers, PolyLines, Popups, MiniMap, MeasureControl
- **Color Coding**:
  - 🟢 Green = Safe Zone
  - 🔵 Blue = Relief Camp
  - 🟡 Yellow = Low Severity Danger
  - 🟠 Orange = Medium Severity Danger
  - 🔴 Red = High Severity Danger

### 6. Routing Layer
- **Service**: OpenRouteService API
- **Route Type 1**: Danger Zone → Nearest Relief Camp (Blue polyline)
- **Route Type 2**: Safe Zone → 3 Nearest Danger Zones (Purple polyline)
- **Distance Calculation**: Geopy geodesic distance

### 7. Communication Layer
- **Multilingual**: Deep Translator (Google Translate) — 13 Indian languages
- **SMS Alerts**: Twilio API — Flood alerts + Heatwave alerts (separate)
- **Map Hosting**: GitHub Pages

---

## Dual Pipeline Architecture

```
                    ┌─────────────────┐
                    │  Location Data  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼──────────┐
    │  FLOOD PIPELINE   │       │  HEATWAVE PIPELINE   │
    │                   │       │                       │
    │ Kerala / Assam    │       │ Bihar / Hyderabad     │
    │ Locations         │       │ Locations             │
    │                   │       │                       │
    │ Weather Params:   │       │ Weather Params:       │
    │ Wind, Rain,       │       │ Temperature,          │
    │ Humidity, Soil    │       │ Heat Index            │
    │                   │       │                       │
    │ Random Forest     │       │ Random Forest         │
    │ + Log. Regression │       │ + Log. Regression     │
    │                   │       │                       │
    │ → flood_map.html  │       │ → heatwave_map.html   │
    │ → Flood SMS       │       │ → Heatwave SMS        │
    └───────────────────┘       └───────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | Python 3.x |
| Platform | Google Colab |
| Data Processing | Pandas, NumPy |
| Machine Learning | Scikit-learn |
| GIS Mapping | Folium, Leaflet.js |
| Distance Calculation | Geopy |
| Routing | OpenRouteService |
| Weather | Open-Meteo API |
| Translation | Deep Translator |
| SMS | Twilio |
| Frontend | HTML, JavaScript, JSON |
| Hosting | GitHub Pages |
