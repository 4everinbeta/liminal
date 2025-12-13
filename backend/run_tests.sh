#!/bin/bash
# Test runner script for Liminal API
# Can be run outside the IDE

set -e

echo "Installing test dependencies..."
pip install -q -r requirements.txt

echo ""
echo "Running API integration tests..."
echo "================================"
pytest

echo ""
echo "✓ All tests completed!"
