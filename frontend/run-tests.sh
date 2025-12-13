#!/bin/bash
# Test runner script for Liminal Frontend
# Can be run outside the IDE

set -e

echo "📦 Installing dependencies..."
npm install --silent

echo ""
echo "🧪 Running Component Tests (Vitest)..."
echo "========================================"
npm run test -- --run

echo ""
echo "🎭 Running E2E Tests (Playwright)..."
echo "====================================="
npm run test:e2e

echo ""
echo "✅ All frontend tests completed successfully!"
