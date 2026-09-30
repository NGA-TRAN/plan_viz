import {
  ExcalidrawData,
  ExcalidrawElement,
  ExcalidrawConfig,
  ResolvedExcalidrawConfig,
} from '../types/excalidraw.types';
import { PartitionCount } from '../types/plan-document.types';
import { addPartitionOmissions } from './utils/partition-omissions';
import { bindingAt } from './utils/arrow-binding';
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
import { CrossJoinNodeGenerator } from './generators/cross-join-node.generator';
import { UnionNodeGenerator } from './generators/union-node.generator';
import { DataSourceNodeGenerator } from './generators/data-source-node.generator';
import { LocalLimitNodeGenerator } from './generators/local-limit-node.generator';
import { GlobalLimitNodeGenerator } from './generators/global-limit-node.generator';
import { WindowAggNodeGenerator } from './generators/window-agg-node.generator';
import { UnnestNodeGenerator } from './generators/unnest-node.generator';
import { NestedLoopJoinNodeGenerator } from './generators/nested-loop-join-node.generator';
import { InterleaveNodeGenerator } from './generators/interleave-node.generator';
import { SymmetricHashJoinNodeGenerator } from './generators/symmetric-hash-join-node.generator';
import { PiecewiseMergeJoinNodeGenerator } from './generators/piecewise-merge-join-node.generator';
import { AnalyzeNodeGenerator } from './generators/analyze-node.generator';
import {
  LeafNodeGenerator,
  emptyLeafOptions,
  placeholderLeafOptions,
  memoryLeafOptions,
  explainLeafOptions,
  workTableLeafOptions,
  streamingTableLeafOptions,
} from './generators/leaf-node.generator';
import {
  WrapperNodeGenerator,
  bufferWrapperOptions,
  cooperativeWrapperOptions,
  dataSinkWrapperOptions,
} from './generators/wrapper-node.generator';
import { RecursiveQueryNodeGenerator } from './generators/recursive-query-node.generator';
import { ScalarSubqueryNodeGenerator } from './generators/scalar-subquery-node.generator';
import { GenerationContext } from './types/generation-context.types';
import { NodeInfo } from './types/node-info.types';
import { groupNodeVisuals } from './utils/node-group';
import { bindTextToContainers } from './utils/text-binding';
import { resolveOperator } from './generators/operator-resolver';
import { LayoutRecord, layoutAdaptiveTree, wrapLabel, textWidth } from './utils/adaptive-layout';

/**
 * Generator for Excalidraw JSON from execution plan nodes
 * Acts as a coordinator that delegates node generation to specialized generators
 * Follows Single Responsibility Principle - coordinates generation without implementing details
 */
export class ExcalidrawGenerator {
  private records = new Map<ExecutionPlanNode, LayoutRecord>();
  private needsAdaptiveLayout = false;
  private readonly config: ResolvedExcalidrawConfig;
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
    const customGenerators = config.customGenerators ?? [];

    // Initialize utility instances
    this.idGenerator = new IdGenerator();
    this.textMeasurement = new TextMeasurement();
    this.elementFactory = new ElementFactory(this.idGenerator, this.config);
    this.arrowCalculator = new ArrowPositionCalculator();
    this.propertyParser = new PropertyParser();
    this.columnRenderer = new ColumnLabelRenderer(
      this.elementFactory,
      this.textMeasurement,
      this.idGenerator
    );
    this.geometryUtils = new GeometryUtils();

    // Initialize node generator registry
    this.nodeGeneratorRegistry = new NodeGeneratorRegistry();
    this.registerNodeGenerators();

