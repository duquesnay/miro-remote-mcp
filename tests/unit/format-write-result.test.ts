import { describe, it, expect } from 'vitest';
import { formatWriteResult } from '../../src/miro-client.js';

describe('formatWriteResult', () => {
  const mockStickyNote = {
    id: 'sticky1',
    type: 'sticky_note',
    data: { content: 'Test note' },
    position: { x: 100, y: 200 },
    geometry: { width: 80, height: 100 },
    style: { fillColor: 'yellow' },
    createdAt: '2025-01-01',
    modifiedAt: '2025-01-01',
  };

  const mockShape = {
    id: 'shape1',
    type: 'shape',
    data: { content: 'Test shape', shape: 'rectangle' },
    position: { x: 150, y: 250 },
    geometry: { width: 120, height: 80 },
    style: { fillColor: 'blue' },
    createdAt: '2025-01-01',
    modifiedAt: '2025-01-01',
  };

  describe('Single item results', () => {
    it('should format single item with minimal format and JSON output', () => {
      const result = formatWriteResult(mockStickyNote, 'minimal', 'json', 'created');

      expect(result).toHaveProperty('id', 'sticky1');
      expect(result).toHaveProperty('type', 'sticky_note');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('geometry');
      expect(result).not.toHaveProperty('style'); // Minimal excludes style
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should format single item with standard format and JSON output', () => {
      const result = formatWriteResult(mockStickyNote, 'standard', 'json', 'created');

      expect(result).toHaveProperty('id', 'sticky1');
      expect(result).toHaveProperty('type', 'sticky_note');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('geometry');
      expect(result).toHaveProperty('style'); // Standard includes style
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should format single item with full format and JSON output', () => {
      const result = formatWriteResult(mockStickyNote, 'full', 'json', 'created');

      expect(result).toHaveProperty('id', 'sticky1');
      expect(result).toHaveProperty('type', 'sticky_note');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('geometry');
      expect(result).toHaveProperty('style');
      expect(result).toHaveProperty('createdAt'); // Full includes all fields
    });

    it('should format single item with TOON output', () => {
      const result = formatWriteResult(mockStickyNote, 'minimal', 'toon', 'created');

      expect(typeof result).toBe('string');
      expect(result).toContain('# created sticky_note');
      expect(result).toContain('sticky_note|sticky1|100,200|80x100|yellow|Test note');
    });
  });

  describe('Array results', () => {
    it('should format array with minimal format and JSON output', () => {
      const items = [mockStickyNote, mockShape];
      const result = formatWriteResult(items, 'minimal', 'json', 'created');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'sticky1');
      expect(result[0]).not.toHaveProperty('style');
      expect(result[1]).toHaveProperty('id', 'shape1');
      expect(result[1]).not.toHaveProperty('style');
    });

    it('should format array with TOON output', () => {
      const items = [mockStickyNote, { ...mockStickyNote, id: 'sticky2', data: { content: 'Second note' } }];
      const result = formatWriteResult(items, 'minimal', 'toon', 'created');

      expect(typeof result).toBe('string');
      expect(result).toContain('# created 2 sticky_notes');
      expect(result).toContain('sticky_note|sticky1');
      expect(result).toContain('sticky_note|sticky2');
    });
  });

  describe('Batch update results', () => {
    it('should format batch update result with JSON output', () => {
      const batchResult = {
        total: 2,
        succeeded: 2,
        failed: 0,
        results: [
          { id: 'sticky1', status: 'success' as const, item: mockStickyNote },
          { id: 'shape1', status: 'success' as const, item: mockShape },
        ],
      };

      const result = formatWriteResult(batchResult, 'minimal', 'json', 'updated');

      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('succeeded', 2);
      expect(result).toHaveProperty('results');
      expect(result.results[0].item).not.toHaveProperty('style'); // Minimal filtering applied
      expect(result.results[1].item).not.toHaveProperty('style');
    });

    it('should format batch update result with TOON output', () => {
      const batchResult = {
        total: 2,
        succeeded: 2,
        failed: 0,
        results: [
          { id: 'sticky1', status: 'success' as const, item: mockStickyNote },
          { id: 'sticky2', status: 'success' as const, item: { ...mockStickyNote, id: 'sticky2' } },
        ],
      };

      const result = formatWriteResult(batchResult, 'minimal', 'toon', 'updated');

      expect(typeof result).toBe('string');
      expect(result).toContain('# updated 2 sticky_notes');
      expect(result).toContain('sticky_note|sticky1');
      expect(result).toContain('sticky_note|sticky2');
    });
  });

  describe('Batch creation results', () => {
    it('should format batch creation result with JSON output', () => {
      const batchCreationResult = {
        items: [
          { id: 'sticky1', type: 'sticky_note' },
          { id: 'sticky2', type: 'sticky_note' },
        ],
        summary: {
          created: 2,
          failed: 0,
        },
      };

      const result = formatWriteResult(batchCreationResult, 'minimal', 'json', 'created');

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('summary');
      expect(result.items).toHaveLength(2);
      expect(result.summary.created).toBe(2);
    });

    it('should format batch creation result with TOON output', () => {
      const batchCreationResult = {
        items: [
          { id: 'sticky1', type: 'sticky_note' },
          { id: 'sticky2', type: 'sticky_note' },
        ],
        summary: {
          created: 2,
          failed: 0,
        },
      };

      const result = formatWriteResult(batchCreationResult, 'minimal', 'toon', 'created');

      expect(typeof result).toBe('string');
      expect(result).toContain('# created 2 items');
      expect(result).toContain('sticky_note|sticky1');
      expect(result).toContain('sticky_note|sticky2');
    });

    it('should include failure summary in TOON output', () => {
      const batchCreationResult = {
        items: [
          { id: 'sticky1', type: 'sticky_note' },
        ],
        summary: {
          created: 1,
          failed: 1,
          errors: ['Failed to create item'],
        },
      };

      const result = formatWriteResult(batchCreationResult, 'minimal', 'toon', 'created');

      expect(result).toContain('# created 1 items');
      expect(result).toContain('# 1 failed');
    });
  });

  describe('Default parameters', () => {
    it('should use minimal format by default', () => {
      const result = formatWriteResult(mockStickyNote);

      expect(result).not.toHaveProperty('style');
    });

    it('should use JSON output by default', () => {
      const result = formatWriteResult(mockStickyNote);

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('id');
    });
  });
});
