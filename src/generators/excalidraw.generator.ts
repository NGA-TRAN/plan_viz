import {
  ExcalidrawData,
  ExcalidrawElement,
  ExcalidrawConfig,
} from '../types/excalidraw.types';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { IdGenerator } from './utils/id.generator';
import { TextMeasurement } from './utils/text-measurement';
import { ElementFactory } from './factories/element.factory';
import { ArrowPositionCalculator } from './utils/arrow-position.calculator';
import { PropertyParser } from './utils/property.parser';
import { ColumnLabelRenderer } from './renderers/column-label.renderer';
import { GeometryUtils } from './utils/geometry.utils';
import { NodeGeneratorRegistry } from './generators/node-generator.registry';
import { DefaultNodeGenerator } from './generators/default-node.generator';
import { CoalescePartitionsNodeGenerator } from './generators/coalesce-partitions-node.generator';
import { CoalesceBatchesNodeGenerator } from './generators/coalesce-batches-node.generator';
import { FilterNodeGenerator } from './generators/filter-node.generator';
import { RepartitionNodeGenerator } from './generators/repartition-node.generator';
import { AggregateNodeGenerator } from './generators/aggregate-node.generator';
import { ProjectionNodeGenerator } from './generators/projection-node.generator';
import { SortNodeGenerator } from './generators/sort-node.generator';
import { SortPreservingMergeNodeGenerator } from './generators/sort-preserving-merge-node.generator';
import { HashJoinNodeGenerator } from './generators/hash-join-node.generator';
import { SortMergeJoinNodeGenerator } from './generators/sort-merge-join-node.generator';
import { UnionNodeGenerator } from './generators/union-node.generator';
import { DataSourceNodeGenerator } from './generators/data-source-node.generator';
import { LocalLimitNodeGenerator } from './generators/local-limit-node.generator';
import { GlobalLimitNodeGenerator } from './generators/global-limit-node.generator';
import { GenerationContext } from './types/generation-context.types';

/**
 * Generator for Excalidraw JSON from execution plan nodes
 * Acts as a coordinator that delegates node generation to specialized generators
 * Follows Single Responsibility Principle - coordinates generation without implementing details
 */
export class ExcalidrawGenerator {
  private readonly config: Required<ExcalidrawConfig>;
  private readonly idGenerator: IdGenerator;
  private readonly textMeasurement: TextMeasurement;
  private readonly elementFactory: ElementFactory;
  private readonly arrowCalculator: ArrowPositionCalculator;
  private readonly propertyParser: PropertyParser;
  private readonly columnRenderer: ColumnLabelRenderer;
  private readonly geometryUtils: GeometryUtils;
  private readonly nodeGeneratorRegistry: NodeGeneratorRegistry;

  constructor(config: ExcalidrawConfig = {}) {
    const baseFontSize = config.fontSize ?? 16;
    this.config = {
      nodeWidth: config.nodeWidth ?? 200,
      nodeHeight: config.nodeHeight ?? 80,
      verticalSpacing: config.verticalSpacing ?? 100,
      horizontalSpacing: config.horizontalSpacing ?? 50,
      fontSize: baseFontSize,
      operatorFontSize: config.operatorFontSize ?? Math.round(baseFontSize * 1.25),
      detailsFontSize: config.detailsFontSize ?? Math.round(baseFontSize * 0.875),
      nodeColor: config.nodeColor ?? '#1e1e1e',
      arrowColor: config.arrowColor ?? '#1e1e1e',
    };

    // Initialize utility instances
    this.idGenerator = new IdGenerator();
    this.textMeasurement = new TextMeasurement();
    this.elementFactory = new ElementFactory(this.idGenerator, this.config);
    this.arrowCalculator = new ArrowPositionCalculator();
    this.propertyParser = new PropertyParser();
    this.columnRenderer = new ColumnLabelRenderer(this.elementFactory, this.textMeasurement, this.idGenerator);
    this.geometryUtils = new GeometryUtils();

    // Initialize node generator registry
    this.nodeGeneratorRegistry = new NodeGeneratorRegistry();
    this.registerNodeGenerators();
  }

