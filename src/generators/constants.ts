/**
 * Constants for Excalidraw generation
 * Centralizes all magic numbers and configuration values
 */

export const NODE_DIMENSIONS = {
  DEFAULT_WIDTH: 200,
  DEFAULT_HEIGHT: 80,
  DATASOURCE_WIDTH: 300,
  DATASOURCE_HEIGHT: 100,
  AGGREGATE_HEIGHT_WITH_SORTED: 100,
  HASH_JOIN_HEIGHT: 125,
  SORT_MERGE_JOIN_HEIGHT: 125,
} as const;

export const SPACING = {
  VERTICAL: 100,
  HORIZONTAL: 50,
  ARROW_VERTICAL_RATIO: 3 / 5,
  ELLIPSE_SIZE: 60,
  ELLIPSE_SPACING: 20,
  GROUP_SPACING: 40,
  ELLIPSE_BASE_OFFSET: 75,
  GROUP_PADDING: 10,
  TEXT_RIGHT_OFFSET: 5,
  TEXT_LEFT_OFFSET: -5,
} as const;

export const COLORS = {
  NODE_DEFAULT: '#1e1e1e',
  ARROW_DEFAULT: '#1e1e1e',
  ORDERED_COLUMN: '#1e90ff',
  ORANGE_BORDER: '#f08c00',
  PURPLE_MODE: '#9b59b6',
  DARK_RED: '#8B0000',
  RED_ERROR: '#ff0000',
  TRANSPARENT: 'transparent',
  WHITE_BACKGROUND: '#ffffff',
} as const;

export const ARROW_CONSTANTS = {
  MAX_ARROWS_FOR_ELLIPSIS: 8,
  ARROWS_BEFORE_ELLIPSIS: 2,
  ARROWS_AFTER_ELLIPSIS: 2,
  MIN_ARROW_SPACING: 20,
  CENTRAL_REGION_RATIO: 0.6,
} as const;

export const FONT_SIZES = {
  OPERATOR: 20,
  DETAILS: 14,
  ELLIPSE_TEXT: 20,
  COLUMN_LABEL: 14,
  ELLIPSIS: 14,
  HASH_TABLE: 16,
} as const;

export const TEXT_HEIGHTS = {
  OPERATOR: 25,
  DETAILS_LINE: 17.5,
  COLUMN_LABEL: 17.5,
} as const;

export const FONT_FAMILIES = {
  REGULAR: 1,
  NORMAL: 6,
  BOLD: 7,
} as const;

export const ELEMENT_DEFAULTS = {
  STROKE_WIDTH: 1,
  OPACITY: 100,
  ROUGHNESS: 0,
  LINE_HEIGHT: 1.25,
  ROUNDNESS_TYPE: 3,
  ELLIPSE_ROUNDNESS_TYPE: 2,
} as const;

export const HASH_TABLE_DIMENSIONS = {
  WIDTH: 138,
  HEIGHT: 41,
  Y_OFFSET: 70,
} as const;

export const DYNAMIC_FILTER_DIMENSIONS = {
  WIDTH: 120,
  HEIGHT: 30,
  Y_OFFSET: 50,
} as const;

export const EXCALIDRAW_DEFAULTS = {
  VERSION: 2,
  SOURCE: 'https://excalidraw.com',
  GRID_SIZE: null,
  VIEW_BACKGROUND_COLOR: '#ffffff',
} as const;

