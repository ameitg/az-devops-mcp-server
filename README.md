# Azure DevOps MCP Server

A Model Context Protocol (MCP) server that provides integration with Azure DevOps services using **stdio transport**. This server allows AI assistants to interact with Azure DevOps organizations to manage projects, builds, repositories, and work items.

## 🚀 **Features**

- **Azure DevOps Integration**: Full access to Azure DevOps APIs
- **MCP Protocol**: Implements Model Context Protocol for Cursor integration
- **Stdio Transport**: Standard input/output transport for local Cursor integration
- **Project Management**: List and explore Azure DevOps projects
- **Build Management**: View build definitions and build details
- **Repository Management**: List Git repositories and get repository information
- **Work Item Management**: Query, view, and create work items using WIQL
- **Secure Authentication**: Uses Personal Access Tokens for secure API access
- **Environment Configuration**: Simple configuration via environment variables

## 📋 **Prerequisites**

- Node.js 16 or higher
- Azure DevOps organization with a Personal Access Token
- Cursor IDE (for MCP integration)
- TypeScript (for development)

## 🛠️ **Installation & Setup**

1. **Clone the repository:**
```bash
git clone <repository-url>
cd az-devops-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Configure Azure DevOps credentials:**
   
   **Option A: Environment Variables (Recommended)**
   Create a `.env` file in your project root:
   ```bash
   AZURE_DEVOPS_ORG_URL=https://dev.azure.com/yourorgname
   AZURE_DEVOPS_PAT=your-personal-access-token
   AZURE_DEVOPS_PROJECT=your-project-name (optional)
   ```
   
   **Option B: Cursor MCP Configuration**
   Update `.cursor/mcp.json` with your credentials (see Configuration section below)

## 🔧 **Configuration**

### **Azure DevOps Personal Access Token**

1. Go to your Azure DevOps organization
2. Click on your profile picture → Personal Access Tokens
3. Click "New Token"
4. Set the appropriate scopes (typically "Full Access" for development)
5. Copy the generated token

### **Cursor MCP Configuration**

Create or update `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "azure-devops": {
      "transport": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/YOUR_ORG_NAME",
        "AZURE_DEVOPS_PAT": "YOUR_PERSONAL_ACCESS_TOKEN",
        "AZURE_DEVOPS_PROJECT": "YOUR_PROJECT_NAME"
      }
    }
  }
}
```

## 🚀 **Usage**

### **Starting the Server**

#### **Direct Mode (if you have .env file)**
```bash
# Build and start
npm run build
npm start
```

#### **Development Mode**
```bash
npm run dev
```

### **Using in Cursor**

Once the server is built and configured:

1. **Restart Cursor** to load the MCP configuration
2. **Ask Cursor directly** to use your Azure DevOps tools:
   - "List all work items in eazypetition"
   - "Create a new task for user authentication"
   - "Show me the status of the petitioner dashboard task"
   - "List all projects in my Azure DevOps organization"

### **Available Tools**

The MCP server provides the following tools:

#### 1. `list_projects`
List all projects in the Azure DevOps organization.

**Parameters:** None

#### 2. `list_work_items`
List work items using a WIQL query.

**Parameters:**
- `project`: Project name or ID
- `query`: WIQL query string (optional)

#### 3. `create_work_item`
Create a new work item.

**Parameters:**
- `project`: Project name or ID
- `type`: Work item type (e.g., Bug, Task, User Story)
- `title`: Work item title
- `description`: Work item description (optional)

#### 4. `list_builds`
List builds for a specific project.

**Parameters:**
- `project`: Project name or ID

#### 5. `list_repositories`
List Git repositories for a specific project.

**Parameters:**
- `project`: Project name or ID

## 📚 **Example Usage**

### **Using in Cursor (Recommended)**

Simply ask Cursor to perform Azure DevOps operations:

- **"List all work items in eazypetition"**
- **"Create a new task called 'user authentication'"**
- **"Show me the status of the petitioner dashboard task"**
- **"List all projects in my Azure DevOps organization"**
- **"Create a bug report for the login issue"**

### **Direct Tool Calls (Advanced)**

If you need to call tools directly:

1. **List Projects:**
   ```
   list_projects()
   ```

2. **List Work Items:**
   ```
   list_work_items(project: "eazypetition")
   ```

3. **Create a Work Item:**
   ```
   create_work_item(project: "eazypetition", type: "Task", title: "New Task", description: "Task description")
   ```

### **WIQL Query Examples**

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

## 🛠️ **Development**

### **Project Structure**

```
az-devops-mcp-server/
├── .cursor/
│   └── mcp.json     # Cursor MCP configuration
├── src/
│   ├── index.ts      # Main entry point
│   └── server.ts     # Azure DevOps MCP server implementation
├── dist/             # Compiled JavaScript output
├── package.json      # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── .env              # Environment variables (create from config.env.example)
└── config.env.example # Example environment configuration
```

### **Building**

```bash
npm run build
```

### **Development Mode**

```bash
npm run dev
```

### **Clean Build**

```bash
npm run clean
npm run build
```

### **Available Scripts**

```bash
npm start               # Start the compiled server
npm run dev             # Development mode with hot reload
npm run build           # Build the project
npm run clean           # Clean build artifacts
```

## 🐛 **Troubleshooting**

### **Common Issues**

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

4. **Server Won't Start:**
   - Verify all dependencies are installed
   - Check Node.js version (16+ required)
   - Ensure environment variables are set correctly

5. **Cursor Can't Connect:**
   - Verify MCP configuration syntax
   - Ensure Cursor is restarted after configuration
   - Check that the server command path is correct

### **Debug Mode**

For debugging, you can run the server with additional logging:

```bash
DEBUG=* npm run dev
```

### **Testing the Connection**

To verify your MCP server is working correctly:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **In Cursor, ask:**
   - "List all work items in eazypetition"
   - "Show me my Azure DevOps projects"

## 🔒 **Security Considerations**

- **Never commit Personal Access Tokens** to version control
- Use environment variables for sensitive configuration
- Regularly rotate your Personal Access Tokens
- Grant minimal necessary permissions to tokens
- The server runs locally and communicates via stdio

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.

## 🆘 **Support**

For issues and questions:
- Check the troubleshooting section
- Review Azure DevOps API documentation
- Open an issue in the repository

## 📚 **References**

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP Documentation](https://docs.cursor.com/en/context/mcp)
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Azure DevOps Node API](https://www.npmjs.com/package/azure-devops-node-api)
- [MCP SDK](https://www.npmjs.com/package/@modelcontextprotocol/sdk)


