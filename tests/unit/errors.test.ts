/**
 * Unit tests for error classification and diagnostics.
 * TDD: These tests are written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  DiagnosticErrorType,
  DiagnosticError,
  classifyAxiosError,
  createValidationError,
  createRateLimitError,
  formatDiagnosticError,
} from '../../src/errors.js';

// Helper to create mock AxiosError
function createMockAxiosError(
  status: number,
  data: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): AxiosError {
  const error = new Error('Request failed') as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    statusText: 'Error',
    headers,
    config: {} as any,
    data,
  };
  error.config = {} as any;
  return error;
}

describe('errors', () => {
  describe('classifyAxiosError', () => {
    it('classifies 404 as API_ERROR with suggestion', () => {
      const axiosError = createMockAxiosError(404, { message: 'Board not found' });
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.API_ERROR);
      expect(diagnostic.statusCode).toBe(404);
      expect(diagnostic.message).toContain('Board not found');
      expect(diagnostic.suggestion).toBeDefined();
      expect(diagnostic.suggestion.length).toBeGreaterThan(0);
    });

    it('classifies 401 as AUTH_ERROR with renewal suggestion', () => {
      const axiosError = createMockAxiosError(401, {
        message: 'Token expired',
        type: 'invalid_token',
      });
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.AUTH_ERROR);
      expect(diagnostic.statusCode).toBe(401);
      expect(diagnostic.suggestion).toMatch(/oauth|auth|token/i);
    });

    it('classifies 403 as AUTH_ERROR with permission suggestion', () => {
      const axiosError = createMockAxiosError(403, {
        message: 'Insufficient permissions',
      });
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.AUTH_ERROR);
      expect(diagnostic.statusCode).toBe(403);
      expect(diagnostic.suggestion).toMatch(/permission/i);
    });

    it('classifies 429 as RATE_LIMIT_ERROR with retry timing', () => {
      const axiosError = createMockAxiosError(
        429,
        { message: 'Rate limit exceeded' },
        { 'retry-after': '60' }
      );
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.RATE_LIMIT_ERROR);
      expect(diagnostic.statusCode).toBe(429);
      expect(diagnostic.details?.retryAfter).toBe(60);
      expect(diagnostic.suggestion).toMatch(/retry|wait/i);
    });

    it('classifies 400 as VALIDATION_ERROR', () => {
      const axiosError = createMockAxiosError(400, {
        message: 'Invalid parameter',
        field: 'stroke_width',
      });
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.VALIDATION_ERROR);
      expect(diagnostic.statusCode).toBe(400);
    });

    it('classifies 500+ as INTERNAL_ERROR', () => {
      const axiosError = createMockAxiosError(500, { message: 'Internal server error' });
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.type).toBe(DiagnosticErrorType.INTERNAL_ERROR);
      expect(diagnostic.statusCode).toBe(500);
    });

    it('preserves API response in details', () => {
      const apiResponse = { code: 'BOARD_NOT_FOUND', details: { boardId: '123' } };
      const axiosError = createMockAxiosError(404, apiResponse);
      const diagnostic = classifyAxiosError(axiosError);

      expect(diagnostic.details?.apiResponse).toEqual(apiResponse);
    });
  });

  describe('createValidationError', () => {
    it('creates validation error with parameter details', () => {
      const diagnostic = createValidationError('stroke_width', 'string (e.g., "2.0")', 42);

      expect(diagnostic.type).toBe(DiagnosticErrorType.VALIDATION_ERROR);
      expect(diagnostic.details?.parameter).toBe('stroke_width');
      expect(diagnostic.details?.expected).toContain('string');
      expect(diagnostic.details?.received).toBe(42);
    });

    it('includes suggestion with expected format', () => {
      const diagnostic = createValidationError('color', 'hex color string', 'invalid');

      expect(diagnostic.suggestion).toMatch(/expected|format/i);
    });
  });

  describe('createRateLimitError', () => {
    it('creates rate limit error with retry timing', () => {
      const diagnostic = createRateLimitError(60);

      expect(diagnostic.type).toBe(DiagnosticErrorType.RATE_LIMIT_ERROR);
      expect(diagnostic.statusCode).toBe(429);
      expect(diagnostic.details?.retryAfter).toBe(60);
    });

    it('includes retry suggestion with seconds', () => {
      const diagnostic = createRateLimitError(30);

      expect(diagnostic.suggestion).toContain('30');
      expect(diagnostic.suggestion).toMatch(/retry|wait|second/i);
    });
  });

  describe('formatDiagnosticError', () => {
    it('formats complete error with type prefix', () => {
      const diagnostic: DiagnosticError = {
        type: DiagnosticErrorType.VALIDATION_ERROR,
        message: 'Invalid stroke_width parameter',
        suggestion: 'Use string value like "2.0" instead of number',
        details: { parameter: 'stroke_width', expected: 'string', received: 42 },
      };

      const formatted = formatDiagnosticError(diagnostic);

      expect(formatted).toContain('[VALIDATION_ERROR]');
      expect(formatted).toContain('Invalid stroke_width parameter');
      expect(formatted).toContain('Use string value');
    });

    it('includes HTTP status when present', () => {
      const diagnostic: DiagnosticError = {
        type: DiagnosticErrorType.API_ERROR,
        message: 'Not found',
        statusCode: 404,
        suggestion: 'Check the ID',
      };

      const formatted = formatDiagnosticError(diagnostic);

      expect(formatted).toContain('404');
    });

    it('includes parameter details for validation errors', () => {
      const diagnostic: DiagnosticError = {
        type: DiagnosticErrorType.VALIDATION_ERROR,
        message: 'Invalid parameter',
        suggestion: 'Fix it',
        details: {
          parameter: 'board_id',
          expected: 'valid board ID',
          received: '',
        },
      };

      const formatted = formatDiagnosticError(diagnostic);

      expect(formatted).toContain('board_id');
    });

    it('includes retry timing for rate limit errors', () => {
      const diagnostic: DiagnosticError = {
        type: DiagnosticErrorType.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
        statusCode: 429,
        suggestion: 'Wait before retrying',
        details: { retryAfter: 45 },
      };

      const formatted = formatDiagnosticError(diagnostic);

      expect(formatted).toContain('45');
    });
  });
});
