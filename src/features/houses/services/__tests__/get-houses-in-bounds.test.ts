import { getMapBounds } from '../map-query-bounds';

describe('house map query bounds', () => {
  it('returns bounds for a valid close map viewport', () => {
    expect(
      getMapBounds({
        latitude: 40,
        longitude: -75,
        latitudeDelta: 0.1,
        longitudeDelta: 0.2,
      }, 0.25),
    ).toEqual({
      min_lat: 39.95,
      max_lat: 40.05,
      min_lng: -75.1,
      max_lng: -74.9,
    });
  });

  it('rejects broad or invalid viewports before requesting house locations', () => {
    expect(
      getMapBounds({ latitude: 40, longitude: -75, latitudeDelta: 0.26, longitudeDelta: 0.1 }, 0.25),
    ).toBeNull();
    expect(
      getMapBounds({ latitude: 40, longitude: -75, latitudeDelta: 0, longitudeDelta: 0.1 }, 0.25),
    ).toBeNull();
    expect(
      getMapBounds({ latitude: 90, longitude: 0, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 0.25),
    ).toBeNull();
  });
});
