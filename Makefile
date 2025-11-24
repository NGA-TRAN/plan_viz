.PHONY: all build clean test test-watch test-coverage lint lint-fix format prepublish commit help install

# Default target
help:
	@echo "Available commands:"
	@echo "  make all            - Run lint, format, clean, build, test, and test-coverage"
	@echo "  make build          - Build the project (tsc)"
	@echo "  make clean          - Clean dist and coverage directories"
	@echo "  make test           - Run tests (jest)"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo "  make test-coverage  - Run tests with coverage"
	@echo "  make lint           - Run linter (eslint)"
	@echo "  make lint-fix       - Run linter and fix issues"
	@echo "  make format         - Format code with Prettier"
	@echo "  make prepublish     - Run clean, build, and test (prepublish steps)"
	@echo "  make commit         - Commit changes using commitizen"
	@echo "  make install        - Install dependencies"

all: lint clean build test test-coverage

build:
	npm run build

clean:
	npm run clean

test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

prepublish:
	npm run prepublishOnly

commit:
	npm run commit

install:
	npm install

