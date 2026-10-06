# API Documentation

## Guardians of Disasters — External APIs Used

---

## 1. Open-Meteo Weather API

**Purpose**: Fetches real-time weather data for each location.

**Base URL**: `https://api.open-meteo.com/v1/forecast`

**No API key required.**

### Parameters Used

| Parameter | Description |
|---|---|
| `latitude` | Location latitude |
| `longitude` | Location longitude |
| `current_weather` | Current temperature and wind speed |
| `hourly=relative_humidity_2m` | Relative humidity at 2m height |
| `hourly=soil_moisture_1_to_3cm` | Soil moisture at 1–3cm depth |
| `hourly=precipitation` | Hourly precipitation |

### Example Request
```python
url = (
    f"https://api.open-meteo.com/v1/forecast"
    f"?latitude={lat}&longitude={lon}"
    f"&current_weather=true"
    f"&hourly=relative_humidity_2m,soil_moisture_1_to_3cm,precipitation"
)
response = requests.get(url)
```

### Response Fields Used
```python
{
  "current_weather": {
    "temperature": 28.5,
    "windspeed": 42.0
  },
  "hourly": {
    "precipitation": [...],
    "relative_humidity_2m": [...],
    "soil_moisture_1_to_3cm": [...]
  }
}
```

---

## 2. OpenRouteService (ORS) API

**Purpose**: Generates real-road routing between danger zones and relief camps.

**Docs**: https://openrouteservice.org/dev/#/api-docs

**Requires API key** → Set as environment variable `ORS_API_KEY`

### Setup
```python
import os
import openrouteservice

client = openrouteservice.Client(
    key=os.environ.get('ORS_API_KEY', 'YOUR_ORS_API_KEY')
)
```

### Usage in Project
```python
coords = [(start_lon, start_lat), (end_lon, end_lat)]
route = client.directions(coords)

geometry = route['routes'][0]['geometry']
distance = route['routes'][0]['summary']['distance']   # metres
duration = route['routes'][0]['summary']['duration']   # seconds
```

### Getting a Free API Key
1. Go to https://openrouteservice.org/
2. Sign up for a free account
3. Generate an API key from the dashboard
4. Free tier: 2,000 requests/day

---

## 3. Deep Translator (Google Translate)

**Purpose**: Translates map popup text into 13 Indian languages.

**Library**: `deep-translator`

**No API key required** for basic usage.

### Languages Supported in This Project

| Language | Code |
|---|---|
| English | en |
| Hindi | hi |
| Tamil | ta |
| Telugu | te |
| Kannada | kn |
| Malayalam | ml |
| Bengali | bn |
| Marathi | mr |
| Gujarati | gu |
| Punjabi | pa |
| Urdu | ur |
| Assamese | as |
| Odia | or |

### Usage
```python
from deep_translator import GoogleTranslator

translated = GoogleTranslator(
    source='en', target='hi'
).translate("Danger Zone")
# Output: "खतरनाक क्षेत्र"
```

---

## 4. Twilio SMS API

**Purpose**: Sends automated SMS alerts with map links to affected users.

**Docs**: https://www.twilio.com/docs/sms

**Requires credentials** → Set as environment variables.

### Environment Variables Required
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_NUMBER=+1XXXXXXXXXX
RECIPIENT_NUMBER=+91XXXXXXXXXX
```

### Setup
```python
import os
from twilio.rest import Client

account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
auth_token  = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_number = os.environ.get('TWILIO_NUMBER')
to_number   = os.environ.get('RECIPIENT_NUMBER')

client = Client(account_sid, auth_token)
```

### Sending an Alert
```python
message = client.messages.create(
    body="🚨 Disaster Alert! Check map: https://your-github-pages-url/flood_map.html",
    from_=twilio_number,
    to=to_number
)
print(f"SMS sent: {message.sid}")
```

### Getting Free Twilio Credentials
1. Sign up at https://www.twilio.com/try-twilio
2. Get a free trial number
3. Verify a recipient number (required on trial)
4. Note your Account SID and Auth Token from the dashboard

---

## Security Notes

> ⚠️ **NEVER commit API keys or credentials to GitHub.**

Use Google Colab Secrets (recommended):
```python
from google.colab import userdata
account_sid = userdata.get('TWILIO_ACCOUNT_SID')
```

Or use environment variables:
```python
import os
account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
```
