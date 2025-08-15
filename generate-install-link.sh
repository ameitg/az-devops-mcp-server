#!/bin/bash

# Generate Cursor MCP Install Link for Azure DevOps Server
# This script generates a Cursor deeplink for installing the Azure DevOps MCP server

echo "🔧 Azure DevOps MCP Server - Cursor Install Link Generator"
echo "=========================================================="
echo ""

# Get Azure DevOps details
echo "Please provide your Azure DevOps details:"
echo ""

read -p "Enter your Azure DevOps organization name (e.g., yourorgname): " org_name
read -p "Enter your project name (optional, press Enter to skip): " project_name
read -s -p "Enter your Personal Access Token (PAT): " pat_token
echo ""

# Validate inputs
if [ -z "$org_name" ]; then
    echo "❌ Organization name is required!"
    exit 1
fi

if [ -z "$pat_token" ]; then
    echo "❌ Personal Access Token is required!"
    exit 1
fi

# Format the organization URL
if [[ $org_name == https://* ]]; then
    org_url="$org_name"
else
    org_url="https://dev.azure.com/$org_name"
fi

# Create the MCP configuration
echo "📝 Creating MCP configuration..."

# Create temporary config file
cat > /tmp/mcp-config.json << EOF
{
  "azure-devops": {
    "transport": "sse",
    "url": "http://localhost:9832/mcp",
    "orgUrl": "$org_url",
    "project": "$project_name",
    "token": "$pat_token"
  }
}
EOF

# Convert to JSON string and base64 encode
config_json=$(cat /tmp/mcp-config.json)
base64_config=$(echo "$config_json" | base64)

# Generate the install link
install_link="cursor://anysphere.cursor-deeplink/mcp/install?name=azure-devops&config=$base64_config"

# Display results
echo ""
echo "✅ MCP Configuration created!"
echo ""
echo "📋 Configuration:"
echo "$config_json"
echo ""
echo "🔗 Generated Install Link:"
echo "$install_link"
echo ""
echo "📝 Next Steps:"
echo "1. Click the install link above or paste it into your browser"
echo "2. Cursor will prompt you to install the MCP server"
echo "3. Start your MCP server: npm run start:sse"
echo "4. Use the server in Cursor!"
echo ""
echo "💡 Note: The server must be running on port 9832 for the connection to work."
echo "   You can start it with: npm run start:sse"
echo ""
echo "🔐 Your configuration has been saved to /tmp/mcp-config.json"
echo "   You can copy this to .cursor/mcp.json if you prefer manual configuration."

# Clean up temporary file
# rm /tmp/mcp-config.json
