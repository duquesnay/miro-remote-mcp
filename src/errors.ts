/**
 * Rich error diagnostics for Miro MCP.
 * Classifies errors and provides actionable suggestions.
 */
import { AxiosError } from 'axios';

export enum DiagnosticErrorType {
  API_ERROR = 'API_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface DiagnosticError {
  type: DiagnosticErrorType;
  message: string;
  statusCode?: number;
  suggestion: string;
  details?: {
    parameter?: string;
    expected?: string;
    received?: unknown;
    retryAfter?: number;
    apiResponse?: unknown;
  };
}

/**
 * Classify an Axios error into a diagnostic error with suggestions.
 */
export function classifyAxiosError(error: AxiosError): DiagnosticError {
  const status = error.response?.status;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const headers = error.response?.headers as Record<string, string> | undefined;

  // Extract message from various response formats
  const apiMessage =
    (data?.message as string) ||
    (data?.error as string) ||
    (data?.error_description as string) ||
    error.message;

  // Rate limit (429)
  if (status === 429) {
    const retryAfter = parseInt(headers?.['retry-after'] || '60', 10);
    return {
      type: DiagnosticErrorType.RATE_LIMIT_ERROR,
      message: apiMessage || 'Rate limit exceeded',
      statusCode: 429,
      suggestion: `Wait ${retryAfter} seconds before retrying. Consider reducing request frequency.`,
      details: {
        retryAfter,
        apiResponse: data,
      },
    };
  }

  // Auth errors (401, 403)
  if (status === 401) {
    return {
      type: DiagnosticErrorType.AUTH_ERROR,
      message: apiMessage || 'Authentication failed',
      statusCode: 401,
      suggestion: 'Token may be expired. Run: npm run oauth to refresh authentication.',
      details: { apiResponse: data },
    };
  }

  if (status === 403) {
    return {
      type: DiagnosticErrorType.AUTH_ERROR,
      message: apiMessage || 'Permission denied',
      statusCode: 403,
      suggestion:
        'Insufficient permissions. Grant required board/team permissions in Miro settings.',
      details: { apiResponse: data },
    };
  }

  // Validation error (400)
  if (status === 400) {
    return {
      type: DiagnosticErrorType.VALIDATION_ERROR,
      message: apiMessage || 'Invalid request',
      statusCode: 400,
      suggestion: 'Check parameter values and types. See Miro API docs for valid formats.',
      details: { apiResponse: data },
    };
  }

  // Not found (404)
  if (status === 404) {
    return {
      type: DiagnosticErrorType.API_ERROR,
      message: apiMessage || 'Resource not found',
      statusCode: 404,
      suggestion: 'Verify the ID exists. Use list_boards or list_items to find valid IDs.',
      details: { apiResponse: data },
    };
  }

  // Server errors (500+)
  if (status && status >= 500) {
    return {
      type: DiagnosticErrorType.INTERNAL_ERROR,
      message: apiMessage || 'Miro API internal error',
      statusCode: status,
      suggestion: 'Miro API is experiencing issues. Try again later.',
      details: { apiResponse: data },
    };
  }

  // Generic/unknown error
  return {
    type: DiagnosticErrorType.INTERNAL_ERROR,
    message: apiMessage || 'Unknown error',
    statusCode: status,
    suggestion: 'An unexpected error occurred. Check the error details.',
    details: { apiResponse: data },
  };
}

/**
 * Create a validation error for parameter issues.
 */
export function createValidationError(
  parameter: string,
  expected: string,
  received: unknown
): DiagnosticError {
  return {
    type: DiagnosticErrorType.VALIDATION_ERROR,
    message: `Invalid parameter: ${parameter}`,
    suggestion: `Expected format: ${expected}. Received: ${JSON.stringify(received)}`,
    details: {
      parameter,
      expected,
      received,
    },
  };
}

/**
 * Create a rate limit error with retry timing.
 */
export function createRateLimitError(retryAfter: number): DiagnosticError {
  return {
    type: DiagnosticErrorType.RATE_LIMIT_ERROR,
    message: 'Miro API rate limit exceeded',
    statusCode: 429,
    suggestion: `Wait ${retryAfter} seconds before retrying. Consider batching requests.`,
    details: {
      retryAfter,
    },
  };
}

/**
 * Format a diagnostic error into a readable string for MCP response.
 */
export function formatDiagnosticError(diagnostic: DiagnosticError): string {
  const lines: string[] = [];

  // Header with type and status
  let header = `[${diagnostic.type}]`;
  if (diagnostic.statusCode) {
    header += ` (HTTP ${diagnostic.statusCode})`;
  }
  lines.push(header);
  lines.push(diagnostic.message);
  lines.push('');

  // Details section
  if (diagnostic.details) {
    if (diagnostic.details.parameter) {
      lines.push(`Parameter: ${diagnostic.details.parameter}`);
    }
    if (diagnostic.details.expected) {
      lines.push(`Expected: ${diagnostic.details.expected}`);
    }
    if (diagnostic.details.received !== undefined) {
      lines.push(`Received: ${JSON.stringify(diagnostic.details.received)}`);
    }
    if (diagnostic.details.retryAfter) {
      lines.push(`Retry after: ${diagnostic.details.retryAfter} seconds`);
    }
    lines.push('');
  }

  // Suggestion
  lines.push(`Suggestion: ${diagnostic.suggestion}`);

  return lines.join('\n');
}
