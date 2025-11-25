# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

