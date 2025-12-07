# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.9] - 2025-12-06

### Fixed
- Fixed CLI `--version` command to dynamically read version from `package.json` instead of hardcoded value
- CLI version now automatically syncs with `package.json` version

## [0.1.8] - 2025-11-28

### Added
- **GlobalLimitExec** & **LocalLimitExec** operator support:
  - Visualizes global and local limit operations
  - Displays skip and fetch properties (e.g., "skip=0, fetch=2")
  - GlobalLimitExec validates exactly 1 input arrow (throws error if multiple inputs)
  - GlobalLimitExec always produces 1 output arrow
  - Preserves input/output columns and sort order from child nodes
  - Comprehensive test coverage with unit and integration tests

## [0.1.7] - 2025-11-28

### Added
- Comprehensive test suite for refactored utility classes:
  - `IdGenerator` tests (100% coverage)
  - `TextMeasurement` tests (100% coverage)
  - `PropertyParser` tests (93.5% coverage)
  - `ArrowPositionCalculator` tests (91.48% coverage)
  - `GeometryUtils` tests (100% coverage)
  - `LayoutCalculator` tests (100% coverage)
  - `ElementFactory` tests (100% coverage)
  - `ColumnLabelRenderer` tests (98.33% coverage)
  - `DetailTextBuilder` tests (100% coverage)
  - `NodeGeneratorRegistry` tests (100% coverage)
- Refactoring infrastructure for improved code organization:
  - Constants module for centralized configuration values
  - Element factory for consistent element creation
  - Property parser utility for extracting node properties
  - Arrow position calculator for layout calculations
  - Column label renderer for consistent label formatting
  - Geometry utilities for geometric calculations
  - Layout calculator for node positioning
  - ID generator for unique element IDs
  - Text measurement utility for text width estimation
  - Detail text builder for multi-line text creation
  - Node generator strategy interface and registry pattern
- 13 specialized node generators extracted from monolithic class:
  - `DataSourceNodeGenerator` - Handles file groups, ellipses, DynamicFilter visualization
  - `FilterNodeGenerator` - Handles filter predicates and projections
  - `CoalesceBatchesNodeGenerator` - Handles batch coalescing
  - `CoalescePartitionsNodeGenerator` - Handles partition coalescing
  - `RepartitionNodeGenerator` - Handles repartitioning with preserve_order and sort_exprs
  - `AggregateNodeGenerator` - Handles aggregation modes, grouping, ordering, date_bin functions
  - `ProjectionNodeGenerator` - Handles projection expressions and aliases
  - `SortNodeGenerator` - Handles sorting with preserve_partitioning
  - `SortPreservingMergeNodeGenerator` - Handles sort-preserving merge operations
  - `HashJoinNodeGenerator` - Handles hash joins with hash table visualization
  - `SortMergeJoinNodeGenerator` - Handles sort-merge joins with partition validation
  - `UnionNodeGenerator` - Handles union operations with multiple children
  - `DefaultNodeGenerator` - Fallback for unimplemented operators

### Changed
- **Major Refactoring**: `ExcalidrawGenerator` reduced from 6071 lines to 176 lines (97.1% reduction)
- Refactored `ExcalidrawGenerator` to coordinator pattern using strategy pattern
- Extracted all node-specific generation logic into specialized generator strategies
- Removed unused methods (`createArrowsWithEllipsis`, `createArrowWithBinding`, deprecated wrappers)
- Extracted registry initialization into `registerNodeGenerators()` method
- Improved test coverage from 79.15% to 95.97% statements
- Improved branch coverage from 73.75% to 90.07%
- Improved function coverage from 56.03% to 100%
- Improved line coverage from 79.39% to 96.29%
- Extracted magic numbers into constants module
- Centralized element creation logic into factory pattern
- Separated concerns into focused utility classes
- Improved code maintainability and testability
- Updated architecture documentation to reflect new modular structure
- Simplified and reorganized documentation structure:
  - Created `PROJECT_STRUCTURE.md` for detailed project organization
  - Moved detailed architecture content to `ARCHITECTURE.md`
  - Removed duplicate Quick Start section from `PROJECT_OVERVIEW.md`
  - Removed `REFACTORING_PLAN.md` (refactoring complete, info preserved in CHANGELOG and ARCHITECTURE)
  - Updated `QUICKSTART.md` to include npm package installation option