  /**
   * Generates Excalidraw JSON from an execution plan node tree
   * @param root - Root node of the execution plan
   * @returns Complete Excalidraw data structure
   */
  public generate(root: ExecutionPlanNode | null): ExcalidrawData {
    const elements: ExcalidrawElement[] = [];

    if (root) {
      // Root node is the first line of physical_plan - it should not have output arrows
      this.generateNodeElements(root, 0, 0, elements, true);
    }

    return {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements,
      appState: {
        gridSize: null,
        viewBackgroundColor: '#ffffff',
      },
      files: {},
    };
  }

  /**
   * Creates a generation context for node generators
   */
  private createGenerationContext(elements: ExcalidrawElement[]): GenerationContext {
    return {
      elementFactory: this.elementFactory,
      propertyParser: this.propertyParser,
      arrowCalculator: this.arrowCalculator,
      columnRenderer: this.columnRenderer,
      idGenerator: this.idGenerator,
      textMeasurement: this.textMeasurement,
      geometryUtils: this.geometryUtils,
      config: this.config,
      elements,
      generateChildNode: (child, childX, childY, isChildRoot) => {
        return this.generateNodeElements(child, childX, childY, elements, isChildRoot);
      },
    };
  }

  /**
   * Recursively generates Excalidraw elements for nodes
   * Returns node info including the number of input arrows
   * @param isRoot - Whether this node is the root node (first line of physical_plan)
   */
  private generateNodeElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    // Use registered generators
    if (this.nodeGeneratorRegistry.hasGenerator(node.operator)) {
      const context = this.createGenerationContext(elements);
      const generator = this.nodeGeneratorRegistry.getGenerator(node.operator);
      return generator.generate(node, x, y, isRoot, context);
    }

    // Use default generator for unimplemented operators
    const context = this.createGenerationContext(elements);
    const defaultGenerator = this.nodeGeneratorRegistry.getGenerator('default') as DefaultNodeGenerator;
    return defaultGenerator.generate(node, x, y, isRoot, context);
  }


  /**
   * Registers all node generators with the registry
   * Centralizes generator registration for maintainability
   */
  private registerNodeGenerators(): void {
    this.nodeGeneratorRegistry.register('default', new DefaultNodeGenerator());
    this.nodeGeneratorRegistry.register('CoalescePartitionsExec', new CoalescePartitionsNodeGenerator());
    this.nodeGeneratorRegistry.register('CoalesceBatchesExec', new CoalesceBatchesNodeGenerator());
    this.nodeGeneratorRegistry.register('FilterExec', new FilterNodeGenerator());
    this.nodeGeneratorRegistry.register('RepartitionExec', new RepartitionNodeGenerator());
    this.nodeGeneratorRegistry.register('AggregateExec', new AggregateNodeGenerator());
    this.nodeGeneratorRegistry.register('ProjectionExec', new ProjectionNodeGenerator());
    this.nodeGeneratorRegistry.register('SortExec', new SortNodeGenerator());
    this.nodeGeneratorRegistry.register('SortPreservingMergeExec', new SortPreservingMergeNodeGenerator());
    this.nodeGeneratorRegistry.register('HashJoinExec', new HashJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('SortMergeJoin', new SortMergeJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('SortMergeJoinExec', new SortMergeJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('UnionExec', new UnionNodeGenerator());
    this.nodeGeneratorRegistry.register('DataSourceExec', new DataSourceNodeGenerator());
    this.nodeGeneratorRegistry.register('LocalLimitExec', new LocalLimitNodeGenerator());
    this.nodeGeneratorRegistry.register('GlobalLimitExec', new GlobalLimitNodeGenerator());
  }
}
