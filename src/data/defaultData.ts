import { LocationEntry, ReliefCamp, SupportedLanguage, LanguageOption } from '../types/disaster';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

export const KERALA_LOCATIONS: LocationEntry[] = [
  { id: 'kl-1', name: 'Thennala', lat: 11.1000, lon: 76.1000, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-2', name: 'Kottakkal', lat: 10.9750, lon: 76.1400, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-3', name: 'Nilambur', lat: 11.2800, lon: 76.2200, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-4', name: 'Manjeri', lat: 11.1200, lon: 76.1300, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-5', name: 'Eranad', lat: 11.1000, lon: 76.3000, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-6', name: 'Tirur', lat: 10.9200, lon: 75.9300, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-7', name: 'Tirurangadi', lat: 10.9600, lon: 75.9900, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-8', name: 'Ponnani', lat: 10.7667, lon: 75.9500, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-9', name: 'Kondotty', lat: 11.0667, lon: 76.0800, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-10', name: 'Mankada', lat: 11.0500, lon: 76.2200, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-11', name: 'Malappuram Town', lat: 11.0700, lon: 76.0700, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-12', name: 'Kuttippuram', lat: 10.9500, lon: 76.0800, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-13', name: 'Pulikkal', lat: 11.1400, lon: 76.1600, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-14', name: 'Valanchery', lat: 10.9817, lon: 76.2600, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
  { id: 'kl-15', name: 'Karipur', lat: 11.1100, lon: 76.0800, state: 'Kerala', district: 'Malappuram', disasterType: 'flood' },
];

export const ASSAM_LOCATIONS: LocationEntry[] = [
  { id: 'as-1', name: 'Dhubri Town', lat: 26.0186, lon: 89.9856, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-2', name: 'Gauripur', lat: 26.0900, lon: 89.9500, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-3', name: 'Bilasipara', lat: 26.2400, lon: 90.2500, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-4', name: 'Golokganj', lat: 26.1200, lon: 89.8000, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-5', name: 'Agomoni', lat: 26.2600, lon: 89.7000, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-6', name: 'South Salmara', lat: 25.9200, lon: 89.8500, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-7', name: 'Mankachar', lat: 25.9100, lon: 89.8200, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
  { id: 'as-8', name: 'Rupsi', lat: 26.1600, lon: 89.8500, state: 'Assam', district: 'Dhubri', disasterType: 'flood' },
];

export const BIHAR_LOCATIONS: LocationEntry[] = [
  { id: 'bh-1', name: 'Patna', lat: 25.5941, lon: 85.1376, state: 'Bihar', district: 'Patna', disasterType: 'heatwave' },
  { id: 'bh-2', name: 'Gaya', lat: 24.7914, lon: 85.0002, state: 'Bihar', district: 'Gaya', disasterType: 'heatwave' },
  { id: 'bh-3', name: 'Bhagalpur', lat: 25.2425, lon: 86.9842, state: 'Bihar', district: 'Bhagalpur', disasterType: 'heatwave' },
  { id: 'bh-4', name: 'Muzaffarpur', lat: 26.1209, lon: 85.3647, state: 'Bihar', district: 'Muzaffarpur', disasterType: 'heatwave' },
  { id: 'bh-5', name: 'Darbhanga', lat: 26.1542, lon: 85.8918, state: 'Bihar', district: 'Darbhanga', disasterType: 'heatwave' },
  { id: 'bh-6', name: 'Purnia', lat: 25.7771, lon: 87.4753, state: 'Bihar', district: 'Purnia', disasterType: 'heatwave' },
  { id: 'bh-7', name: 'Katihar', lat: 25.5420, lon: 87.5616, state: 'Bihar', district: 'Katihar', disasterType: 'heatwave' },
  { id: 'bh-8', name: 'Arrah', lat: 25.5560, lon: 84.6633, state: 'Bihar', district: 'Bhojpur', disasterType: 'heatwave' },
  { id: 'bh-9', name: 'Begusarai', lat: 25.4182, lon: 86.1272, state: 'Bihar', district: 'Begusarai', disasterType: 'heatwave' },
  { id: 'bh-10', name: 'Chapra', lat: 25.7780, lon: 84.7470, state: 'Bihar', district: 'Saran', disasterType: 'heatwave' },
  { id: 'bh-11', name: 'Motihari', lat: 26.6486, lon: 84.9165, state: 'Bihar', district: 'East Champaran', disasterType: 'heatwave' },
  { id: 'bh-12', name: 'Sitamarhi', lat: 26.5960, lon: 85.4912, state: 'Bihar', district: 'Sitamarhi', disasterType: 'heatwave' },
  { id: 'bh-13', name: 'Saharsa', lat: 25.8809, lon: 86.5969, state: 'Bihar', district: 'Saharsa', disasterType: 'heatwave' },
  { id: 'bh-14', name: 'Madhubani', lat: 26.3480, lon: 86.0710, state: 'Bihar', district: 'Madhubani', disasterType: 'heatwave' },
  { id: 'bh-15', name: 'Buxar', lat: 25.5647, lon: 83.9784, state: 'Bihar', district: 'Buxar', disasterType: 'heatwave' },
  { id: 'bh-16', name: 'Samastipur', lat: 25.8620, lon: 85.7790, state: 'Bihar', district: 'Samastipur', disasterType: 'heatwave' },
];

export const HYDERABAD_LOCATIONS: LocationEntry[] = [
  { id: 'hyd-1', name: 'Hitech City', lat: 17.4435, lon: 78.3772, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-2', name: 'Gachibowli', lat: 17.4401, lon: 78.3489, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-3', name: 'Madhapur', lat: 17.4483, lon: 78.3915, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-4', name: 'Kukatpally', lat: 17.4948, lon: 78.3996, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-5', name: 'Ameerpet', lat: 17.4375, lon: 78.4482, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-6', name: 'Secunderabad', lat: 17.4399, lon: 78.4983, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-7', name: 'Banjara Hills', lat: 17.4126, lon: 78.4482, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-8', name: 'Jubilee Hills', lat: 17.4239, lon: 78.4738, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-9', name: 'Charminar', lat: 17.3616, lon: 78.4747, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-10', name: 'LB Nagar', lat: 17.3457, lon: 78.5520, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
  { id: 'hyd-11', name: 'Malkajgiri', lat: 17.4474, lon: 78.5266, state: 'Telangana', district: 'Hyderabad', disasterType: 'heatwave' },
];

/**
 * Formula from repository: shift 1000m north & 1000m east to avoid overlap
 */
export function shiftLocation(lat: number, lon: number, shiftMetersNorth = 1000, shiftMetersEast = 1000): [number, number] {
  const deltaLat = shiftMetersNorth / 111000;
  const deltaLon = shiftMetersEast / (111000 * Math.cos((lat * Math.PI) / 180));
  return [Number((lat + deltaLat).toFixed(6)), Number((lon + deltaLon).toFixed(6))];
}

export function generateReliefCampsForLocations(locations: LocationEntry[]): ReliefCamp[] {
  return locations.map((loc) => {
    const [shiftedLat, shiftedLon] = shiftLocation(loc.lat, loc.lon, 1000, 1000);
    return {
      id: `camp-${loc.id}`,
      name: `${loc.name} Relief Shelter`,
      lat: shiftedLat,
      lon: shiftedLon,
      type: 'Government School / Community Hall',
      capacity: 500,
      state: loc.state,
      assignedTo: loc.name,
    };
  });
}
