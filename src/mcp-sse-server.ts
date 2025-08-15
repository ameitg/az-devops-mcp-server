/**
 * Azure DevOps MCP Server - SSE Transport Only
 * 
 * This server implements the Model Context Protocol (MCP) using Server-Sent Events (SSE) transport.
 * It provides tools for interacting with Azure DevOps APIs and can read configuration
 * directly from Cursor's MCP settings.
 * 
 * Key Features:
 * - SSE transport for persistent connections
 * - Azure DevOps API integration
 * - Automatic configuration from Cursor MCP settings
 * - HTTP endpoints for direct API access
 * - Comprehensive error handling
 */

// Import MCP SDK components for server functionality
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import Azure DevOps Node.js API libraries
import * as azdev from "azure-devops-node-api";                    // Main Azure DevOps API client
import * as ba from "azure-devops-node-api/BuildApi";             // Build management API
import * as ga from "azure-devops-node-api/GitApi";               // Git repository API
import * as wa from "azure-devops-node-api/WorkItemTrackingApi";  // Work item management API

// Import Azure DevOps interface types for type safety
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";      // Build-related interfaces
import * as gi from "azure-devops-node-api/interfaces/GitInterfaces";        // Git-related interfaces
import * as wi from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces"; // Work item interfaces

// Import web framework and middleware
import express from "express";  // Express.js web framework for HTTP server
import cors from "cors";        // Cross-Origin Resource Sharing middleware
import dotenv from "dotenv";    // Environment variable loader

// Load environment variables from .env file (if it exists)
dotenv.config();

/**
 * Interface defining the structure of Cursor MCP settings
 * These settings are read from Cursor's MCP configuration
 */
interface CursorMCPSettings {
  orgUrl?: string;      // Azure DevOps organization URL
  project?: string;     // Default project name (optional)
  token?: string;       // Personal Access Token for authentication
}

/**
 * Main Azure DevOps MCP Server class
 * 
 * This class implements:
 * - Express.js HTTP server with SSE support
 * - MCP protocol server for tool execution
 * - Azure DevOps API integration
 * - Configuration management from Cursor MCP settings
 */
export class AzureDevOpsMCPServer {
  // Azure DevOps API connection objects
  private connection: azdev.WebApi | null = null;           // Main API connection
  private buildApi: ba.IBuildApi | null = null;             // Build API client
  private gitApi: ga.IGitApi | null = null;                 // Git API client
  private workItemApi: wa.IWorkItemTrackingApi | null = null; // Work item API client
  
  // Server configuration
  private app: express.Express;                              // Express.js application instance
  private port: number;                                      // Server port number
  private mcpServer!: Server;                                // MCP protocol server instance
  private cursorSettings: CursorMCPSettings = {};            // Cursor MCP configuration settings

  /**
   * Constructor - initializes the server with specified port
   * @param port - Port number for the HTTP server (defaults to 9832)
   */
  constructor(port: number = 9832) {
    this.port = port;                                        // Store the port number
    this.app = express();                                    // Create new Express.js app
    this.setupExpress();                                     // Configure Express.js middleware and routes
    this.setupMCPServer();                                   // Initialize MCP protocol server
  }

