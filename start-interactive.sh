#!/bin/bash

# Azure DevOps MCP Server - Interactive Startup Script

echo "🚀 Starting Azure DevOps MCP Server in Interactive Mode..."
echo "========================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
fi

echo "✅ Starting interactive setup..."
echo ""

# Start the interactive server
npm start
