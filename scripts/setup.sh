#!/bin/bash

echo "🚀 Setting up datafusion-plan-viz..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Build the project
echo "🔨 Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed"
else
    echo "✅ All tests passed"
fi
echo ""

# Run linter
echo "🔍 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  Linting issues found. Run 'npm run lint:fix' to auto-fix"
else
    echo "✅ No linting issues"
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  • Run 'npm test' to run tests"
echo "  • Run 'npm run build' to build the project"
echo "  • Run 'node dist/cli.js -i examples/simple-plan.txt -o output.json' to try the CLI"
echo "  • Check out QUICKSTART.md for more examples"
echo ""

