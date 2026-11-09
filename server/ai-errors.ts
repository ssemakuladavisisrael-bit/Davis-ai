export type GeminiErrorCategory =
  | 'quota_exhausted'
  | 'rate_limited'
  | 'invalid_api_key'
  | 'permission_denied'
  | 'model_unavailable'
  | 'provider_overloaded'
  | 'network_error'
  | 'unknown';

export interface GeminiErrorClassification {
  category: GeminiErrorCategory;
  message: string;
  shouldFallback: boolean;
}

function collectErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as Record<string, unknown>;
  const parts = [value.message, value.status, value.statusText, value.code, value.name];
  if (value.error && typeof value.error === 'object') {
    const nested = value.error as Record<string, unknown>;
    parts.push(nested.message, nested.status, nested.code);
  } else {
    parts.push(value.error);
  }
  return parts.filter((part) => part !== undefined && part !== null).map(String).join(' ');
}

/**
 * Classifies provider failures so the API can explain the problem accurately
 * and avoid pointless model retries when a project-level quota is exhausted.
 */
export function classifyGeminiError(error: unknown): GeminiErrorClassification {
  const message = collectErrorText(error);
  const normalized = message.toLowerCase();
  const statusMatch = normalized.match(/(?:http\s*)?(\b4\d\d\b|\b5\d\d\b)/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;

  if (
    normalized.includes('resource_exhausted') ||
    normalized.includes('quota exceeded') ||
    normalized.includes('quota_exceeded') ||
    (status === 429 && (normalized.includes('quota') || normalized.includes('limit: 0')))
  ) {
    return {
      category: 'quota_exhausted',
      message: 'Davis AI has reached the current Gemini API quota for this Google AI project. This is a provider quota issue, not a problem with your message. Please check Google AI Studio rate limits and billing/quota settings, or wait for the quota window to reset.',
      shouldFallback: false,
    };
  }

  if (normalized.includes('api_key') || normalized.includes('api key') || status === 401) {
    return {
      category: 'invalid_api_key',
      message: 'Davis AI cannot authenticate with Gemini. The server API key is missing, invalid, or revoked. Check the GEMINI_API_KEY environment variable in the backend service.',
      shouldFallback: false,
    };
  }

  if (status === 403 || normalized.includes('permission_denied') || normalized.includes('permission denied')) {
    return {
      category: 'permission_denied',
      message: 'Google Gemini denied this request. Check whether the API key, project, model, and API access permissions are configured correctly.',
      shouldFallback: false,
    };
  }

  if (status === 429 || normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return {
      category: 'rate_limited',
      message: 'Davis AI is being rate-limited by Gemini. Please wait briefly before trying again.',
      shouldFallback: true,
    };
  }

  if (status === 503 || normalized.includes('high demand') || normalized.includes('overloaded') || normalized.includes('temporarily unavailable')) {
    return {
      category: 'provider_overloaded',
      message: 'Gemini is temporarily overloaded. Davis AI can try its configured fallback model.',
      shouldFallback: true,
    };
  }

  if (status === 404 || normalized.includes('model not found') || normalized.includes('not supported for generatecontent')) {
    return {
      category: 'model_unavailable',
      message: 'The selected Gemini model is unavailable for this request. Davis AI can try its configured fallback model.',
      shouldFallback: true,
    };
  }

  if (normalized.includes('fetch failed') || normalized.includes('econnreset') || normalized.includes('etimedout') || normalized.includes('network')) {
    return {
      category: 'network_error',
      message: 'Davis AI could not reach the Gemini service because of a network problem. Please try again.',
      shouldFallback: true,
    };
  }

  return {
    category: 'unknown',
    message: message || 'An unexpected Gemini error occurred.',
    shouldFallback: true,
  };
}
