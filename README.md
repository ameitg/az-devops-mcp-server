# Azure DevOps MCP Server

A Model Context Protocol (MCP) server that provides integration with Azure DevOps services. This server allows AI assistants to interact with Azure DevOps organizations to manage projects, builds, repositories, and work items.

## Features

- **Project Management**: List and explore Azure DevOps projects
- **Build Management**: View build definitions and build details
- **Repository Management**: List Git repositories and get repository information
- **Work Item Management**: Query, view, and create work items using WIQL
- **Secure Authentication**: Uses Personal Access Tokens for secure API access

## Prerequisites

- Node.js 16 or higher
- Azure DevOps organization with a Personal Access Token
- TypeScript (for development)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd az-devops-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Azure DevOps Personal Access Token

1. Go to your Azure DevOps organization
2. Click on your profile picture → Personal Access Tokens
3. Click "New Token"
4. Set the appropriate scopes (typically "Full Access" for development)
5. Copy the generated token

### Environment Variables (Optional)

You can set environment variables for easier configuration:

```bash
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorgname"
export AZURE_DEVOPS_TOKEN="your-personal-access-token"
```

## Usage

### Starting the Server

#### **Interactive Mode (Recommended for first-time setup)**
```bash
# Interactive setup with prompts for Azure DevOps credentials
npm start

# Or use the shell script
./start-interactive.sh
```

#### **Direct Mode (if you have .env file)**
```bash
# Development mode
npm run dev

# SSE mode
npm run dev:sse

# Production mode
npm run build
npm run start:sse
```

### Available Tools

The MCP server provides the following tools:

#### 1. `connect_azure_devops`
Connect to an Azure DevOps organization using a personal access token.

**Parameters:**
- `orgUrl`: Azure DevOps organization URL (e.g., https://dev.azure.com/yourorgname)
- `token`: Personal Access Token

#### 2. `list_projects`
List all projects in the Azure DevOps organization.

**Parameters:** None

#### 3. `list_build_definitions`
List build definitions for a specific project.

**Parameters:**
- `project`: Project name or ID

#### 4. `get_build`
Get build details by ID.

**Parameters:**
- `project`: Project name or ID
- `buildId`: Build ID

#### 5. `list_repositories`
List Git repositories for a specific project.

**Parameters:**
- `project`: Project name or ID

#### 6. `get_repository`
Get repository details by ID.

**Parameters:**
- `project`: Project name or ID
- `repositoryId`: Repository ID

#### 7. `list_work_items`
List work items using a WIQL query.

**Parameters:**
- `project`: Project name or ID
- `query`: WIQL query string

#### 8. `get_work_item`
Get work item details by ID.

**Parameters:**
- `workItemId`: Work Item ID

#### 9. `create_work_item`
Create a new work item.

**Parameters:**
- `project`: Project name or ID
- `workItemType`: Work item type (e.g., Bug, Task, User Story)
- `title`: Work item title
- `description`: Work item description (optional)

## Example Usage

### Basic Workflow

1. **Connect to Azure DevOps:**
   ```
   connect_azure_devops(orgUrl: "https://dev.azure.com/myorg", token: "my-token")
   ```

2. **List Projects:**
   ```
   list_projects()
   ```

3. **List Build Definitions:**
   ```
   list_build_definitions(project: "MyProject")
   ```

4. **Query Work Items:**
   ```
   list_work_items(project: "MyProject", query: "SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @me")
   ```

5. **Create a Work Item:**
   ```
   create_work_item(project: "MyProject", workItemType: "Task", title: "New Task", description: "Task description")
   ```

### WIQL Query Examples

- **All active bugs:**
  ```
  SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed'
  ```

- **My assigned work items:**
  ```
  SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @me
  ```

- **Work items in current sprint:**
  ```
  SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = 'MyProject\Sprint 1'
  ```

## Development

### Project Structure

```
src/
├── index.ts          # Main entry point
├── server.ts         # Azure DevOps MCP server implementation
└── types/            # Type definitions (if needed)
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Clean Build

```bash
npm run clean
npm run build
```

## Troubleshooting

### Common Issues

1. **Authentication Failed:**
   - Verify your Personal Access Token is valid
   - Check that the token has the necessary permissions
   - Ensure the organization URL is correct

2. **Project Not Found:**
   - Verify the project name/ID is correct
   - Ensure you have access to the project

3. **Build API Errors:**
   - Check that the project has build definitions
   - Verify build permissions

### Debug Mode

For debugging, you can run the server with additional logging:

```bash
DEBUG=* npm run dev
```

## Security Considerations

- **Never commit Personal Access Tokens** to version control
- Use environment variables for sensitive configuration
- Regularly rotate your Personal Access Tokens
- Grant minimal necessary permissions to tokens

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Azure DevOps API documentation
- Open an issue in the repository

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Azure DevOps Node API](https://www.npmjs.com/package/azure-devops-node-api)
- [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk)


