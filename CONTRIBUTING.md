# Contributing to plan-viz

Thank you for your interest in contributing! We follow trunk-based development and use conventional commits.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/plan-viz.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Building

```bash
# Build the project
npm run build

# Clean build artifacts
npm run clean
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) specification.

```bash
# Use commitizen for guided commits
npm run commit
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat: add support for window functions in parser
fix: correct arrow positioning for multiple children
docs: update API documentation with examples
test: add tests for nested execution plans
```

## Code Style

- Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Use Clean Code principles
- Apply SOLID principles
- Write self-documenting code
- Add comments for complex logic

## Testing Requirements

- Maintain minimum 80% code coverage
- Write unit tests for all new features
- Include edge case testing
- Test error handling

## Pull Request Process

1. Update documentation for any changed functionality
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Ensure code is linted: `npm run lint`
5. Update README.md if needed
6. Create a pull request with a clear description

## Code Review

All submissions require review. We aim to:

- Provide constructive feedback
- Respond within 48 hours
- Maintain high code quality standards

## Questions?

Feel free to open an issue for any questions or concerns.