  /**
   * Sets up Express.js middleware, CORS, and HTTP endpoints
   * This method configures the web server for handling HTTP requests
   */
  private setupExpress() {
    // Enable CORS (Cross-Origin Resource Sharing) for cross-origin requests
    // This allows Cursor and other clients to connect from different origins
    this.app.use(cors({
      origin: true,                    // Allow all origins (for development)
      credentials: true                // Allow credentials (cookies, auth headers)
    }));

    // Parse JSON request bodies automatically
    // This middleware converts JSON payloads to JavaScript objects
    this.app.use(express.json());

    // Health check endpoint - returns server status and configuration
    // Used by monitoring tools and clients to verify server health
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ 
        status: 'healthy',                                    // Server health status
        service: 'azure-devops-mcp-server',                   // Service name identifier
        cursorSettings: this.cursorSettings,                  // Current Cursor MCP settings
        connected: !!this.connection                          // Azure DevOps connection status
      });
    });

    // Cursor MCP settings endpoint - allows updating configuration via HTTP
    // This endpoint receives Azure DevOps credentials and project information
    this.app.post('/cursor-settings', async (req: express.Request, res: express.Response) => {
      try {
        // Extract configuration from request body
        const { orgUrl, project, token } = req.body;
        
        // Validate required fields
        if (!orgUrl || !token) {
          return res.status(400).json({ error: 'orgUrl and token are required' });
        }

        // Store the new configuration
        this.cursorSettings = { orgUrl, project, token };
        
        // Auto-connect to Azure DevOps if we have the required credentials
        if (orgUrl && token) {
          await this.connectAzureDevOps({ orgUrl, token });
          res.json({ 
            success: true, 
            message: 'Cursor MCP settings updated and connected to Azure DevOps',
            settings: { orgUrl, project, token: '***' }  // Hide token in response
          });
        } else {
          res.json({ 
            success: true, 
            message: 'Cursor MCP settings updated',
            settings: { orgUrl, project, token: '***' }  // Hide token in response
          });
        }
      } catch (error) {
        // Handle errors during configuration update
        res.status(500).json({ 
          error: 'Failed to update Cursor MCP settings', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Authentication endpoint - for manual Azure DevOps connection
    // This endpoint allows clients to connect to Azure DevOps without using Cursor MCP settings
    this.app.post('/auth', async (req: express.Request, res: express.Response) => {
      try {
        // Extract authentication details from request body
        const { orgUrl, token } = req.body;
        
        // Validate required fields
        if (!orgUrl || !token) {
          return res.status(400).json({ error: 'orgUrl and token are required' });
        }

        // Attempt to connect to Azure DevOps
        await this.connectAzureDevOps({ orgUrl, token });
        res.json({ success: true, message: 'Connected to Azure DevOps' });
      } catch (error) {
        // Handle connection errors
        res.status(500).json({ 
          error: 'Failed to connect to Azure DevOps', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Tool execution endpoint - for direct HTTP API access to MCP tools
    // This endpoint allows clients to execute MCP tools directly via HTTP POST
    this.app.post('/tools/:toolName', async (req: express.Request, res: express.Response) => {
      try {
        // Extract tool name from URL parameters and arguments from request body
        const { toolName } = req.params;
        const args = req.body;

        // Execute the requested tool with provided arguments
        const result = await this.executeTool(toolName, args);
        res.json(result);
      } catch (error) {
        // Handle tool execution errors
        res.status(500).json({ 
          error: `Failed to execute tool ${req.params.toolName}`, 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // GET endpoint for Cursor MCP settings - returns current configuration
    // This endpoint allows clients to retrieve the current configuration
    this.app.get('/cursor-settings', (req: express.Request, res: express.Response) => {
      res.json({
        settings: this.cursorSettings,                        // Current configuration
        connected: !!this.connection                          // Connection status
      });
    });
  }

  /**
   * Sets up the MCP protocol server and registers tool handlers
   * This method initializes the MCP server and defines all available tools
   */
  private setupMCPServer() {
    // Create new MCP server instance with metadata
    this.mcpServer = new Server(
      {
        name: "az-devops-mcp-server",                        // Server name identifier
        version: "1.0.0",                                    // Server version
      },
      {
        capabilities: {
          tools: {},                                         // Tool capabilities (empty for now)
        },
      }
    );

    // Register handler for listing available tools
    // This handler responds to MCP ListTools requests
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Tool: Connect to Azure DevOps
          {
            name: "connect_azure_devops",                     // Tool identifier
            description: "Connect to Azure DevOps organization using personal access token", // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                orgUrl: {                                    // Organization URL property
                  type: "string",                            // String type
                  description: "Azure DevOps organization URL (e.g., https://dev.azure.com/yourorgname)" // Description
                },
                token: {                                     // Personal Access Token property
                  type: "string",                            // String type
                  description: "Personal Access Token"       // Description
                }
              },
              required: ["orgUrl", "token"]                  // Required fields
            }
          },
          // Tool: List Azure DevOps projects
          {
            name: "list_projects",                           // Tool identifier
            description: "List all projects in the Azure DevOps organization", // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {},                                // No properties needed
              required: []                                   // No required fields
            }
          },
          // Tool: List build definitions
          {
            name: "list_build_definitions",                   // Tool identifier
            description: "List build definitions for a specific project", // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                }
              },
              required: ["project"]                          // Required fields
            }
          },
          // Tool: Get build details
          {
            name: "get_build",                               // Tool identifier
            description: "Get build details by ID",          // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                },
                buildId: {                                   // Build ID property
                  type: "number",                            // Number type
                  description: "Build ID"                    // Description
                }
              },
              required: ["project", "buildId"]               // Required fields
            }
          },
          // Tool: List Git repositories
          {
            name: "list_repositories",                       // Tool identifier
            description: "List Git repositories for a specific project", // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                }
              },
              required: ["project"]                          // Required fields
            }
          },
          // Tool: Get repository details
          {
            name: "get_repository",                          // Tool identifier
            description: "Get repository details by ID",     // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                },
                repositoryId: {                              // Repository ID property
                  type: "string",                            // String type
                  description: "Repository ID"               // Description
                }
              },
              required: ["project", "repositoryId"]          // Required fields
            }
          },
          // Tool: List work items using WIQL
          {
            name: "list_work_items",                         // Tool identifier
            description: "List work items using a WIQL query", // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                },
                query: {                                     // WIQL query property
                  type: "string",                            // String type
                  description: "WIQL query string"           // Description
                }
              },
              required: ["project", "query"]                 // Required fields
            }
          },
          // Tool: Get work item details
          {
            name: "get_work_item",                           // Tool identifier
            description: "Get work item details by ID",      // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                workItemId: {                                // Work item ID property
                  type: "number",                            // Number type
                  description: "Work Item ID"                // Description
                }
              },
              required: ["workItemId"]                       // Required fields
            }
          },
          // Tool: Create new work item
          {
            name: "create_work_item",                        // Tool identifier
            description: "Create a new work item",           // Tool description
            inputSchema: {                                    // Input parameter schema
              type: "object",                                // Expects an object
              properties: {                                  // Object properties
                project: {                                   // Project property
                  type: "string",                            // String type
                  description: "Project name or ID"          // Description
                },
                workItemType: {                              // Work item type property
                  type: "string",                            // String type
                  description: "Work item type (e.g., Bug, Task, User Story)" // Description
                },
                title: {                                     // Title property
                  type: "string",                            // String type
                  description: "Work item title"             // Description
                },
                description: {                               // Description property
                  type: "string",                            // String type
                  description: "Work item description"       // Description
                }
              },
              required: ["project", "workItemType", "title"] // Required fields
            }
          }
        ]
      };
    });

    // Register handler for executing tools
    // This handler responds to MCP CallTool requests
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Extract tool name and arguments from the request
      const { name, arguments: args } = request.params;

      try {
        // Execute the requested tool with provided arguments
        const result = await this.executeTool(name, args);
        return result;
      } catch (error) {
        // Return error information if tool execution fails
        return {
          content: [
            {
              type: "text",                                  // Content type is text
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}` // Error message
            }
          ]
        };
      }
    });
  }

  /**
   * Executes the specified MCP tool with given arguments
   * This method routes tool calls to the appropriate Azure DevOps API methods
   * 
   * @param toolName - Name of the tool to execute
   * @param args - Arguments for the tool
   * @returns Promise with tool execution result
   */
  private async executeTool(toolName: string, args: any) {
    // Route tool execution based on tool name
    switch (toolName) {
      case "connect_azure_devops":
        // Validate arguments for Azure DevOps connection
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for connect_azure_devops");
        }
        // Cast arguments to expected type
        const connectArgs = args as { orgUrl: string; token: string };
        
        // Update cursor settings when connecting
        this.cursorSettings = { 
          orgUrl: connectArgs.orgUrl,                        // Store organization URL
          token: connectArgs.token,                          // Store authentication token
          project: this.cursorSettings.project               // Preserve existing project setting
        };
        
        // Execute the connection
        return await this.connectAzureDevOps(connectArgs);
        
      case "list_projects":
        // List all projects in the organization
        return await this.listProjects();
        
      case "list_build_definitions":
        // Validate arguments for listing build definitions
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for list_build_definitions");
        }
        // Cast arguments to expected type
        const buildDefArgs = args as { project: string };
        // Execute the tool
        return await this.listBuildDefinitions(buildDefArgs.project);
        
      case "get_build":
        // Validate arguments for getting build details
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for get_build");
        }
        // Cast arguments to expected type
        const getBuildArgs = args as { project: string; buildId: number };
        // Execute the tool
        return await this.getBuild(getBuildArgs.project, getBuildArgs.buildId);
        
      case "list_repositories":
        // Validate arguments for listing repositories
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for list_repositories");
        }
        // Cast arguments to expected type
        const listRepoArgs = args as { project: string };
        // Execute the tool
        return await this.listRepositories(listRepoArgs.project);
        
      case "get_repository":
        // Validate arguments for getting repository details
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for get_repository");
        }
        // Cast arguments to expected type
        const getRepoArgs = args as { project: string; repositoryId: string };
        // Execute the tool
        return await this.getRepository(getRepoArgs.project, getRepoArgs.repositoryId);
        
      case "list_work_items":
        // Validate arguments for listing work items
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for list_work_items");
        }
        // Cast arguments to expected type
        const listWorkItemsArgs = args as { project: string; query: string };
        // Execute the tool
        return await this.listWorkItems(listWorkItemsArgs.project, listWorkItemsArgs.query);
        
      case "get_work_item":
        // Validate arguments for getting work item details
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for get_work_item");
        }
        // Cast arguments to expected type
        const getWorkItemArgs = args as { workItemId: number };
        // Execute the tool
        return await this.getWorkItem(getWorkItemArgs.workItemId);
        
      case "create_work_item":
        // Validate arguments for creating work items
        if (!args || typeof args !== 'object') {
          throw new Error("Invalid arguments for create_work_item");
        }
        // Cast arguments to expected type
        const createWorkItemArgs = args as { project: string; workItemType: string; title: string; description?: string };
        // Execute the tool
        return await this.createWorkItem(createWorkItemArgs.project, createWorkItemArgs.workItemType, createWorkItemArgs.title, createWorkItemArgs.description);
        
      default:
        // Throw error for unknown tools
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Starts the Express.js HTTP server and attempts auto-connection
   * This method initializes the web server and logs available endpoints
   */
  public async start() {
    try {
      // Start the Express.js HTTP server on the specified port
      this.app.listen(this.port, () => {
        // Log server startup information
        console.log(`🚀 Azure DevOps MCP Server (SSE) running on port ${this.port}`);
        console.log(`📡 MCP SSE endpoint: http://localhost:${this.port}/mcp`);
        console.log(`🔐 Auth endpoint: http://localhost:${this.port}/auth`);
        console.log(`⚙️  Cursor MCP settings: http://localhost:${this.port}/cursor-settings`);
        console.log(`🛠️  Tools endpoint: http://localhost:${this.port}/tools/:toolName`);
        console.log(`💚 Health check: http://localhost:${this.port}/health`);
        console.log('');
        console.log('📋 To use with Cursor, add this to your mcp.json:');
        console.log(`{
  "mcpServers": {
    "azure-devops": {
      "transport": "sse",
      "url": "http://localhost:${this.port}/mcp",
      "orgUrl": "https://dev.azure.com/YOUR_ORG_NAME",
      "project": "YOUR_PROJECT_NAME",
      "token": "YOUR_PERSONAL_ACCESS_TOKEN"
    }
  }
}`);
        console.log('');
        console.log('🔗 Or use the direct HTTP endpoints for testing');
        console.log('💡 The server will automatically read Azure DevOps config from Cursor MCP settings!');
      });

      // Try to auto-connect if environment variables are set
      // This allows the server to connect automatically on startup
      const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;        // Get org URL from environment
      const token = process.env.AZURE_DEVOPS_TOKEN;           // Get token from environment
      
      if (orgUrl && token) {
        console.log('🔗 Auto-connecting to Azure DevOps using environment variables...');
        try {
          // Attempt to connect using environment variables
          await this.connectAzureDevOps({ orgUrl, token });
          console.log('✅ Auto-connection successful!');
        } catch (error) {
          // Log auto-connection failures (non-fatal)
          console.log('⚠️  Auto-connection failed:', error instanceof Error ? error.message : String(error));
        }
      } else {
        // Inform user about auto-connection options
        console.log('ℹ️  Set AZURE_DEVOPS_ORG_URL and AZURE_DEVOPS_TOKEN environment variables for auto-connection');
        console.log('💡 Or configure directly in Cursor MCP settings - the server will read them automatically!');
      }

    } catch (error) {
      // Handle server startup errors
      console.error('Failed to start SSE server:', error);
      throw error;
    }
  }

  // ============================================================================
  // AZURE DEVOPS API METHODS
  // These methods implement the actual Azure DevOps API calls
  // ============================================================================

  /**
   * Connects to Azure DevOps organization using provided credentials
   * This method establishes the connection and initializes API clients
   * 
   * @param args - Connection arguments containing orgUrl and token
   * @returns Promise with connection result
   */
  private async connectAzureDevOps(args: { orgUrl: string; token: string }) {
    try {
      // Create authentication handler using Personal Access Token
      const authHandler = azdev.getPersonalAccessTokenHandler(args.token);
      
      // Create WebApi instance with organization URL and auth handler
      this.connection = new azdev.WebApi(args.orgUrl, authHandler);
      
      // Initialize API clients for different Azure DevOps services
      this.buildApi = await this.connection.getBuildApi();           // Build management API
      this.gitApi = await this.connection.getGitApi();               // Git repository API
      this.workItemApi = await this.connection.getWorkItemTrackingApi(); // Work item API

      // Return success message
      return {
        content: [
          {
            type: "text",                                              // Content type
            text: `Successfully connected to Azure DevOps organization: ${args.orgUrl}` // Success message
          }
        ]
      };
    } catch (error) {
      // Handle connection errors
      throw new Error(`Failed to connect to Azure DevOps: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lists all projects in the Azure DevOps organization
   * This method retrieves project information using the Core API
   * 
   * @returns Promise with list of projects
   */
  private async listProjects() {
    // Check if connected to Azure DevOps
    if (!this.connection) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Get Core API client for project operations
    const coreApi = await this.connection.getCoreApi();
    
    // Retrieve all projects from the organization
    const projects = await coreApi.getProjects();
    
    // Format project list for display
    const projectList = projects.map(p => `- ${p.name} (${p.id})`).join('\n');
    
    // Return formatted result
    return {
      content: [
        {
          type: "text",                    // Content type
          text: `Projects:\n${projectList}` // Formatted project list
        }
      ]
    };
  }

  /**
   * Lists build definitions for a specific project
   * This method retrieves build pipeline definitions
   * 
   * @param project - Project name or ID
   * @returns Promise with list of build definitions
   */
  private async listBuildDefinitions(project: string) {
    // Check if build API is available
    if (!this.buildApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Retrieve build definitions for the specified project
    const definitions = await this.buildApi.getDefinitions(project);
    
    // Format build definitions list for display
    const defList = definitions.map(d => `- ${d.name} (${d.id})`).join('\n');
    
    // Return formatted result
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Build Definitions for project ${project}:\n${defList}` // Formatted list
        }
      ]
    };
  }

  /**
   * Retrieves build details by ID for a specific project
   * This method gets comprehensive build information
   * 
   * @param project - Project name or ID
   * @param buildId - Build ID number
   * @returns Promise with build details
   */
  private async getBuild(project: string, buildId: number) {
    // Check if build API is available
    if (!this.buildApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Retrieve build details using project and build ID
    const build = await this.buildApi.getBuild(project, buildId);
    
    // Return formatted build information
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Build Details:\nID: ${build.id}\nName: ${build.buildNumber}\nStatus: ${build.status}\nResult: ${build.result}\nStart Time: ${build.startTime}\nFinish Time: ${build.finishTime}` // Formatted build details
        }
      ]
    };
  }

  /**
   * Lists Git repositories for a specific project
   * This method retrieves repository information
   * 
   * @param project - Project name or ID
   * @returns Promise with list of repositories
   */
  private async listRepositories(project: string) {
    // Check if Git API is available
    if (!this.gitApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Retrieve repositories for the specified project
    const repositories = await this.gitApi.getRepositories(project);
    
    // Format repository list for display
    const repoList = repositories.map(r => `- ${r.name} (${r.id})`).join('\n');
    
    // Return formatted result
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Repositories for project ${project}:\n${repoList}` // Formatted repository list
        }
      ]
    };
  }

  /**
   * Retrieves repository details by ID for a specific project
   * This method gets comprehensive repository information
   * 
   * @param project - Project name or ID
   * @param repositoryId - Repository ID string
   * @returns Promise with repository details
   */
  private async getRepository(project: string, repositoryId: string) {
    // Check if Git API is available
    if (!this.gitApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Retrieve repository details using repository ID and project
    const repository = await this.gitApi.getRepository(repositoryId, project);
    
    // Return formatted repository information
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Repository Details:\nName: ${repository.name}\nID: ${repository.id}\nDefault Branch: ${repository.defaultBranch}\nSize: ${repository.size} bytes\nRemote URL: ${repository.remoteUrl}` // Formatted repository details
        }
      ]
    };
  }

  /**
   * Lists work items using a WIQL (Work Item Query Language) query
   * This method executes WIQL queries to find work items
   * 
   * @param project - Project name or ID
   * @param query - WIQL query string
   * @returns Promise with list of work items
   */
  private async listWorkItems(project: string, query: string) {
    // Check if work item API is available
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Create WIQL query object
    const wiql = {
      query: query                                        // WIQL query string
    };
    
    // Execute WIQL query to find work items
    const queryResult = await this.workItemApi.queryByWiql(wiql, undefined, undefined, undefined);
    
    // Check if work items were found
    if (queryResult.workItems && queryResult.workItems.length > 0) {
      // Extract work item IDs and filter out undefined values
      const workItemIds = queryResult.workItems.map(wi => wi.id).filter((id): id is number => id !== undefined);
      
      // Retrieve full work item details using IDs
      const workItems = await this.workItemApi.getWorkItems(workItemIds);
      
      // Format work item list for display
      const workItemList = workItems.map(wi => `- ${wi.fields?.['System.Title'] || 'No Title'} (${wi.id})`).join('\n');
      
      // Return formatted result
      return {
        content: [
          {
            type: "text",                    // Content type
            text: `Work Items:\n${workItemList}` // Formatted work item list
          }
        ]
      };
    } else {
      // Return message if no work items found
      return {
        content: [
          {
            type: "text",                    // Content type
            text: "No work items found matching the query." // No results message
          }
        ]
      };
    }
  }

  /**
   * Retrieves work item details by ID
   * This method gets comprehensive work item information
   * 
   * @param workItemId - Work item ID number
   * @returns Promise with work item details
   */
  private async getWorkItem(workItemId: number) {
    // Check if work item API is available
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Retrieve work item details using ID
    const workItem = await this.workItemApi.getWorkItem(workItemId);
    
    // Return formatted work item information
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Work Item Details:\nID: ${workItem.id}\nType: ${workItem.fields?.['System.WorkItemType']}\nTitle: ${workItem.fields?.['System.Title']}\nState: ${workItem.fields?.['System.State']}\nAssigned To: ${workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned'}` // Formatted work item details
        }
      ]
    };
  }

  /**
   * Creates a new work item in the specified project
   * This method creates work items with title and optional description
   * 
   * @param project - Project name or ID
   * @param workItemType - Type of work item (e.g., Bug, Task, User Story)
   * @param title - Work item title
   * @param description - Optional work item description
   * @returns Promise with creation result
   */
  private async createWorkItem(project: string, workItemType: string, title: string, description?: string) {
    // Check if work item API is available
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    // Create work item patch operations array
    const workItem = [
      {
        op: "add",                                         // Operation type: add
        path: "/fields/System.Title",                      // Field path for title
        value: title                                       // Title value
      }
    ];

    // Add description field if provided
    if (description) {
      workItem.push({
        op: "add",                                         // Operation type: add
        path: "/fields/System.Description",                // Field path for description
        value: description                                 // Description value
      });
    }

    // Create the work item using Azure DevOps API
    const createdWorkItem = await this.workItemApi.createWorkItem({}, workItem, project, workItemType);
    
    // Return success message with created work item details
    return {
      content: [
        {
          type: "text",                                    // Content type
          text: `Successfully created work item:\nID: ${createdWorkItem.id}\nType: ${workItemType}\nTitle: ${title}` // Success message with details
        }
      ]
    };
  }
}
