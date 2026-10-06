import { ReliefCamp, EvacuationRoute } from '../types/disaster';

/**
 * Great-circle distance using Haversine formula (accurate equivalent of geodesic in kilometers)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Finds nearest relief camp from a danger location
 */
export function findNearestReliefCamp(
  lat: number,
  lon: number,
  reliefCamps: ReliefCamp[]
): { camp: ReliefCamp; distanceKm: number; durationMin: number } | null {
  if (reliefCamps.length === 0) return null;

  let nearestCamp: ReliefCamp = reliefCamps[0];
  let minDistance = calculateDistanceKm(lat, lon, reliefCamps[0].lat, reliefCamps[0].lon);

  for (let i = 1; i < reliefCamps.length; i++) {
    const dist = calculateDistanceKm(lat, lon, reliefCamps[i].lat, reliefCamps[i].lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCamp = reliefCamps[i];
    }
  }

  // Estimated driving/evacuation speed: 30 km/h in disaster conditions + 2 min buffer
  const durationMin = Number(((minDistance / 30) * 60 + 2).toFixed(1));

  return {
    camp: nearestCamp,
    distanceKm: minDistance,
    durationMin,
  };
}

/**
 * Finds top-N nearest danger zones from a safe zone
 */
export function findNearestDangerZones(
  lat: number,
  lon: number,
  dangerZones: { name: string; lat: number; lon: number }[],
  limit = 3
): { name: string; lat: number; lon: number; distanceKm: number }[] {
  return dangerZones
    .map((dz) => ({
      ...dz,
      distanceKm: calculateDistanceKm(lat, lon, dz.lat, dz.lon),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Generates evacuation routes for danger zones and nearby risk routes for safe zones
 */
export function buildEvacuationRoutes(
  dangerZones: { name: string; lat: number; lon: number }[],
  safeZones: { name: string; lat: number; lon: number }[],
  reliefCamps: ReliefCamp[]
): EvacuationRoute[] {
  const routes: EvacuationRoute[] = [];

  // 1. Danger Zone -> Nearest Relief Camp (Blue routes)
  dangerZones.forEach((dz) => {
    const nearest = findNearestReliefCamp(dz.lat, dz.lon, reliefCamps);
    if (nearest) {
      routes.push({
        fromLocation: dz.name,
        fromCoords: [dz.lat, dz.lon],
        toLocation: nearest.camp.name,
        toCoords: [nearest.camp.lat, nearest.camp.lon],
        distanceKm: nearest.distanceKm,
        durationMin: nearest.durationMin,
        type: 'danger-to-camp',
        color: '#2563eb', // Blue
      });
    }
  });

  // 2. Safe Zone -> 3 Nearest Danger Zones (Purple routes)
  safeZones.forEach((sz) => {
    const nearestDangers = findNearestDangerZones(sz.lat, sz.lon, dangerZones, 3);
    nearestDangers.forEach((nd) => {
      routes.push({
        fromLocation: sz.name,
        fromCoords: [sz.lat, sz.lon],
        toLocation: nd.name,
        toCoords: [nd.lat, nd.lon],
        distanceKm: nd.distanceKm,
        durationMin: Number(((nd.distanceKm / 40) * 60).toFixed(1)),
        type: 'safe-to-danger',
        color: '#9333ea', // Purple
      });
    });
  });

  return routes;
}
