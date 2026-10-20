import { getMapBounds, shouldAutomaticallyShowGlow } from '../map-query-bounds';

describe('The Glow map guards', () => {
  it('allows a close viewport for an explicitly requested heatmap', () => {
    expect(
      getMapBounds({ latitude: 40, longitude: -75, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 40),
    ).toEqual({ min_lat: 39.975, max_lat: 40.025, min_lng: -75.025, max_lng: -74.975 });
  });

  it('only automatically shows the Glow at wider zoom levels', () => {
    expect(shouldAutomaticallyShowGlow({ latitude: 40, longitude: -75, latitudeDelta: 0.25, longitudeDelta: 0.25 })).toBe(
      false,
    );
    expect(shouldAutomaticallyShowGlow({ latitude: 40, longitude: -75, latitudeDelta: 0.26, longitudeDelta: 0.25 })).toBe(
      true,
    );
  });

  it('rejects invalid or excessively broad Glow queries', () => {
    expect(
      getMapBounds({ latitude: 40, longitude: -75, latitudeDelta: 40.1, longitudeDelta: 0.1 }, 40),
    ).toBeNull();
    expect(
      getMapBounds({ latitude: Number.NaN, longitude: -75, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 40),
    ).toBeNull();
  });
});
