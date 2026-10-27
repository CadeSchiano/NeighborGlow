import {
  getHousePublishingConsentError,
  getRegistrationAcknowledgmentError,
} from '../legal-acknowledgments';

describe('registration legal acknowledgments', () => {
  it('requires the 13+ confirmation before account creation', () => {
    expect(getRegistrationAcknowledgmentError({
      acceptsPrivacyPolicy: true,
      acceptsTerms: true,
      confirmsAtLeast13: false,
    })).toContain('at least 13');
  });

  it('requires both legal-document acknowledgments before account creation', () => {
    expect(getRegistrationAcknowledgmentError({
      acceptsPrivacyPolicy: false,
      acceptsTerms: true,
      confirmsAtLeast13: true,
    })).toContain('Terms of Service and Privacy Policy');
    expect(getRegistrationAcknowledgmentError({
      acceptsPrivacyPolicy: true,
      acceptsTerms: false,
      confirmsAtLeast13: true,
    })).toContain('Terms of Service and Privacy Policy');
  });

  it('allows account creation only after every acknowledgment', () => {
    expect(getRegistrationAcknowledgmentError({
      acceptsPrivacyPolicy: true,
      acceptsTerms: true,
      confirmsAtLeast13: true,
    })).toBeNull();
  });
});

describe('house publishing consent', () => {
  it('requires a separate 18+ confirmation', () => {
    expect(getHousePublishingConsentError({
      confirmsAtLeast18: false,
      confirmsPublishingAuthorization: true,
    })).toContain('at least 18');
  });

  it('requires authorization to publish the residential location', () => {
    expect(getHousePublishingConsentError({
      confirmsAtLeast18: true,
      confirmsPublishingAuthorization: false,
    })).toContain('authorized to publish');
  });

  it('allows publishing only after both homeowner acknowledgments', () => {
    expect(getHousePublishingConsentError({
      confirmsAtLeast18: true,
      confirmsPublishingAuthorization: true,
    })).toBeNull();
  });
});
