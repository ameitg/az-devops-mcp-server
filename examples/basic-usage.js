// Example: Basic usage of the Azure DevOps MCP Server
// This file demonstrates how to interact with the MCP server

// Note: This is a conceptual example. In practice, you would use an MCP client
// to communicate with the server over stdio or other transport mechanisms.

const exampleWorkflow = {
  // 1. Connect to Azure DevOps
  connect: {
    tool: "connect_azure_devops",
    arguments: {
      orgUrl: "https://dev.azure.com/yourorgname",
      token: "your-personal-access-token"
    }
  },

  // 2. List all projects
  listProjects: {
    tool: "list_projects",
    arguments: {}
  },

  // 3. List build definitions for a specific project
  listBuildDefinitions: {
    tool: "list_build_definitions",
    arguments: {
      project: "MyProject"
    }
  },

  // 4. Query work items using WIQL
  queryWorkItems: {
    tool: "list_work_items",
    arguments: {
      project: "MyProject",
      query: "SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @me"
    }
  },

  // 5. Create a new work item
  createWorkItem: {
    tool: "create_work_item",
    arguments: {
      project: "MyProject",
      workItemType: "Task",
      title: "New Task from MCP Server",
      description: "This task was created using the MCP server integration"
    }
  }
};

// Example WIQL queries for different use cases
const wiqlExamples = {
  // All active bugs
  activeBugs: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed'",
  
  // My assigned work items
  myWorkItems: "SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @me",
  
  // Work items in current sprint
  currentSprint: "SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = 'MyProject\\Sprint 1'",
  
  // High priority items
  highPriority: "SELECT [System.Id] FROM WorkItems WHERE [Microsoft.VSTS.Common.Priority] = 1",
  
  // Recent work items
  recentItems: "SELECT [System.Id] FROM WorkItems WHERE [System.CreatedDate] >= @today-7"
};

console.log("Azure DevOps MCP Server Example Usage");
console.log("=====================================");
console.log("\nExample workflow:", JSON.stringify(exampleWorkflow, null, 2));
console.log("\nWIQL Query Examples:", JSON.stringify(wiqlExamples, null, 2));

// To use this with an actual MCP client:
// 1. Start the MCP server: npm run dev
// 2. Use an MCP client to send tool calls
// 3. The server will execute the tools and return results


