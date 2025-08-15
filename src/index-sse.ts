#!/usr/bin/env node

import { AzureDevOpsMCPServer } from "./mcp-sse-server.js";

async function main() {
  // Get port from environment variable or use default
  const port = parseInt(process.env.PORT || '3000', 10);
  
  try {
    const server = new AzureDevOpsMCPServer(port);
    await server.start();
    
    console.log('');
    console.log('🎯 Server is ready! You can now:');
    console.log('1. Configure Cursor to use this SSE server');
    console.log('2. Use the HTTP endpoints for direct API access');
    console.log('3. Connect multiple clients to the same server');
    
  } catch (error) {
    console.error('Failed to start SSE server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
