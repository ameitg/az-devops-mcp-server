import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as azdev from "azure-devops-node-api";
import * as ba from "azure-devops-node-api/BuildApi";
import * as ga from "azure-devops-node-api/GitApi";
import * as wa from "azure-devops-node-api/WorkItemTrackingApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as gi from "azure-devops-node-api/interfaces/GitInterfaces";
import * as wi from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

export class AzureDevOpsServer {
  private connection: azdev.WebApi | null = null;
  private buildApi: ba.IBuildApi | null = null;
  private gitApi: ga.IGitApi | null = null;
  private workItemApi: wa.IWorkItemTrackingApi | null = null;

  initialize(server: Server) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "connect_azure_devops",
            description: "Connect to Azure DevOps organization using personal access token",
            inputSchema: {
              type: "object",
              properties: {
                orgUrl: {
                  type: "string",
                  description: "Azure DevOps organization URL (e.g., https://dev.azure.com/yourorgname)"
                },
                token: {
                  type: "string",
                  description: "Personal Access Token"
                }
              },
              required: ["orgUrl", "token"]
            }
          },
          {
            name: "list_projects",
            description: "List all projects in the Azure DevOps organization",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            name: "list_build_definitions",
            description: "List build definitions for a specific project",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                }
              },
              required: ["project"]
            }
          },
          {
            name: "get_build",
            description: "Get build details by ID",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                },
                buildId: {
                  type: "number",
                  description: "Build ID"
                }
              },
              required: ["project", "buildId"]
            }
          },
          {
            name: "list_repositories",
            description: "List Git repositories for a specific project",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                }
              },
              required: ["project"]
            }
          },
          {
            name: "get_repository",
            description: "Get repository details by ID",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                },
                repositoryId: {
                  type: "string",
                  description: "Repository ID"
                }
              },
              required: ["project", "repositoryId"]
            }
          },
          {
            name: "list_work_items",
            description: "List work items using a WIQL query",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                },
                query: {
                  type: "string",
                  description: "WIQL query string"
                }
              },
              required: ["project", "query"]
            }
          },
          {
            name: "get_work_item",
            description: "Get work item details by ID",
            inputSchema: {
              type: "object",
              properties: {
                workItemId: {
                  type: "number",
                  description: "Work Item ID"
                }
              },
              required: ["workItemId"]
            }
          },
          {
            name: "create_work_item",
            description: "Create a new work item",
            inputSchema: {
              type: "object",
              properties: {
                project: {
                  type: "string",
                  description: "Project name or ID"
                },
                workItemType: {
                  type: "string",
                  description: "Work item type (e.g., Bug, Task, User Story)"
                },
                title: {
                  type: "string",
                  description: "Work item title"
                },
                description: {
                  type: "string",
                  description: "Work item description"
                }
              },
              required: ["project", "workItemType", "title"]
            }
          }
        ]
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "connect_azure_devops":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for connect_azure_devops");
            }
            const connectArgs = args as { orgUrl: string; token: string };
            return await this.connectAzureDevOps(connectArgs);
          case "list_projects":
            return await this.listProjects();
          case "list_build_definitions":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for list_build_definitions");
            }
            const buildDefArgs = args as { project: string };
            return await this.listBuildDefinitions(buildDefArgs.project);
          case "get_build":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for get_build");
            }
            const getBuildArgs = args as { project: string; buildId: number };
            return await this.getBuild(getBuildArgs.project, getBuildArgs.buildId);
          case "list_repositories":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for list_repositories");
            }
            const listRepoArgs = args as { project: string };
            return await this.listRepositories(listRepoArgs.project);
          case "get_repository":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for get_repository");
            }
            const getRepoArgs = args as { project: string; repositoryId: string };
            return await this.getRepository(getRepoArgs.project, getRepoArgs.repositoryId);
          case "list_work_items":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for list_work_items");
            }
            const listWorkItemsArgs = args as { project: string; query: string };
            return await this.listWorkItems(listWorkItemsArgs.project, listWorkItemsArgs.query);
          case "get_work_item":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for get_work_item");
            }
            const getWorkItemArgs = args as { workItemId: number };
            return await this.getWorkItem(getWorkItemArgs.workItemId);
          case "create_work_item":
            if (!args || typeof args !== 'object') {
              throw new Error("Invalid arguments for create_work_item");
            }
            const createWorkItemArgs = args as { project: string; workItemType: string; title: string; description?: string };
            return await this.createWorkItem(createWorkItemArgs.project, createWorkItemArgs.workItemType, createWorkItemArgs.title, createWorkItemArgs.description);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  private async connectAzureDevOps(args: { orgUrl: string; token: string }) {
    try {
      const authHandler = azdev.getPersonalAccessTokenHandler(args.token);
      this.connection = new azdev.WebApi(args.orgUrl, authHandler);
      
      // Initialize APIs
      this.buildApi = await this.connection.getBuildApi();
      this.gitApi = await this.connection.getGitApi();
      this.workItemApi = await this.connection.getWorkItemTrackingApi();

      return {
        content: [
          {
            type: "text",
            text: `Successfully connected to Azure DevOps organization: ${args.orgUrl}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to connect to Azure DevOps: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listProjects() {
    if (!this.connection) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const coreApi = await this.connection.getCoreApi();
    const projects = await coreApi.getProjects();
    
    const projectList = projects.map(p => `- ${p.name} (${p.id})`).join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `Projects:\n${projectList}`
        }
      ]
    };
  }

  private async listBuildDefinitions(project: string) {
    if (!this.buildApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const definitions = await this.buildApi.getDefinitions(project);
    const defList = definitions.map(d => `- ${d.name} (${d.id})`).join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `Build Definitions for project ${project}:\n${defList}`
        }
      ]
    };
  }

  private async getBuild(project: string, buildId: number) {
    if (!this.buildApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const build = await this.buildApi.getBuild(project, buildId);
    
    return {
      content: [
        {
          type: "text",
          text: `Build Details:\nID: ${build.id}\nName: ${build.buildNumber}\nStatus: ${build.status}\nResult: ${build.result}\nStart Time: ${build.startTime}\nFinish Time: ${build.finishTime}`
        }
      ]
    };
  }

  private async listRepositories(project: string) {
    if (!this.gitApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const repositories = await this.gitApi.getRepositories(project);
    const repoList = repositories.map(r => `- ${r.name} (${r.id})`).join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `Repositories for project ${project}:\n${repoList}`
        }
      ]
    };
  }

  private async getRepository(project: string, repositoryId: string) {
    if (!this.gitApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const repository = await this.gitApi.getRepository(repositoryId, project);
    
    return {
      content: [
        {
          type: "text",
          text: `Repository Details:\nName: ${repository.name}\nID: ${repository.id}\nDefault Branch: ${repository.defaultBranch}\nSize: ${repository.size} bytes\nRemote URL: ${repository.remoteUrl}`
        }
      ]
    };
  }

  private async listWorkItems(project: string, query: string) {
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const wiql = {
      query: query
    };
    
    const queryResult = await this.workItemApi.queryByWiql(wiql, undefined, undefined, undefined);
    
    if (queryResult.workItems && queryResult.workItems.length > 0) {
          const workItemIds = queryResult.workItems.map(wi => wi.id).filter((id): id is number => id !== undefined);
    const workItems = await this.workItemApi.getWorkItems(workItemIds);
      
      const workItemList = workItems.map(wi => `- ${wi.fields?.['System.Title'] || 'No Title'} (${wi.id})`).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Work Items:\n${workItemList}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "No work items found matching the query."
          }
        ]
      };
    }
  }

  private async getWorkItem(workItemId: number) {
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const workItem = await this.workItemApi.getWorkItem(workItemId);
    
    return {
      content: [
        {
          type: "text",
          text: `Work Item Details:\nID: ${workItem.id}\nType: ${workItem.fields?.['System.WorkItemType']}\nTitle: ${workItem.fields?.['System.Title']}\nState: ${workItem.fields?.['System.State']}\nAssigned To: ${workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned'}`
        }
      ]
    };
  }

  private async createWorkItem(project: string, workItemType: string, title: string, description?: string) {
    if (!this.workItemApi) {
      throw new Error("Not connected to Azure DevOps. Please use connect_azure_devops first.");
    }

    const workItem = [
      {
        op: "add",
        path: "/fields/System.Title",
        value: title
      }
    ];

    if (description) {
      workItem.push({
        op: "add",
        path: "/fields/System.Description",
        value: description
      });
    }

    const createdWorkItem = await this.workItemApi.createWorkItem({}, workItem, project, workItemType);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully created work item:\nID: ${createdWorkItem.id}\nType: ${workItemType}\nTitle: ${title}`
        }
      ]
    };
  }
}
