/**
 * Excalidraw element types
 */
export type ExcalidrawElementType = 'rectangle' | 'arrow' | 'text';

/**
 * Base properties for all Excalidraw elements
 */
export interface ExcalidrawElementBase {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'cross-hatch' | 'solid';
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
  groupIds: string[];
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: { id: string; type: string }[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
}

/**
 * Rectangle element in Excalidraw
 */
export interface ExcalidrawRectangle extends ExcalidrawElementBase {
  type: 'rectangle';
}

/**
 * Arrow element in Excalidraw
 */
export interface ExcalidrawArrow extends ExcalidrawElementBase {
  type: 'arrow';
  points: number[][];
  lastCommittedPoint: number[] | null;
  startBinding: { elementId: string; focus: number; gap: number } | null;
  endBinding: { elementId: string; focus: number; gap: number } | null;
  startArrowhead: string | null;
  endArrowhead: string | null;
}

/**
 * Text element in Excalidraw
 */
export interface ExcalidrawText extends ExcalidrawElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  baseline: number;
  containerId: string | null;
  originalText: string;
  lineHeight: number;
}

/**
 * Union type for all Excalidraw elements
 */
export type ExcalidrawElement = ExcalidrawRectangle | ExcalidrawArrow | ExcalidrawText;

/**
 * Complete Excalidraw data structure
 */
export interface ExcalidrawData {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: {
    gridSize: number | null;
    viewBackgroundColor: string;
  };
  files: Record<string, unknown>;
}

/**
 * Configuration for Excalidraw generation
 */
export interface ExcalidrawConfig {
  /** Width of each node box */
  nodeWidth?: number;
  /** Height of each node box */
  nodeHeight?: number;
  /** Vertical spacing between nodes */
  verticalSpacing?: number;
  /** Horizontal spacing between sibling nodes */
  horizontalSpacing?: number;
  /** Font size for node text */
  fontSize?: number;
  /** Default node color */
  nodeColor?: string;
  /** Default arrow color */
  arrowColor?: string;
}
