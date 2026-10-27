export type RegistrationLegalAcknowledgments = {
  acceptsPrivacyPolicy: boolean;
  acceptsTerms: boolean;
  confirmsAtLeast13: boolean;
};

export type HousePublishingConsent = {
  confirmsAtLeast18: boolean;
  confirmsPublishingAuthorization: boolean;
};

export function getRegistrationAcknowledgmentError({
  acceptsPrivacyPolicy,
  acceptsTerms,
  confirmsAtLeast13,
}: RegistrationLegalAcknowledgments) {
  if (!confirmsAtLeast13) {
    return 'Confirm that you are at least 13 years old to create an account.';
  }

  if (!acceptsTerms || !acceptsPrivacyPolicy) {
    return 'Review and acknowledge both the Terms of Service and Privacy Policy to create an account.';
  }

  return null;
}

export function getHousePublishingConsentError({
  confirmsAtLeast18,
  confirmsPublishingAuthorization,
}: HousePublishingConsent) {
  if (!confirmsAtLeast18) {
    return 'Confirm that you are at least 18 years old before publishing a residential listing.';
  }

  if (!confirmsPublishingAuthorization) {
    return 'Confirm that you are authorized to publish this residential location before saving your listing.';
  }

  return null;
}
