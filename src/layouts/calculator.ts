/**
 * Layout calculator - pure computation of item positions
 */

import { LayoutItem, PositionedItem, LayoutOptions } from './types.js';
import { MIRO_DEFAULTS, LAYOUT_DEFAULTS } from '../config.js';

export class LayoutCalculator {
  /**
   * Calculate positions for items based on layout type
   */
  static calculatePositions(
    items: LayoutItem[],
    options: LayoutOptions
  ): PositionedItem[] {
    const startX = options.startX ?? 0;
    const startY = options.startY ?? 0;
    const spacing = options.spacing ?? LAYOUT_DEFAULTS.SPACING;

    switch (options.layout) {
      case 'grid':
        return this.calculateGrid(items, { ...options, startX, startY, spacing });
      case 'row':
        return this.calculateRow(items, { ...options, startX, startY, spacing });
      case 'column':
        return this.calculateColumn(items, { ...options, startX, startY, spacing });
      case 'tree':
        return this.calculateTree(items, { ...options, startX, startY, spacing });
      case 'radial':
        return this.calculateRadial(items, { ...options, startX, startY, spacing });
      case 'custom':
        return this.calculateCustom(items, options);
      default:
        throw new Error(`Unknown layout type: ${options.layout}`);
    }
  }

  /**
   * Grid layout - arrange items in NxM grid
   */
  private static calculateGrid(
    items: LayoutItem[],
    options: { startX: number; startY: number; spacing: number } & LayoutOptions
  ): PositionedItem[] {
    const cols = options.cols ?? Math.ceil(Math.sqrt(items.length));

    return items.map((item, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const itemWidth = item.width ?? MIRO_DEFAULTS.STICKY_NOTE_SIZE;
      const itemHeight = item.height ?? MIRO_DEFAULTS.STICKY_NOTE_SIZE;

      return {
        ...item,
        x: options.startX + col * (itemWidth + options.spacing),
        y: options.startY + row * (itemHeight + options.spacing),
      };
    });
  }

  /**
   * Row layout - arrange items horizontally
   */
  private static calculateRow(
    items: LayoutItem[],
    options: { startX: number; startY: number; spacing: number }
  ): PositionedItem[] {
    let currentX = options.startX;

    return items.map((item) => {
      const itemWidth = item.width ?? MIRO_DEFAULTS.STICKY_NOTE_SIZE;
      const x = currentX;
      currentX += itemWidth + options.spacing;

      return {
        ...item,
        x,
        y: options.startY,
      };
    });
  }

  /**
   * Column layout - arrange items vertically
   */
  private static calculateColumn(
    items: LayoutItem[],
    options: { startX: number; startY: number; spacing: number }
  ): PositionedItem[] {
    let currentY = options.startY;

    return items.map((item) => {
      const itemHeight = item.height ?? MIRO_DEFAULTS.STICKY_NOTE_SIZE;
      const y = currentY;
      currentY += itemHeight + options.spacing;

      return {
        ...item,
        x: options.startX,
        y,
      };
    });
  }

  /**
   * Tree layout - hierarchical arrangement using metadata.level
   */
  private static calculateTree(
    items: LayoutItem[],
    options: { startX: number; startY: number; spacing: number } & LayoutOptions
  ): PositionedItem[] {
    const orientation = options.orientation ?? 'vertical';
    const levelSpacing = options.levelSpacing ?? LAYOUT_DEFAULTS.TREE_LEVEL_SPACING;
    const siblingSpacing = options.siblingSpacing ?? LAYOUT_DEFAULTS.TREE_SIBLING_SPACING;

    // Group items by level
    const itemsByLevel = this.groupByLevel(items);
    const positioned: PositionedItem[] = [];

    itemsByLevel.forEach((levelItems, level) => {
      const itemSize = MIRO_DEFAULTS.STICKY_NOTE_SIZE;

      // Calculate total width of this level
      const totalWidth = levelItems.length * itemSize + (levelItems.length - 1) * siblingSpacing;

      levelItems.forEach((item, indexInLevel) => {
        let x: number, y: number;

        if (orientation === 'vertical') {
          // Vertical tree: levels go down, siblings spread horizontally
          x = options.startX - totalWidth / 2 + indexInLevel * (itemSize + siblingSpacing) + itemSize / 2;
          y = options.startY + level * levelSpacing;
        } else {
          // Horizontal tree: levels go right, siblings spread vertically
          x = options.startX + level * levelSpacing;
          y = options.startY - totalWidth / 2 + indexInLevel * (itemSize + siblingSpacing) + itemSize / 2;
        }

        positioned.push({ ...item, x, y });
      });
    });

    return positioned;
  }

  /**
   * Radial layout - arrange items in a circle around center
   */
  private static calculateRadial(
    items: LayoutItem[],
    options: { startX: number; startY: number; spacing: number } & LayoutOptions
  ): PositionedItem[] {
    const radius = options.radius ?? LAYOUT_DEFAULTS.RADIAL_RADIUS;
    const startAngle = options.startAngle ?? LAYOUT_DEFAULTS.RADIAL_START_ANGLE;
    const angleStep = (2 * Math.PI) / items.length;

    return items.map((item, index) => {
      const angle = startAngle + index * angleStep;
      return {
        ...item,
        x: options.startX + radius * Math.cos(angle),
        y: options.startY + radius * Math.sin(angle),
      };
    });
  }

  /**
   * Custom layout - use provided positions
   */
  private static calculateCustom(
    items: LayoutItem[],
    options: LayoutOptions
  ): PositionedItem[] {
    if (!options.positions || options.positions.length !== items.length) {
      throw new Error('Custom layout requires positions array matching items length');
    }

    return items.map((item, index) => ({
      ...item,
      ...options.positions![index],
    }));
  }

  /**
   * Group items by level (from metadata.level, defaults to 0)
   */
  private static groupByLevel(items: LayoutItem[]): LayoutItem[][] {
    const levels = new Map<number, LayoutItem[]>();

    items.forEach((item) => {
      const level = (item.metadata?.level as number) ?? 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(item);
    });

    // Return as array sorted by level
    return Array.from(levels.entries())
      .sort(([a], [b]) => a - b)
      .map(([, levelItems]) => levelItems);
  }
}
