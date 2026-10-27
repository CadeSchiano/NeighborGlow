type DatabaseErrorFields = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[^\s,;]+/gi;
const MAX_DIAGNOSTIC_LENGTH = 500;

function sanitizeDiagnostic(value: unknown) {
  if (typeof value !== 'string') return null;
  return value
    .replace(UUID_PATTERN, '[redacted-uuid]')
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}

/**
 * Keeps database diagnostics useful without putting webhook or customer data
 * into Edge Function logs. Only the standard PostgREST/PostgreSQL fields are
 * considered; arbitrary error properties are deliberately ignored.
 */
export function getSanitizedDatabaseError(error: unknown) {
  const fields = (error && typeof error === 'object' ? error : {}) as DatabaseErrorFields;
  return {
    code: sanitizeDiagnostic(fields.code),
    message: sanitizeDiagnostic(fields.message),
    details: sanitizeDiagnostic(fields.details),
    hint: sanitizeDiagnostic(fields.hint),
  };
}