### Fixed
- Fixed TypeScript compilation errors in test files
- Fixed branch coverage for `GeometryUtils` class (now 100%)
- Fixed all test failures during incremental refactoring phases

## [0.1.6] - 2025-11-27

### Added
- Added "Additional advantages of using Excalidraw" section to README highlighting:
  - Ability to edit or extend graphical plans directly in Excalidraw
  - Export to PNG or SVG for sharing in documentation and presentations
  - Real-time collaborative editing capabilities
  - Layer annotations and styling for emphasis
  - Maintain visualization as a living artifact

### Changed
- Enhanced README introduction with clearer description of Excalidraw benefits
- Improved documentation about Excalidraw's editing and collaboration features

## [0.1.5] - 2025-11-27

### Changed
- Improved README documentation with clearer formatting and descriptions
- Enhanced Example section with better structure (Input/Output/Output Analysis)
- Updated API documentation for better clarity
- Improved documentation about test fixtures and examples
- Updated roadmap to mark interactive web interface as completed

### Added
- Added reference to [plan-visualizer](https://nga-tran.github.io/plan-visualizer) UI app as primary viewing option
- Enhanced documentation about visualization features and annotations

## [0.1.4] - 2025-11-25

### Added
- Added execution plan analysis documentation with annotated diagrams
- Example visualization with analysis annotations showing how to interpret execution plans

### Changed
- Updated README with output analysis section and annotated diagram example
- Removed completed roadmap item for plan comparison visualization

## [0.1.3] - 2025-11-25

### Added
- Support for `SortMergeJoin` and `SortMergeJoinExec` operators
- Display of `preserve_order=true` property in RepartitionExec (shown in dark red)
- Display of `sort_exprs` property in RepartitionExec (shows column names only)
- Column name labels on arrows connecting inputs to HashJoinExec and SortMergeJoin
- Integration test suite (`tests/integration.test.ts`) with 27 test cases
- Test fixtures organization: SQL files in `tests/`, expected outputs in `tests/expected/`
- Automatic normalization of non-deterministic fields in Excalidraw JSON for test comparisons

### Changed
- Removed deprecated `fontSize` configuration option from CLI code
- Removed deprecated `fontSize` configuration option from documentation
- Updated all examples to use `operatorFontSize` and `detailsFontSize` instead
- Updated CLI documentation to remove deprecated `--font-size` option
- Improved UnionExec arrow positioning to correctly connect child rectangles to parent
- Enhanced RepartitionExec sort order preservation logic for Hash and RoundRobinBatch partitioning
- Refactored `examples/` folder to `tests/` folder to better reflect dual purpose (test fixtures and examples)
- Reorganized test structure: unit tests in `src/`, integration tests in `tests/`
- Updated all documentation to reference `tests/` directory instead of `examples/`
- Improved test organization following Jest best practices

### Fixed
- Fixed arrow positioning in UnionExec when children have different widths
- Fixed arrow connections within UnionExec child subtrees after element shifting
- Fixed RepartitionExec sort order preservation for Hash and RoundRobinBatch partitioning modes

## [0.1.2] - 2025-11-23

### Changed
- Updated CI/CD pipeline configuration
- Added more colors to properties
- Updated README with examples

## [0.1.1] - 2025-11-22

### Changed
- Updated package repository information
- Prepared for npm publication

## [0.1.0] - 2025-11-17

### Added
- First release of plan-viz
- Convert Apache Data Fusion execution plans to Excalidraw format
- Parser for Apache Data Fusion Physical Execution Plans
- Excalidraw JSON generator
- CLI tool for converting plans
- Support for nested execution plan structures
- Configurable node dimensions and spacing
- Library and CLI interfaces
- Comprehensive test suite with >80% coverage
- TypeScript support with full type definitions
- Google TypeScript style guide compliance
- Clean Code architecture with SOLID principles
- Jest testing framework integration
- ESLint and Prettier configuration
- Commitizen for conventional commits

