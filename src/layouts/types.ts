/**
 * Layout types and interfaces for batch creation
 */

export type LayoutType = 'grid' | 'row' | 'column' | 'tree' | 'radial' | 'custom';

export interface LayoutItem {
  content: string;
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PositionedItem extends LayoutItem {
  x: number;
  y: number;
}

export interface LayoutOptions {
  layout: LayoutType;
  spacing?: number;
  startX?: number;
  startY?: number;

  // Grid-specific
  rows?: number;
  cols?: number;

  // Tree-specific
  orientation?: 'vertical' | 'horizontal';
  levelSpacing?: number;
  siblingSpacing?: number;

  // Radial-specific
  radius?: number;
  startAngle?: number;

  // Custom
  positions?: Array<{ x: number; y: number }>;
}

export interface BatchCreationResult {
  items: Array<{ id: string; type: string }>;
  connectors?: Array<{ id: string }>;
  summary: {
    created: number;
    failed: number;
    errors?: string[];
  };
}
