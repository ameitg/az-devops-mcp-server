import * as azdev from "azure-devops-node-api";
import * as ba from "azure-devops-node-api/BuildApi";
import * as ga from "azure-devops-node-api/GitApi";
import * as wa from "azure-devops-node-api/WorkItemTrackingApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as gi from "azure-devops-node-api/interfaces/GitInterfaces";
import * as wi from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";

interface AzureDevOpsConfig {
  orgUrl: string;
  token: string;
  project?: string;
}

export class AzureDevOpsMCPServer {
  private connection: azdev.WebApi | null = null;
  private buildApi: ba.IBuildApi | null = null;
  private gitApi: ga.IGitApi | null = null;
  private workItemApi: wa.IWorkItemTrackingApi | null = null;
  private config: AzureDevOpsConfig;

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      const authHandler = azdev.getPersonalAccessTokenHandler(this.config.token);
      this.connection = new azdev.WebApi(this.config.orgUrl, authHandler);

      if (this.connection) {
        this.buildApi = await this.connection.getBuildApi();
        this.gitApi = await this.connection.getGitApi();
        this.workItemApi = await this.connection.getWorkItemTrackingApi();
      }
    } catch (error) {
      console.error("Failed to initialize Azure DevOps connection:", error);
    }
  }

  private async listProjects(): Promise<any[]> {
    if (!this.connection) throw new Error("No connection to Azure DevOps");

    const coreApi = await this.connection.getCoreApi();
    const projects = await coreApi.getProjects();
    return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      url: p.url
    }));
  }

  private async listWorkItems(project: string, query?: string): Promise<any[]> {
    if (!this.workItemApi) throw new Error("Work Item API not available");

    const wiql = query || `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.ChangedDate] DESC`;
    const queryResult = await this.workItemApi.queryByWiql({ query: wiql });

    if (queryResult.workItems && queryResult.workItems.length > 0) {
      const workItemIds = queryResult.workItems.map(wi => wi.id).filter((id): id is number => id !== undefined);
      const workItems = await this.workItemApi.getWorkItems(workItemIds);
      return workItems.map(wi => ({
        id: wi.id,
        title: wi.fields?.["System.Title"],
        state: wi.fields?.["System.State"],
        type: wi.fields?.["System.WorkItemType"],
        url: wi.url
      }));
    }
    return [];
  }

  private async createWorkItem(project: string, type: string, title: string, description?: string): Promise<any> {
    if (!this.workItemApi) throw new Error("Work Item API not available");

    const workItem = [{
      op: "add",
      path: "/fields/System.Title",
      value: title
    }];

    if (description) {
      workItem.push({
        op: "add",
        path: "/fields/System.Description",
        value: description
      });
    }

    const createdWorkItem = await this.workItemApi.createWorkItem({}, workItem, project, type);
    return {
      id: createdWorkItem.id,
      title: createdWorkItem.fields?.["System.Title"],
      type: createdWorkItem.fields?.["System.WorkItemType"],
      url: createdWorkItem.url
    };
  }

  private async listBuilds(project: string): Promise<any[]> {
    if (!this.buildApi) throw new Error("Build API not available");

    const builds = await this.buildApi.getBuilds(project);
    return builds.map(build => ({
      id: build.id,
      buildNumber: build.buildNumber,
      status: build.status,
      result: build.result,
      startTime: build.startTime,
      finishTime: build.finishTime
    }));
  }

  private async listRepositories(project: string): Promise<any[]> {
    if (!this.gitApi) throw new Error("Git API not available");

    const repos = await this.gitApi.getRepositories(project);
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      url: repo.url,
      defaultBranch: repo.defaultBranch,
      size: repo.size
    }));
  }

  public async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case "list_projects":
          return await this.listProjects();

        case "list_work_items":
          if (!args || typeof args !== 'object') throw new Error("Invalid arguments");
          const project = (args as { project: string }).project || this.config.project;
          if (!project) throw new Error("Project is required");
          const query = (args as { query?: string }).query;
          return await this.listWorkItems(project, query);

        case "create_work_item":
          if (!args || typeof args !== 'object') throw new Error("Invalid arguments");
          const createArgs = args as { project: string; type: string; title: string; description?: string };
          if (!createArgs.project || !createArgs.type || !createArgs.title) {
            throw new Error("Project, type, and title are required");
          }
          return await this.createWorkItem(createArgs.project, createArgs.type, createArgs.title, createArgs.description);

        case "list_builds":
          if (!args || typeof args !== 'object') throw new Error("Invalid arguments");
          const buildProject = (args as { project: string }).project || this.config.project;
          if (!buildProject) throw new Error("Project is required");
          return await this.listBuilds(buildProject);

        case "list_repositories":
          if (!args || typeof args !== 'object') throw new Error("Invalid arguments");
          const repoProject = (args as { project: string }).project || this.config.project;
          if (!repoProject) throw new Error("Project is required");
          return await this.listRepositories(repoProject);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      throw new Error(`Error calling tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getTools() {
    return [
      {
        name: "list_projects",
        description: "List all Azure DevOps projects",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "list_work_items",
        description: "List work items in a project",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Project name"
            },
            query: {
              type: "string",
              description: "Optional WIQL query"
            }
          },
          required: ["project"]
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
              description: "Project name"
            },
            type: {
              type: "string",
              description: "Work item type (e.g., Task, Bug, User Story)"
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
          required: ["project", "type", "title"]
        }
      },
      {
        name: "list_builds",
        description: "List builds in a project",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Project name"
            }
          },
          required: ["project"]
        }
      },
      {
        name: "list_repositories",
        description: "List Git repositories in a project",
        inputSchema: {
          type: "object",
          properties: {
            project: {
              type: "string",
              description: "Project name"
            }
          },
          required: ["project"]
        }
      }
    ];
  }
}
