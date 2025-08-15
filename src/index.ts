#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AzureDevOpsServer } from "./server.js";

async function main() {
  const transport = new StdioServerTransport();
  const server = new Server(
    {
      name: "az-devops-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const azureDevOpsServer = new AzureDevOpsServer();
  azureDevOpsServer.initialize(server);

  await server.connect(transport);
  console.error("Azure DevOps MCP Server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
