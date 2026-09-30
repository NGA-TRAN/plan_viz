import { ExcalidrawGenerator } from '../generators/excalidraw.generator';
import { DistributedExcalidrawGenerator, DistributedRenderConfig } from '../generators/distributed-excalidraw.generator';
import { ExcalidrawData, ExcalidrawConfig } from '../types/excalidraw.types';
import { ParserConfig } from '../types/execution-plan.types';
import { PlanDiagnostic, PlanDocument } from '../types/plan-document.types';
import { PlanDocumentParser } from '../parsers/plan-document.parser';
import { analyzeDistributed } from '../analysis/distributed-analysis';

export interface ConverterConfig {
  parser?: ParserConfig;
  generator?: ExcalidrawConfig;
  input?: { section?: number };
  distributed?: DistributedRenderConfig;
}
export interface ConversionResult {
  scene: ExcalidrawData;
  document: PlanDocument;
  diagnostics: PlanDiagnostic[];
}
export class ConverterService {
  constructor(private readonly config: ConverterConfig = {}) {}
  convert(planText: string): ExcalidrawData {
    return this.convertDetailed(planText).scene;
  }
  convertDetailed(planText: string): ConversionResult {
    const document = new PlanDocumentParser(this.config.parser).parse(planText, this.config.input?.section);
    if (document.kind === 'single') {
      return { scene: new ExcalidrawGenerator(this.config.generator).generate(document.root), document, diagnostics: [] };
    }
    const analysis = analyzeDistributed(document);
    return { scene: new DistributedExcalidrawGenerator(this.config.generator, this.config.distributed).generate(document, analysis),
      document, diagnostics: analysis.diagnostics };
  }
}
