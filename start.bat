@echo off
REM Azure DevOps MCP Server Quick Start Script for Windows

echo 🚀 Starting Azure DevOps MCP Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Check if build exists
if not exist "dist" (
    echo 🔨 Building project...
    npm run build
)

echo ✅ Starting server in development mode...
echo 📝 The server is now ready to accept MCP connections.
echo 🔗 Use an MCP client to connect to this server.
echo.
echo Press Ctrl+C to stop the server.

REM Start the server
npm run dev

pause


