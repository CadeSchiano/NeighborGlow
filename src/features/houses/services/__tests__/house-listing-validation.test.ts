import { hasValidHouseCoordinates } from '../house-listing-validation';

describe('hasValidHouseCoordinates', () => {
  it('accepts valid latitude and longitude values', () => {
    expect(hasValidHouseCoordinates(40.4406, -79.9959)).toBe(true);
    expect(hasValidHouseCoordinates(-90, -180)).toBe(true);
    expect(hasValidHouseCoordinates(90, 180)).toBe(true);
  });

  it('rejects coordinates outside the world or non-numeric values', () => {
    expect(hasValidHouseCoordinates(90.01, 0)).toBe(false);
    expect(hasValidHouseCoordinates(0, -180.01)).toBe(false);
    expect(hasValidHouseCoordinates(Number.NaN, 0)).toBe(false);
  });
});
