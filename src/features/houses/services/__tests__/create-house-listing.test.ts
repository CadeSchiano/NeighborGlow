import { supabase } from '@/services/supabase/client';

import { saveHouseListing } from '../create-house-listing';

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const from = supabase.from as jest.Mock;

const validNewListing = {
  accessible: false,
  allergyFriendly: false,
  decorated: true,
  endsAt: '20:00:00',
  haunted: false,
  latitude: 40.4406,
  longitude: -79.9959,
  nonCandy: false,
  ownerId: 'owner-1',
  startsAt: '17:00:00',
};

describe('saveHouseListing homeowner consent', () => {
  beforeEach(() => {
    from.mockReset();
  });

  it('does not create a new listing without the 18+ confirmation', async () => {
    await expect(saveHouseListing({
      ...validNewListing,
      publishingConsent: {
        confirmsAtLeast18: false,
        confirmsPublishingAuthorization: true,
      },
    })).rejects.toThrow('at least 18');

    expect(from).not.toHaveBeenCalled();
  });

  it('does not create a new listing without authorization to publish the location', async () => {
    await expect(saveHouseListing({
      ...validNewListing,
      publishingConsent: {
        confirmsAtLeast18: true,
        confirmsPublishingAuthorization: false,
      },
    })).rejects.toThrow('authorized to publish');

    expect(from).not.toHaveBeenCalled();
  });

  it('requires explicit consent even when another client-side caller omits it', async () => {
    await expect(saveHouseListing(validNewListing)).rejects.toThrow('at least 18');

    expect(from).not.toHaveBeenCalled();
  });

  it('creates a listing after both consent confirmations', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });

    await expect(saveHouseListing({
      ...validNewListing,
      publishingConsent: {
        confirmsAtLeast18: true,
        confirmsPublishingAuthorization: true,
      },
    })).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith('houses');
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('allows an owner to update an existing listing without repeating first-publication consent', async () => {
    const ownerEq = jest.fn().mockResolvedValue({ error: null });
    const idEq = jest.fn().mockReturnValue({ eq: ownerEq });
    const update = jest.fn().mockReturnValue({ eq: idEq });
    from.mockReturnValue({ update });

    await expect(saveHouseListing({
      ...validNewListing,
      houseId: 'house-1',
    })).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledTimes(1);
    expect(idEq).toHaveBeenCalledWith('id', 'house-1');
    expect(ownerEq).toHaveBeenCalledWith('owner_id', 'owner-1');
  });
});
