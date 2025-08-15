#!/usr/bin/env node

import { AzureDevOpsMCPServer } from "./mcp-sse-server.js";
import * as readline from "readline";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface AzureDevOpsConfig {
  orgUrl: string;
  token: string;
  project?: string;
  port: number;
}

class InteractiveStarter {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private async getPort(): Promise<number> {
    const portInput = await this.question("Enter port number (default: 3000): ");
    const port = parseInt(portInput) || 3000;
    return port;
  }

  private async getOrgUrl(): Promise<string> {
    let orgUrl = await this.question("Enter Azure DevOps organization URL (e.g., https://dev.azure.com/yourorgname): ");
    
    // Validate and format the URL
    if (!orgUrl.startsWith('http')) {
      orgUrl = `https://dev.azure.com/${orgUrl}`;
    }
    
    if (!orgUrl.includes('dev.azure.com')) {
      orgUrl = `https://dev.azure.com/${orgUrl}`;
    }
    
    return orgUrl;
  }

  private async getPersonalAccessToken(): Promise<string> {
    const token = await this.question("Enter your Personal Access Token (PAT): ");
    if (!token.trim()) {
      throw new Error("Personal Access Token is required");
    }
    return token.trim();
  }

  private async getProject(): Promise<string | undefined> {
    const project = await this.question("Enter project name (optional, press Enter to skip): ");
    return project.trim() || undefined;
  }

  private async confirmConfig(config: AzureDevOpsConfig): Promise<boolean> {
    console.log("\n📋 Configuration Summary:");
    console.log(`   Port: ${config.port}`);
    console.log(`   Organization: ${config.orgUrl}`);
    console.log(`   Project: ${config.project || 'Not specified'}`);
    console.log(`   Token: ${'*'.repeat(Math.min(config.token.length, 8))}...`);
    
    const confirm = await this.question("\nDoes this look correct? (y/N): ");
    return confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
  }

  private async saveToEnvFile(config: AzureDevOpsConfig): Promise<void> {
    const saveEnv = await this.question("\nSave configuration to .env file for future use? (y/N): ");
    
    if (saveEnv.toLowerCase() === 'y' || saveEnv.toLowerCase() === 'yes') {
      const fs = await import('fs');
      const envContent = `AZURE_DEVOPS_ORG_URL=${config.orgUrl}
AZURE_DEVOPS_TOKEN=${config.token}
PORT=${config.port}
`;
      
      try {
        fs.writeFileSync('.env', envContent);
        console.log("✅ Configuration saved to .env file");
      } catch (error) {
        console.log("⚠️  Could not save to .env file:", error);
      }
    }
  }

  private async testConnection(config: AzureDevOpsConfig): Promise<boolean> {
    console.log("\n🔗 Testing Azure DevOps connection...");
    
    try {
      const server = new AzureDevOpsMCPServer(config.port);
      
      // Test the connection before starting the full server
      const azdev = await import('azure-devops-node-api');
      const testServer = new azdev.WebApi(
        config.orgUrl,
        azdev.getPersonalAccessTokenHandler(config.token)
      );
      
      const coreApi = await testServer.getCoreApi();
      const projects = await coreApi.getProjects();
      
      console.log(`✅ Connection successful! Found ${projects.length} project(s)`);
      
      if (projects.length > 0) {
        console.log("\n📁 Available projects:");
        projects.forEach((project, index) => {
          console.log(`   ${index + 1}. ${project.name} (${project.id})`);
        });
        
        if (config.project) {
          const foundProject = projects.find(p => 
            p.name && p.name.toLowerCase() === config.project!.toLowerCase()
          );
          if (foundProject) {
            console.log(`\n🎯 Project '${config.project}' found and accessible`);
          } else {
            console.log(`\n⚠️  Project '${config.project}' not found. You can still use the server to browse projects.`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.log(`❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  public async start(): Promise<void> {
    try {
      console.log("🚀 Azure DevOps MCP Server - Interactive Setup");
      console.log("=============================================\n");
      
      // Check if .env file exists and offer to use it
      const fs = await import('fs');
      if (fs.existsSync('.env')) {
        const useEnv = await this.question("Found .env file. Use existing configuration? (Y/n): ");
        if (useEnv.toLowerCase() !== 'n' && useEnv.toLowerCase() !== 'no') {
          console.log("✅ Using existing .env configuration");
          const server = new AzureDevOpsMCPServer();
          await server.start();
          return;
        }
      }
      
      // Get configuration interactively
      const config: AzureDevOpsConfig = {
        port: await this.getPort(),
        orgUrl: await this.getOrgUrl(),
        token: await this.getPersonalAccessToken(),
        project: await this.getProject()
      };
      
      // Confirm configuration
      if (!(await this.confirmConfig(config))) {
        console.log("❌ Setup cancelled. Please run the command again.");
        this.rl.close();
        return;
      }
      
      // Test connection
      if (!(await this.testConnection(config))) {
        const retry = await this.question("\nConnection failed. Retry with different credentials? (y/N): ");
        if (retry.toLowerCase() === 'y' || retry.toLowerCase() === 'yes') {
          this.rl.close();
          return this.start();
        } else {
          console.log("❌ Setup cancelled due to connection failure.");
          this.rl.close();
          return;
        }
      }
      
      // Save configuration if requested
      await this.saveToEnvFile(config);
      
      // Start the server
      console.log("\n🚀 Starting Azure DevOps MCP Server...");
      const server = new AzureDevOpsMCPServer(config.port);
      await server.start();
      
      console.log("\n🎉 Server started successfully!");
      console.log("📋 To use with Cursor, add this to your mcp.json:");
      console.log(`{
  "mcpServers": {
    "azure-devops": {
      "transport": "sse",
      "url": "http://localhost:${config.port}/mcp"
    }
  }
}`);
      
    } catch (error) {
      console.error("❌ Error during setup:", error);
    } finally {
      this.rl.close();
    }
  }
}

// Start the interactive setup
const starter = new InteractiveStarter();
starter.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
