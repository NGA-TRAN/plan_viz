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

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment. The pipeline automatically:

1. **Lints** code on every push and pull request
2. **Tests** on multiple Node.js versions (20, 22, latest)
3. **Builds** the project to verify compilation
4. **Publishes** to npm when a version tag is pushed (e.g., `v1.0.0`)

### Pipeline Jobs

- **Lint**: Runs ESLint to check code style
- **Test**: Runs Jest tests with coverage on multiple Node versions
- **Build**: Compiles TypeScript and verifies build artifacts
- **Publish**: Publishes to npm when a version tag is pushed

### Publishing a New Version

To publish a new version to npm:

1. **Update version in package.json**:
   ```bash
   npm version patch  # for 0.1.0 -> 0.1.1
   npm version minor  # for 0.1.0 -> 0.2.0
   npm version major  # for 0.1.0 -> 1.0.0
   ```

2. **Push the version tag**:
   ```bash
   git push origin main --tags
   ```

3. **The CI/CD pipeline will automatically**:
   - Run all tests and linting
   - Build the project
   - Verify the package.json version matches the tag
   - Publish to npm (if NPM_TOKEN is configured)

### Setting Up NPM_TOKEN

To enable automatic publishing, you need to configure an npm access token:

1. **Create an npm access token**:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Log in and go to Access Tokens
   - Create a new "Automation" token (for CI/CD)

2. **Add the token to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm access token
   - Click "Add secret"

The pipeline will use this token to authenticate with npm when publishing.

### Version Tag Format

Version tags must follow the format `v<version>` (e.g., `v0.1.0`, `v1.2.3`). The pipeline will:
- Extract the version from the tag
- Verify it matches `package.json`
- Publish to npm with that version

## Questions?

Feel free to open an issue for any questions or concerns.

