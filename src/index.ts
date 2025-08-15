#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AzureDevOpsMCPServer } from "./server.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Get configuration from environment variables
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  const token = process.env.AZURE_DEVOPS_PAT;
  const project = process.env.AZURE_DEVOPS_PROJECT;

  if (!orgUrl || !token) {
    console.error("❌ Missing required environment variables:");
    console.error("   AZURE_DEVOPS_ORG_URL - Your Azure DevOps organization URL");
    console.error("   AZURE_DEVOPS_PAT - Your Personal Access Token");
    console.error("");
    console.error("💡 Create a .env file with these variables or set them in your environment.");
    process.exit(1);
  }

  try {
    // Create Azure DevOps MCP server instance
    const azureDevOpsServer = new AzureDevOpsMCPServer({
      orgUrl,
      token,
      project
    });

    // Create MCP server with stdio transport
    const server = new Server(
      {
        name: "azure-devops-mcp-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools
    const tools = azureDevOpsServer.getTools();
    for (const tool of tools) {
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
          tools: tools
        };
      });

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
          const result = await azureDevOpsServer.handleToolCall(request.params.name, request.params.arguments);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      });
    }

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Start the server with stdio transport
    await server.connect(transport);

    console.error("🚀 Azure DevOps MCP Server started successfully!");
    console.error(`📋 Connected to: ${orgUrl}`);
    if (project) {
      console.error(`📁 Default project: ${project}`);
    }
    console.error("💡 Use this server in Cursor with stdio transport");

  } catch (error) {
    console.error("❌ Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
