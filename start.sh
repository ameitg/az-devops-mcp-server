#!/bin/bash

# Azure DevOps MCP Server Quick Start Script

echo "🚀 Starting Azure DevOps MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
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

echo "✅ Starting server in development mode..."
echo "📝 The server is now ready to accept MCP connections."
echo "🔗 Use an MCP client to connect to this server."
echo ""
echo "Press Ctrl+C to stop the server."

# Start the server
npm run dev


