# Azure DevOps MCP Server - SSE Version

This is the **Server-Sent Events (SSE)** version of the Azure DevOps MCP server, which allows you to run it as a standalone server that multiple clients can connect to.

## 🚀 **SSE Transport Benefits**

According to the [Cursor MCP documentation](https://docs.cursor.com/en/context/mcp), SSE transport provides:

- **Local/Remote deployment** - Can run on your machine or a remote server
- **Multiple users** - Multiple Cursor instances can connect to the same server
- **Persistent connections** - Maintains connection state across requests
- **Better for production** - More suitable for team environments

## 📋 **Prerequisites**

- Node.js 16 or higher
- Azure DevOps organization with a Personal Access Token
- Cursor IDE

## 🛠️ **Installation & Setup**

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Build the Project**
```bash
npm run build
```

### 3. **Set Environment Variables (Optional)**
Create a `.env` file in your project root:
```bash
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/yourorgname
AZURE_DEVOPS_TOKEN=your-personal-access-token
```

### 4. **Start the SSE Server**
```bash
# Development mode
npm run dev:sse

# Production mode
npm run start:sse
```

The server will start on port 3000 (configurable via `PORT` environment variable).

## 🔧 **Configuration**

### **Cursor MCP Configuration**

Add this to your Cursor MCP configuration:

#### **Project-specific** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "azure-devops": {
      "transport": "sse",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

#### **Global** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "azure-devops": {
      "transport": "sse",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 🌐 **Server Endpoints**

The SSE server provides several HTTP endpoints:

### **MCP SSE Endpoint**
- **URL**: `http://localhost:3000/mcp`
- **Method**: GET
- **Purpose**: MCP protocol communication

### **Authentication**
- **URL**: `http://localhost:3000/auth`
- **Method**: POST
- **Body**: `{ "orgUrl": "...", "token": "..." }`
- **Purpose**: Connect to Azure DevOps

### **Direct Tool Execution**
- **URL**: `http://localhost:3000/tools/:toolName`
- **Method**: POST
- **Body**: Tool arguments
- **Purpose**: Execute tools directly via HTTP

### **Health Check**
- **URL**: `http://localhost:3000/health`
- **Method**: GET
- **Purpose**: Verify server status

## 🔌 **Usage Examples**

### **Using with Cursor (Recommended)**

1. **Start the server**: `npm run dev:sse`
2. **Configure Cursor** with the MCP configuration above
3. **Restart Cursor**
4. **Ask Cursor** to use Azure DevOps tools

### **Direct HTTP API Usage**

#### **Connect to Azure DevOps**
```bash
curl -X POST http://localhost:3000/auth \
  -H "Content-Type: application/json" \
  -d '{
    "orgUrl": "https://dev.azure.com/yourorgname",
    "token": "your-personal-access-token"
  }'
```

#### **List Projects**
```bash
curl -X POST http://localhost:3000/tools/list_projects \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### **Query Work Items**
```bash
curl -X POST http://localhost:3000/tools/list_work_items \
  -H "Content-Type: application/json" \
  -d '{
    "project": "MyProject",
    "query": "SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @me"
  }'
```

## 🚀 **Deployment Options**

### **Local Development**
```bash
npm run dev:sse
```

### **Production**
```bash
npm run build
npm run start:sse
```

### **Custom Port**
```bash
PORT=8080 npm run start:sse
```

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:sse"]
```

## 🔒 **Security Considerations**

- **CORS**: Configured to allow all origins in development
- **Authentication**: Uses Azure DevOps Personal Access Tokens
- **Environment Variables**: Store sensitive data in `.env` files
- **Network Access**: Server binds to localhost by default

## 🐛 **Troubleshooting**

### **Server Won't Start**
- Check if port 3000 is available
- Verify all dependencies are installed
- Check Node.js version (16+ required)

### **Cursor Can't Connect**
- Verify server is running on correct port
- Check MCP configuration syntax
- Ensure Cursor is restarted after configuration

### **Azure DevOps Connection Fails**
- Verify organization URL format
- Check Personal Access Token permissions
- Ensure token hasn't expired

### **Tools Not Available**
- Check server logs for errors
- Verify Azure DevOps connection is established
- Restart Cursor after server changes

## 📊 **Monitoring & Logs**

The server provides detailed logging:
- Connection status
- Tool execution results
- Error details
- Azure DevOps connection status

## 🔄 **Migration from stdio**

If you're currently using the stdio version:

1. **Stop the stdio server**
2. **Start the SSE server**: `npm run dev:sse`
3. **Update Cursor configuration** to use SSE transport
4. **Restart Cursor**

## 📚 **Additional Resources**

- [Cursor MCP Documentation](https://docs.cursor.com/en/context/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Azure DevOps Node API](https://www.npmjs.com/package/azure-devops-node-api)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both stdio and SSE transports
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.
