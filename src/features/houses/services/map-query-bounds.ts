export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapBounds = {
  max_lat: number;
  max_lng: number;
  min_lat: number;
  min_lng: number;
};

const INDIVIDUAL_HOUSE_VIEWPORT_DELTA = 0.25;

export function shouldAutomaticallyShowGlow(region: MapRegion) {
  return (
    region.latitudeDelta > INDIVIDUAL_HOUSE_VIEWPORT_DELTA ||
    region.longitudeDelta > INDIVIDUAL_HOUSE_VIEWPORT_DELTA
  );
}

export function getMapBounds(
  region: MapRegion,
  maximumViewportDelta: number,
  requirePositiveDelta = true,
): MapBounds | null {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitudeDelta) ||
    !Number.isFinite(longitudeDelta) ||
    (requirePositiveDelta && (latitudeDelta <= 0 || longitudeDelta <= 0)) ||
    latitudeDelta > maximumViewportDelta ||
    longitudeDelta > maximumViewportDelta
  ) {
    return null;
  }

  const min_lat = latitude - latitudeDelta / 2;
  const max_lat = latitude + latitudeDelta / 2;
  const min_lng = longitude - longitudeDelta / 2;
  const max_lng = longitude + longitudeDelta / 2;

  if (min_lat < -90 || max_lat > 90 || min_lng < -180 || max_lng > 180) {
    return null;
  }

  return { min_lat, min_lng, max_lat, max_lng };
}
