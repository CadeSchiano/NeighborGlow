export function isUserCancelledPurchase(error: unknown) {
  return Boolean((error as { userCancelled?: boolean } | null)?.userCancelled);
}
