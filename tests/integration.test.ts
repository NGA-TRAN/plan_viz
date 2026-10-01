import * as fs from 'fs';
import * as path from 'path';
import { convertPlanToExcalidraw } from '../src/index';
import { ExcalidrawData } from '../src/types/excalidraw.types';
import { assertTextBindings } from '../src/generators/__tests__/utils/text-binding-assertions';

/**
 * Normalizes Excalidraw JSON by removing non-deterministic fields
 * This allows comparison of generated files with expected files
 */
function normalizeExcalidraw(data: ExcalidrawData): ExcalidrawData {
  const normalized = JSON.parse(JSON.stringify(data));

  // Remove non-deterministic fields from each element
  normalized.elements = normalized.elements.map((element: any) => {
    const normalizedElement = { ...element };

    // Remove fields that change between runs
    delete normalizedElement.id;
    delete normalizedElement.seed;
    delete normalizedElement.versionNonce;
    delete normalizedElement.updated;
    delete normalizedElement.index;

    // Remove ID references in containerId
    if (normalizedElement.containerId) {
      delete normalizedElement.containerId;
    }

    // Remove ID references in bindings
    if (normalizedElement.startBinding?.elementId) {
      delete normalizedElement.startBinding.elementId;
    }
    if (normalizedElement.endBinding?.elementId) {
      delete normalizedElement.endBinding.elementId;
    }

    // Remove ID references in groupIds
    if (normalizedElement.groupIds && Array.isArray(normalizedElement.groupIds)) {
      normalizedElement.groupIds = [];
    }

    // Remove boundElements because bindings depend on generated IDs
    if (normalizedElement.boundElements) {
      normalizedElement.boundElements = [];
    }

    return normalizedElement;
  });

  return normalized;
}

/**
 * Gets all single-node and distributed SQL fixtures
 */
const fixtureDirectories = [__dirname, path.join(__dirname, 'distributed')];

function getSqlFiles(): string[] {
  return fixtureDirectories.flatMap((directory) =>
    fs.readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => path.join(directory, file))
  );
}

describe('Examples Integration Tests', () => {
  const sqlFiles = getSqlFiles();

  test.each(sqlFiles)('should generate correct excalidraw for %s', (sqlFilePath) => {
    // Read SQL file
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Get expected excalidraw file path
    const sqlFileName = path.basename(sqlFilePath, '.sql');
    const expectedPath = path.join(
      path.dirname(sqlFilePath),
      'expected',
      `${sqlFileName}.excalidraw`
    );

    // Check if expected file exists
    if (!fs.existsSync(expectedPath)) {
      throw new Error(
        `Expected file not found: ${expectedPath}. ` +
        `Each fixture directory must have a matching expected/ drawing`
      );
    }

    // Read expected excalidraw
    const expectedContent = fs.readFileSync(expectedPath, 'utf-8');
    const expectedData: ExcalidrawData = JSON.parse(expectedContent);

    // Generate excalidraw from SQL
    const generatedData = convertPlanToExcalidraw(sqlContent);

    // Check binding references before normalization removes them.
    assertTextBindings(generatedData.elements);

    // Normalize both for comparison
    const normalizedExpected = normalizeExcalidraw(expectedData);
    const normalizedGenerated = normalizeExcalidraw(generatedData);

    // Compare
    expect(normalizedGenerated).toEqual(normalizedExpected);
  });

  test.each(fixtureDirectories)('should have matching SQL and expected excalidraw files in %s', (testsDir) => {
    const expectedDir = path.join(testsDir, 'expected');

    const sqlFiles = fs
      .readdirSync(testsDir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => path.basename(file, '.sql'));

    const expectedFiles = fs
      .readdirSync(expectedDir)
      .filter((file) => file.endsWith('.excalidraw'))
      .map((file) => path.basename(file, '.excalidraw'));

    // Check that every SQL file has a corresponding expected file
    const missingExpected = sqlFiles.filter(
      (sqlFile) => !expectedFiles.includes(sqlFile)
    );

    expect(missingExpected).toEqual([]);

    // Check that every expected file has a corresponding SQL file
    const orphanedExpected = expectedFiles.filter(
      (expectedFile) => !sqlFiles.includes(expectedFile)
    );

    expect(orphanedExpected).toEqual([]);
  });
});
