import { ExcalidrawElement } from '../../types/excalidraw.types';
import { ExcalidrawConfig } from '../../types/excalidraw.types';
import { ElementFactory } from '../factories/element.factory';
import { PropertyParser } from '../utils/property.parser';
import { ArrowPositionCalculator } from '../utils/arrow-position.calculator';
import { ColumnLabelRenderer } from '../renderers/column-label.renderer';
import { IdGenerator } from '../utils/id.generator';
import { TextMeasurement } from '../utils/text-measurement';
import { GeometryUtils } from '../utils/geometry.utils';

/**
 * Context passed to node generators
 * Contains all utilities and configuration needed for generation
 */
export interface GenerationContext {
  /** Element factory for creating Excalidraw elements */
  elementFactory: ElementFactory;
  /** Property parser for extracting node properties */
  propertyParser: PropertyParser;
  /** Arrow position calculator */
  arrowCalculator: ArrowPositionCalculator;
  /** Column label renderer */
  columnRenderer: ColumnLabelRenderer;
  /** ID generator */
  idGenerator: IdGenerator;
  /** Text measurement utility */
  textMeasurement: TextMeasurement;
  /** Geometry utilities */
  geometryUtils: GeometryUtils;
  /** Configuration */
  config: Required<ExcalidrawConfig>;
  /** Elements array to add generated elements to */
  elements: ExcalidrawElement[];
}