    for (const { operator, generator } of customGenerators) {
      this.nodeGeneratorRegistry.register(operator, generator);
    }
  }

  /**
   * Generates Excalidraw JSON from an execution plan node tree
   * @param root - Root node of the execution plan
   * @returns Complete Excalidraw data structure
   */
  public generate(
    root: ExecutionPlanNode | null,
    annotations?: ReadonlyMap<ExecutionPlanNode, PartitionCount>,
    nodeShapes?: Map<ExecutionPlanNode, ExcalidrawElement>
  ): ExcalidrawData {
    const elements: ExcalidrawElement[] = [];
    this.records = new Map();
    this.needsAdaptiveLayout = false;

    if (root) {
      // Root node is the first line of physical_plan - it should not have output arrows
      this.generateNodeElements(root, 0, 0, elements, true);
    }

    if (annotations) {
      this.needsAdaptiveLayout = true;
      for (const [node, record] of this.records) {
        const body = elements.find((e) => e.id === record.bodyId)!;
        const outer = elements.find((e) => e.id === record.info.rectId)!;
        const count = annotations.get(node);
        const label = 'output partitions = ' + (count?.value ?? 'unknown') +
          (count?.assigned !== undefined && count.assigned !== count.value ? '\nassigned = ' + count.assigned : '');
        const height = label.split('\n').length * 18 + 10;
        for (const e of record.own) {
          if (e !== body && e !== outer && e.type !== 'arrow' && e.y >= body.y + body.height) e.y += height;
        }
        const badge = this.elementFactory.createText({
          id: this.idGenerator.generateId(), x: body.x + 12, y: body.y + body.height + 3,
          width: body.width - 24, height: height - 6, text: label, fontSize: 14, strokeColor: '#1864ab',
        });
        badge.groupIds = [record.info.groupId!];
        body.height += height;
        if (outer !== body) outer.height += height;
        record.info.height += height;
        record.own.push(badge); elements.push(badge);
      }
    }

    if (root && this.needsAdaptiveLayout) {
      layoutAdaptiveTree(this.records.get(root)!, elements, this.config.verticalSpacing, this.config.horizontalSpacing);
    }
    if (annotations) {
      const bodies = new Set([...this.records.values()].flatMap((r) => [r.bodyId, r.info.rectId]));
      const byId = new Map(elements.map((e) => [e.id, e]));
      for (const e of elements) {
        if (e.type !== 'arrow') continue;
        const points = e.points.map((p) => [e.x + p[0], e.y + p[1]]);
        const first = points[0]; const last = points[points.length - 1];
        const from = byId.get(e.startBinding?.elementId ?? ''); const to = byId.get(e.endBinding?.elementId ?? '');
        if (from && bodies.has(from.id)) first[1] = from.y - 1;
        if (to && bodies.has(to.id)) last[1] = to.y + to.height + 1;
        e.x = first[0]; e.y = first[1]; e.points = points.map((p) => [p[0] - e.x, p[1] - e.y]);
        e.width = Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0]));
        e.height = Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
        if (from) e.startBinding = bindingAt(from, first[0], first[1], points[1][0], points[1][1]);
        if (to) e.endBinding = bindingAt(to, last[0], last[1], points[points.length - 2][0], points[points.length - 2][1]);
      }
    }
    if (annotations) {
      const bodies = [...this.records.values()].map((r) => elements.find((e) => e.id === r.bodyId)!);
      for (const e of elements) {
        if (e.type !== 'text' || e.containerId) continue;
        for (const body of bodies) {
          const overlaps = e.x < body.x + body.width && e.x + e.width > body.x &&
            e.y < body.y + body.height && e.y + e.height > body.y;
          const inside = e.x >= body.x && e.x + e.width <= body.x + body.width &&
            e.y >= body.y && e.y + e.height <= body.y + body.height;
          if (overlaps && !inside) e.x = body.x + body.width + 16;
        }
      }
    }
    // Return references to the final operator shapes for scene composition/bindings.
    if (nodeShapes) {
      nodeShapes.clear();
      const byId = new Map(elements.map((e) => [e.id, e]));
      for (const [node, record] of this.records) nodeShapes.set(node, byId.get(record.bodyId)!);
    }
    addPartitionOmissions(elements, this.elementFactory, this.idGenerator);
    bindTextToContainers(elements);

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
  ): NodeInfo {
    const groupId = this.idGenerator.generateId();
    const context = this.createGenerationContext(elements);
    context.nodeGroupId = groupId;

    const start = elements.length;
    // An exact outer registration may intentionally implement the whole decorator.
    const outerOverride = node.wrappers?.findIndex((wrapper) => this.nodeGeneratorRegistry.hasGenerator(wrapper.operator)) ?? -1;
    const effectiveNode = outerOverride >= 0 ? {
      ...node, operator: node.wrappers![outerOverride].operator,
      properties: { expression: node.wrappers![outerOverride].argumentsText ?? '' },
      wrappers: node.wrappers!.slice(0, outerOverride),
    } : node;
    const resolution = resolveOperator(effectiveNode, this.nodeGeneratorRegistry);
    const info = resolution.generator.generate(effectiveNode, x, y, isRoot, context);
    const bodyId = info.rectId;
    const children = node.children.map((child) => this.records.get(child)).filter((child): child is LayoutRecord => !!child);
    const childElements = new Set(children.flatMap(function collect(child): ExcalidrawElement[] {
      return [...child.own, ...child.children.flatMap(collect)];
    }));
    const own = elements.slice(start).filter((e) => !childElements.has(e));
    groupNodeVisuals(own, info.rectId, groupId);
    info.groupId = groupId;
    const headers: string[] = [];
    const wrappers = effectiveNode.wrappers ?? [];
    if (wrappers.length) {
      const body = elements.find((e) => e.id === bodyId)!;
      const panels = wrappers.map((wrapper) => {
        const text = wrapLabel(wrapper.operator + (wrapper.argumentsText ? '\n' + wrapper.argumentsText : ''),
          body.width - 24, this.config.detailsFontSize);
        return { text, height: text.split('\n').length * this.config.detailsFontSize * 1.25 + 20 };
      });
      const headerHeight = panels.reduce((sum, panel) => sum + panel.height, 0);
      for (const e of elements.slice(start)) e.y += headerHeight;
      const outer = this.elementFactory.createRectangle({
        id: this.idGenerator.generateId(), x: body.x, y, width: body.width,
        height: body.height + headerHeight, strokeColor: this.config.nodeColor, roundnessType: 3,
      });
      outer.groupIds = [groupId];
      elements.push(outer);
      own.push(outer);
      let headerY = y;
      for (const panel of panels) {
        const header = this.elementFactory.createRectangle({
          id: this.idGenerator.generateId(), x: body.x, y: headerY, width: body.width,
          height: panel.height, strokeColor: this.config.nodeColor, roundnessType: 3,
        });
        const title = this.elementFactory.createText({
          id: this.idGenerator.generateId(), x: body.x + 12, y: headerY + 10,
          width: body.width - 24, height: panel.height - 20, text: panel.text,
          fontSize: this.config.detailsFontSize, fontFamily: 7, textAlign: 'center',
          verticalAlign: 'top', containerId: header.id, strokeColor: this.config.nodeColor,
        });
        header.groupIds = [groupId];
        title.groupIds = [groupId];
        headers.push(header.id);
        elements.push(header, title);
        own.push(header, title);
        headerY += panel.height;
      }
      info.rectId = outer.id;
      info.height = outer.height;
      info.y += headerHeight;
    }
    const body = elements.find((e) => e.id === bodyId)!;
    const overflowing = own.some((e) => e.type === 'text' && e.y >= body.y && e.y < body.y + body.height &&
      (!e.containerId || e.containerId === bodyId) &&
      (e.text.split('\n').some((line) => textWidth(line, e.fontSize) > body.width - 20) ||
       e.y + e.height > body.y + body.height));
    this.needsAdaptiveLayout ||= overflowing || resolution.inferred || resolution.family === 'default' || wrappers.length > 0;
    this.records.set(node, { info, bodyId, own, children, headers });
    return info;
  }

  /**
   * Registers all node generators with the registry
   * Centralizes generator registration for maintainability
   */
  private registerNodeGenerators(): void {
    this.nodeGeneratorRegistry.register('default', new DefaultNodeGenerator());
    this.nodeGeneratorRegistry.register(
      'CoalescePartitionsExec',
      new CoalescePartitionsNodeGenerator()
    );
    this.nodeGeneratorRegistry.register('CoalesceBatchesExec', new CoalesceBatchesNodeGenerator());
    this.nodeGeneratorRegistry.register('FilterExec', new FilterNodeGenerator());
    this.nodeGeneratorRegistry.register('RepartitionExec', new RepartitionNodeGenerator());
    this.nodeGeneratorRegistry.register('AggregateExec', new AggregateNodeGenerator());
    this.nodeGeneratorRegistry.register('ProjectionExec', new ProjectionNodeGenerator());
    this.nodeGeneratorRegistry.register('SortExec', new SortNodeGenerator());
    this.nodeGeneratorRegistry.register(
      'SortPreservingMergeExec',
      new SortPreservingMergeNodeGenerator()
    );
    this.nodeGeneratorRegistry.register('HashJoinExec', new HashJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('SortMergeJoin', new SortMergeJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('SortMergeJoinExec', new SortMergeJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('CrossJoinExec', new CrossJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('UnionExec', new UnionNodeGenerator());
    this.nodeGeneratorRegistry.register('DataSourceExec', new DataSourceNodeGenerator());
    this.nodeGeneratorRegistry.register('LocalLimitExec', new LocalLimitNodeGenerator());
    this.nodeGeneratorRegistry.register('GlobalLimitExec', new GlobalLimitNodeGenerator());
    this.nodeGeneratorRegistry.register(
      'WindowAggExec',
      new WindowAggNodeGenerator('WindowAggExec')
    );
    this.nodeGeneratorRegistry.register(
      'BoundedWindowAggExec',
      new WindowAggNodeGenerator('BoundedWindowAggExec')
    );
    this.nodeGeneratorRegistry.register('UnnestExec', new UnnestNodeGenerator());
    this.nodeGeneratorRegistry.register('NestedLoopJoinExec', new NestedLoopJoinNodeGenerator());
    this.nodeGeneratorRegistry.register('InterleaveExec', new InterleaveNodeGenerator());
    this.nodeGeneratorRegistry.register(
      'SymmetricHashJoinExec',
      new SymmetricHashJoinNodeGenerator()
    );
    this.nodeGeneratorRegistry.register(
      'PiecewiseMergeJoinExec',
      new PiecewiseMergeJoinNodeGenerator()
    );
    this.nodeGeneratorRegistry.register('AnalyzeExec', new AnalyzeNodeGenerator());
    this.nodeGeneratorRegistry.register('EmptyExec', new LeafNodeGenerator(emptyLeafOptions()));
    this.nodeGeneratorRegistry.register(
      'PlaceholderRowExec',
      new LeafNodeGenerator(placeholderLeafOptions())
    );
    const memory = new LeafNodeGenerator(memoryLeafOptions());
    this.nodeGeneratorRegistry.register('LazyMemoryExec', memory);
    this.nodeGeneratorRegistry.register('ValuesExec', memory);
    this.nodeGeneratorRegistry.register('ExplainExec', new LeafNodeGenerator(explainLeafOptions()));
    this.nodeGeneratorRegistry.register(
      'WorkTableExec',
      new LeafNodeGenerator(workTableLeafOptions())
    );
    this.nodeGeneratorRegistry.register(
      'StreamingTableExec',
      new LeafNodeGenerator(streamingTableLeafOptions())
    );
    this.nodeGeneratorRegistry.register(
      'BufferExec',
      new WrapperNodeGenerator(bufferWrapperOptions())
    );
    this.nodeGeneratorRegistry.register(
      'CooperativeExec',
      new WrapperNodeGenerator(cooperativeWrapperOptions())
    );
    const sink = new WrapperNodeGenerator(dataSinkWrapperOptions());
    this.nodeGeneratorRegistry.register('DataSinkExec', sink);
    this.nodeGeneratorRegistry.register('FileSinkExec', sink);
    this.nodeGeneratorRegistry.register('RecursiveQueryExec', new RecursiveQueryNodeGenerator());
    this.nodeGeneratorRegistry.register('ScalarSubqueryExec', new ScalarSubqueryNodeGenerator());
  }
}
