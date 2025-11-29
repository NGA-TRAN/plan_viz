import {
  ExcalidrawRectangle,
  ExcalidrawText,
  ExcalidrawArrow,
  ExcalidrawEllipse,
  ExcalidrawConfig,
} from '../../types/excalidraw.types';
import { IdGenerator } from '../utils/id.generator';
import {
  COLORS,
  FONT_SIZES,
  FONT_FAMILIES,
  ELEMENT_DEFAULTS,
  TEXT_HEIGHTS,
} from '../constants';

export interface RectangleOptions {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  roundnessType?: number;
}

export interface TextOptions {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  strokeColor?: string;
  containerId?: string | null;
  autoResize?: boolean;
  lineHeight?: number;
  version?: number; // Version number for Excalidraw element (default: 1 for regular text, 3 for operator text)
}

export interface ArrowOptions {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  childRectId: string;
  parentRectId: string;
  strokeColor?: string;
}

export interface EllipseOptions {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  roundnessType?: number;
}

/**
 * Factory for creating Excalidraw elements
 * Centralizes element creation logic to ensure consistency
 */
export class ElementFactory {
  constructor(
    private idGenerator: IdGenerator,
    private config: Required<ExcalidrawConfig>
  ) {}

  /**
   * Creates a rectangle element
   */
  createRectangle(options: RectangleOptions): ExcalidrawRectangle {
    return {
      id: options.id,
      type: 'rectangle',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      angle: 0,
      strokeColor: options.strokeColor ?? this.config.nodeColor,
      backgroundColor: COLORS.TRANSPARENT,
      fillStyle: 'solid',
      strokeWidth: ELEMENT_DEFAULTS.STROKE_WIDTH,
      strokeStyle: 'solid',
      roughness: ELEMENT_DEFAULTS.ROUGHNESS,
      opacity: ELEMENT_DEFAULTS.OPACITY,
      groupIds: [],
      frameId: null,
      index: this.idGenerator.generateIndex(),
      roundness: { type: options.roundnessType ?? ELEMENT_DEFAULTS.ROUNDNESS_TYPE },
      seed: this.idGenerator.generateSeed(),
      version: 7,
      versionNonce: this.idGenerator.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: this.idGenerator.generateTimestamp(),
      link: null,
      locked: false,
    };
  }

  /**
   * Creates a text element
   */
  createText(options: TextOptions): ExcalidrawText {
    const fontSize = options.fontSize ?? FONT_SIZES.DETAILS;
    // Operator text (centered, bold, with containerId) uses version 3
    // Regular text uses version 1
    const isOperatorText = options.textAlign === 'center' &&
                          options.fontFamily === FONT_FAMILIES.BOLD &&
                          options.containerId !== null &&
                          options.containerId !== undefined;
    const version = options.version ?? (isOperatorText ? 3 : 1);
    return {
      id: options.id,
      type: 'text',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      angle: 0,
      strokeColor: options.strokeColor ?? this.config.nodeColor,
      backgroundColor: COLORS.TRANSPARENT,
      fillStyle: 'solid',
      strokeWidth: ELEMENT_DEFAULTS.STROKE_WIDTH,
      strokeStyle: 'solid',
      roughness: ELEMENT_DEFAULTS.ROUGHNESS,
      opacity: ELEMENT_DEFAULTS.OPACITY,
      groupIds: [],
      frameId: null,
      index: this.idGenerator.generateIndex(),
      roundness: null,
      seed: this.idGenerator.generateSeed(),
      version,
      versionNonce: this.idGenerator.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: this.idGenerator.generateTimestamp(),
      link: null,
      locked: false,
      text: options.text,
      fontSize,
      fontFamily: options.fontFamily ?? FONT_FAMILIES.NORMAL,
      textAlign: options.textAlign ?? 'left',
      verticalAlign: options.verticalAlign ?? 'top',
      baseline: fontSize,
      containerId: options.containerId ?? null,
      originalText: options.text,
      autoResize: options.autoResize ?? false,
      lineHeight: options.lineHeight ?? ELEMENT_DEFAULTS.LINE_HEIGHT,
    };
  }

  /**
   * Creates an arrow element with proper binding
   */
  createArrow(options: ArrowOptions): ExcalidrawArrow {
    const dx = options.endX - options.startX;
    const dy = options.endY - options.startY;

    return {
      id: options.id,
      type: 'arrow',
      x: options.startX,
      y: options.startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      angle: 0,
      strokeColor: options.strokeColor ?? this.config.arrowColor,
      backgroundColor: COLORS.TRANSPARENT,
      fillStyle: 'solid',
      strokeWidth: ELEMENT_DEFAULTS.STROKE_WIDTH,
      strokeStyle: 'solid',
      roughness: ELEMENT_DEFAULTS.ROUGHNESS,
      opacity: ELEMENT_DEFAULTS.OPACITY,
      groupIds: [],
      frameId: null,
      index: this.idGenerator.generateIndex(),
      roundness: { type: 2 },
      seed: this.idGenerator.generateSeed(),
      version: 1,
      versionNonce: this.idGenerator.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: this.idGenerator.generateTimestamp(),
      link: null,
      locked: false,
      points: [
        [0, 0],
        [dx, dy],
      ],
      lastCommittedPoint: null,
      startBinding: {
        elementId: options.childRectId,
        focus: 0,
        gap: 0,
      },
      endBinding: {
        elementId: options.parentRectId,
        focus: 0,
        gap: 0,
      },
      startArrowhead: null,
      endArrowhead: 'arrow',
      elbowed: false,
    };
  }

  /**
   * Creates an ellipse element
   */
  createEllipse(options: EllipseOptions): ExcalidrawEllipse {
    return {
      id: options.id,
      type: 'ellipse',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      angle: 0,
      strokeColor: options.strokeColor ?? this.config.nodeColor,
      backgroundColor: options.backgroundColor ?? COLORS.TRANSPARENT,
      fillStyle: 'solid',
      strokeWidth: ELEMENT_DEFAULTS.STROKE_WIDTH,
      strokeStyle: options.strokeStyle ?? 'solid',
      roughness: ELEMENT_DEFAULTS.ROUGHNESS,
      opacity: ELEMENT_DEFAULTS.OPACITY,
      groupIds: [],
      frameId: null,
      index: this.idGenerator.generateIndex(),
      roundness: { type: options.roundnessType ?? ELEMENT_DEFAULTS.ELLIPSE_ROUNDNESS_TYPE },
      seed: this.idGenerator.generateSeed(),
      version: 1,
      versionNonce: this.idGenerator.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: this.idGenerator.generateTimestamp(),
      link: null,
      locked: false,
    };
  }

  /**
   * Creates operator name text (bold, centered)
   */
  createOperatorText(
    id: string,
    x: number,
    y: number,
    width: number,
    text: string,
    containerId: string
  ): ExcalidrawText {
    return this.createText({
      id,
      x,
      y: y + 5,
      width,
      height: TEXT_HEIGHTS.OPERATOR,
      text,
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId,
    });
  }

  /**
   * Creates detail text (normal font, smaller size)
   */
  createDetailText(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color?: string,
    containerId?: string | null
  ): ExcalidrawText {
    return this.createText({
      id,
      x,
      y,
      width,
      height,
      text,
      fontSize: FONT_SIZES.DETAILS,
      fontFamily: FONT_FAMILIES.NORMAL,
      textAlign: 'center',
      verticalAlign: 'top',
      strokeColor: color,
      containerId,
    });
  }
}

