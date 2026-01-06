Skip to content
Gemini CLI Icon
Gemini CLI
Extensions
Docs
Changelog

Search
Ctrl
K
GitHub
Select theme
Auto
Introduction
Architecture Overview
Gemini CLI Quickstart
Authentication
Configuration
Installation
Examples
Introduction
Commands
Checkpointing
Custom Commands
Enterprise
Headless Mode
Keyboard Shortcuts
Sandbox
Telemetry
Themes
Token Caching
Trusted Folders
Tutorials
Uninstall
Introduction
Tools API
Memory Import Processor
Introduction
File System
Multi-File Read
Shell
Web Fetch
Web Search
Memory
MCP Servers
Introduction
Get Started with Extensions
Extension Releasing
Introduction
IDE Companion Spec
NPM
Releases
Changelog
Integration Tests
Issue and PR Automation
FAQ
Troubleshooting
Quota and Pricing
Terms of Service
On this page
Introduction
What is an MCP server?
Core Integration Architecture
Discovery Layer (mcp-client.ts)
Execution Layer (mcp-tool.ts)
Transport Mechanisms
How to set up your MCP server
Configure the MCP server in settings.json
Configuration Structure
Configuration Properties
OAuth Support for Remote MCP Servers
Example Configurations
SSE MCP Server with SA Impersonation
Discovery Process Deep Dive
1. Server Iteration and Connection
2. Tool Discovery
3. Conflict Resolution
4. Schema Processing
5. Connection Management
Tool Execution Flow
1. Tool Invocation
2. Confirmation Process
3. Execution
4. Response Handling
How to interact with your MCP server
Using the /mcp Command
Example /mcp Output
Tool Usage
Status Monitoring and Troubleshooting
Connection States
Common Issues and Solutions
Debugging Tips
Important Notes
Security Considerations
Performance and Resource Management
Schema Compatibility
Returning Rich Content from Tools
How It Works
Example: Returning Text and an Image
MCP Prompts as Slash Commands
Defining Prompts on the Server
Invoking Prompts
Managing MCP Servers with gemini mcp
Adding a Server (gemini mcp add)
Listing Servers (gemini mcp list)
Removing a Server (gemini mcp remove)
MCP servers with the Gemini CLI

Copy as Markdown
This document provides a guide to configuring and using Model Context Protocol (MCP) servers with the Gemini CLI.

What is an MCP server?
An MCP server is an application that exposes tools and resources to the Gemini CLI through the Model Context Protocol, allowing it to interact with external systems and data sources. MCP servers act as a bridge between the Gemini model and your local environment or other services like APIs.

An MCP server enables the Gemini CLI to:

Discover tools: List available tools, their descriptions, and parameters through standardized schema definitions.
Execute tools: Call specific tools with defined arguments and receive structured responses.
Access resources: Read data from specific resources (though the Gemini CLI primarily focuses on tool execution).
With an MCP server, you can extend the Gemini CLI’s capabilities to perform actions beyond its built-in features, such as interacting with databases, APIs, custom scripts, or specialized workflows.

Core Integration Architecture
The Gemini CLI integrates with MCP servers through a sophisticated discovery and execution system built into the core package (packages/core/src/tools/):

Discovery Layer (mcp-client.ts)
The discovery process is orchestrated by discoverMcpTools(), which:

Iterates through configured servers from your settings.json mcpServers configuration
Establishes connections using appropriate transport mechanisms (Stdio, SSE, or Streamable HTTP)
Fetches tool definitions from each server using the MCP protocol
Sanitizes and validates tool schemas for compatibility with the Gemini API
Registers tools in the global tool registry with conflict resolution
Execution Layer (mcp-tool.ts)
Each discovered MCP tool is wrapped in a DiscoveredMCPTool instance that:

Handles confirmation logic based on server trust settings and user preferences
Manages tool execution by calling the MCP server with proper parameters
Processes responses for both the LLM context and user display
Maintains connection state and handles timeouts
Transport Mechanisms
The Gemini CLI supports three MCP transport types:

Stdio Transport: Spawns a subprocess and communicates via stdin/stdout
SSE Transport: Connects to Server-Sent Events endpoints
Streamable HTTP Transport: Uses HTTP streaming for communication
How to set up your MCP server
The Gemini CLI uses the mcpServers configuration in your settings.json file to locate and connect to MCP servers. This configuration supports multiple servers with different transport mechanisms.

Configure the MCP server in settings.json
You can configure MCP servers in your settings.json file in two main ways: through the top-level mcpServers object for specific server definitions, and through the mcp object for global settings that control server discovery and execution.

Global MCP Settings (mcp)
The mcp object in your settings.json allows you to define global rules for all MCP servers.

mcp.serverCommand (string): A global command to start an MCP server.
mcp.allowed (array of strings): A list of MCP server names to allow. If this is set, only servers from this list (matching the keys in the mcpServers object) will be connected to.
mcp.excluded (array of strings): A list of MCP server names to exclude. Servers in this list will not be connected to.
Example:

{
  "mcp": {
    "allowed": ["my-trusted-server"],
    "excluded": ["experimental-server"]
  }
}

Server-Specific Configuration (mcpServers)
The mcpServers object is where you define each individual MCP server you want the CLI to connect to.

Configuration Structure
Add an mcpServers object to your settings.json file:

{ ...file contains other config objects
  "mcpServers": {
    "serverName": {
      "command": "path/to/server",
      "args": ["--arg1", "value1"],
      "env": {
        "API_KEY": "$MY_API_TOKEN"
      },
      "cwd": "./server-directory",
      "timeout": 30000,
      "trust": false
    }
  }
}

Configuration Properties
Each server configuration supports the following properties:

Required (one of the following)
command (string): Path to the executable for Stdio transport
url (string): SSE endpoint URL (e.g., "http://localhost:8080/sse")
httpUrl (string): HTTP streaming endpoint URL
Optional
args (string[]): Command-line arguments for Stdio transport
headers (object): Custom HTTP headers when using url or httpUrl
env (object): Environment variables for the server process. Values can reference environment variables using $VAR_NAME or ${VAR_NAME} syntax
cwd (string): Working directory for Stdio transport
timeout (number): Request timeout in milliseconds (default: 600,000ms = 10 minutes)
trust (boolean): When true, bypasses all tool call confirmations for this server (default: false)
includeTools (string[]): List of tool names to include from this MCP server. When specified, only the tools listed here will be available from this server (allowlist behavior). If not specified, all tools from the server are enabled by default.
excludeTools (string[]): List of tool names to exclude from this MCP server. Tools listed here will not be available to the model, even if they are exposed by the server. Note: excludeTools takes precedence over includeTools - if a tool is in both lists, it will be excluded.
targetAudience (string): The OAuth Client ID allowlisted on the IAP-protected application you are trying to access. Used with authProviderType: 'service_account_impersonation'.
targetServiceAccount (string): The email address of the Google Cloud Service Account to impersonate. Used with authProviderType: 'service_account_impersonation'.
OAuth Support for Remote MCP Servers
The Gemini CLI supports OAuth 2.0 authentication for remote MCP servers using SSE or HTTP transports. This enables secure access to MCP servers that require authentication.

Automatic OAuth Discovery
For servers that support OAuth discovery, you can omit the OAuth configuration and let the CLI discover it automatically:

{
  "mcpServers": {
    "discoveredServer": {
      "url": "https://api.example.com/sse"
    }
  }
}

The CLI will automatically:

Detect when a server requires OAuth authentication (401 responses)
Discover OAuth endpoints from server metadata
Perform dynamic client registration if supported
Handle the OAuth flow and token management
Authentication Flow
When connecting to an OAuth-enabled server:

Initial connection attempt fails with 401 Unauthorized
OAuth discovery finds authorization and token endpoints
Browser opens for user authentication (requires local browser access)
Authorization code is exchanged for access tokens
Tokens are stored securely for future use
Connection retry succeeds with valid tokens
Browser Redirect Requirements
Important: OAuth authentication requires that your local machine can:

Open a web browser for authentication
Receive redirects on http://localhost:7777/oauth/callback
This feature will not work in:

Headless environments without browser access
Remote SSH sessions without X11 forwarding
Containerized environments without browser support
Managing OAuth Authentication
Use the /mcp auth command to manage OAuth authentication:

Terminal window
# List servers requiring authentication
/mcp auth

# Authenticate with a specific server
/mcp auth serverName

# Re-authenticate if tokens expire
/mcp auth serverName

OAuth Configuration Properties
enabled (boolean): Enable OAuth for this server
clientId (string): OAuth client identifier (optional with dynamic registration)
clientSecret (string): OAuth client secret (optional for public clients)
authorizationUrl (string): OAuth authorization endpoint (auto-discovered if omitted)
tokenUrl (string): OAuth token endpoint (auto-discovered if omitted)
scopes (string[]): Required OAuth scopes
redirectUri (string): Custom redirect URI (defaults to http://localhost:7777/oauth/callback)
tokenParamName (string): Query parameter name for tokens in SSE URLs
audiences (string[]): Audiences the token is valid for
Token Management
OAuth tokens are automatically:

Stored securely in ~/.gemini/mcp-oauth-tokens.json
Refreshed when expired (if refresh tokens are available)
Validated before each connection attempt
Cleaned up when invalid or expired
Authentication Provider Type
You can specify the authentication provider type using the authProviderType property:

authProviderType (string): Specifies the authentication provider. Can be one of the following:
dynamic_discovery (default): The CLI will automatically discover the OAuth configuration from the server.
google_credentials: The CLI will use the Google Application Default Credentials (ADC) to authenticate with the server. When using this provider, you must specify the required scopes.
service_account_impersonation: The CLI will impersonate a Google Cloud Service Account to authenticate with the server. This is useful for accessing IAP-protected services (this was specifically designed for Cloud Run services).
Google Credentials
{
  "mcpServers": {
    "googleCloudServer": {
      "httpUrl": "https://my-gcp-service.run.app/mcp",
      "authProviderType": "google_credentials",
      "oauth": {
        "scopes": ["https://www.googleapis.com/auth/userinfo.email"]
      }
    }
  }
}

Service Account Impersonation
To authenticate with a server using Service Account Impersonation, you must set the authProviderType to service_account_impersonation and provide the following properties:

targetAudience (string): The OAuth Client ID allowslisted on the IAP-protected application you are trying to access.
targetServiceAccount (string): The email address of the Google Cloud Service Account to impersonate.
The CLI will use your local Application Default Credentials (ADC) to generate an OIDC ID token for the specified service account and audience. This token will then be used to authenticate with the MCP server.

Setup Instructions
Create or use an existing OAuth 2.0 client ID. To use an existing OAuth 2.0 client ID, follow the steps in How to share OAuth Clients.
Add the OAuth ID to the allowlist for programmatic access for the application. Since Cloud Run is not yet a supported resource type in gcloud iap, you must allowlist the Client ID on the project.
Create a service account. Documentation, Cloud Console Link
Add both the service account and users to the IAP Policy in the “Security” tab of the Cloud Run service itself or via gcloud.
Grant all users and groups who will access the MCP Server the necessary permissions to impersonate the service account (i.e., roles/iam.serviceAccountTokenCreator).
Enable the IAM Credentials API for your project.
Example Configurations
Python MCP Server (Stdio)
{
  "mcpServers": {
    "pythonTools": {
      "command": "python",
      "args": ["-m", "my_mcp_server", "--port", "8080"],
      "cwd": "./mcp-servers/python",
      "env": {
        "DATABASE_URL": "$DB_CONNECTION_STRING",
        "API_KEY": "${EXTERNAL_API_KEY}"
      },
      "timeout": 15000
    }
  }
}

Node.js MCP Server (Stdio)
{
  "mcpServers": {
    "nodeServer": {
      "command": "node",
      "args": ["dist/server.js", "--verbose"],
      "cwd": "./mcp-servers/node",
      "trust": true
    }
  }
}

Docker-based MCP Server
{
  "mcpServers": {
    "dockerizedServer": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "API_KEY",
        "-v",
        "${PWD}:/workspace",
        "my-mcp-server:latest"
      ],
      "env": {
        "API_KEY": "$EXTERNAL_SERVICE_TOKEN"
      }
    }
  }
}

HTTP-based MCP Server
{
  "mcpServers": {
    "httpServer": {
      "httpUrl": "http://localhost:3000/mcp",
      "timeout": 5000
    }
  }
}

HTTP-based MCP Server with Custom Headers
{
  "mcpServers": {
    "httpServerWithAuth": {
      "httpUrl": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-api-token",
        "X-Custom-Header": "custom-value",
        "Content-Type": "application/json"
      },
      "timeout": 5000
    }
  }
}

MCP Server with Tool Filtering
{
  "mcpServers": {
    "filteredServer": {
      "command": "python",
      "args": ["-m", "my_mcp_server"],
      "includeTools": ["safe_tool", "file_reader", "data_processor"],
      // "excludeTools": ["dangerous_tool", "file_deleter"],
      "timeout": 30000
    }
  }
}

SSE MCP Server with SA Impersonation
{
  "mcpServers": {
    "myIapProtectedServer": {
      "url": "https://my-iap-service.run.app/sse",
      "authProviderType": "service_account_impersonation",
      "targetAudience": "YOUR_IAP_CLIENT_ID.apps.googleusercontent.com",
      "targetServiceAccount": "your-sa@your-project.iam.gserviceaccount.com"
    }
  }
}

Discovery Process Deep Dive
When the Gemini CLI starts, it performs MCP server discovery through the following detailed process:

1. Server Iteration and Connection
For each configured server in mcpServers:

Status tracking begins: Server status is set to CONNECTING
Transport selection: Based on configuration properties:
httpUrl → StreamableHTTPClientTransport
url → SSEClientTransport
command → StdioClientTransport
Connection establishment: The MCP client attempts to connect with the configured timeout
Error handling: Connection failures are logged and the server status is set to DISCONNECTED
2. Tool Discovery
Upon successful connection:

Tool listing: The client calls the MCP server’s tool listing endpoint
Schema validation: Each tool’s function declaration is validated
Tool filtering: Tools are filtered based on includeTools and excludeTools configuration
Name sanitization: Tool names are cleaned to meet Gemini API requirements:
Invalid characters (non-alphanumeric, underscore, dot, hyphen) are replaced with underscores
Names longer than 63 characters are truncated with middle replacement (___)
3. Conflict Resolution
When multiple servers expose tools with the same name:

First registration wins: The first server to register a tool name gets the unprefixed name
Automatic prefixing: Subsequent servers get prefixed names: serverName__toolName
Registry tracking: The tool registry maintains mappings between server names and their tools
4. Schema Processing
Tool parameter schemas undergo sanitization for Gemini API compatibility:

$schema properties are removed
additionalProperties are stripped
anyOf with default have their default values removed (Vertex AI compatibility)
Recursive processing applies to nested schemas
5. Connection Management
After discovery:

Persistent connections: Servers that successfully register tools maintain their connections
Cleanup: Servers that provide no usable tools have their connections closed
Status updates: Final server statuses are set to CONNECTED or DISCONNECTED
Tool Execution Flow
When the Gemini model decides to use an MCP tool, the following execution flow occurs:

1. Tool Invocation
The model generates a FunctionCall with:

Tool name: The registered name (potentially prefixed)
Arguments: JSON object matching the tool’s parameter schema
2. Confirmation Process
Each DiscoveredMCPTool implements sophisticated confirmation logic:

Trust-based Bypass
if (this.trust) {
  return false; // No confirmation needed
}

Dynamic Allow-listing
The system maintains internal allow-lists for:

Server-level: serverName → All tools from this server are trusted
Tool-level: serverName.toolName → This specific tool is trusted
User Choice Handling
When confirmation is required, users can choose:

Proceed once: Execute this time only
Always allow this tool: Add to tool-level allow-list
Always allow this server: Add to server-level allow-list
Cancel: Abort execution
3. Execution
Upon confirmation (or trust bypass):

Parameter preparation: Arguments are validated against the tool’s schema

MCP call: The underlying CallableTool invokes the server with:

const functionCalls = [
  {
    name: this.serverToolName, // Original server tool name
    args: params,
  },
];

Response processing: Results are formatted for both LLM context and user display

4. Response Handling
The execution result contains:

llmContent: Raw response parts for the language model’s context
returnDisplay: Formatted output for user display (often JSON in markdown code blocks)
How to interact with your MCP server
Using the /mcp Command
The /mcp command provides comprehensive information about your MCP server setup:

Terminal window
/mcp

This displays:

Server list: All configured MCP servers
Connection status: CONNECTED, CONNECTING, or DISCONNECTED
Server details: Configuration summary (excluding sensitive data)
Available tools: List of tools from each server with descriptions
Discovery state: Overall discovery process status
Example /mcp Output
MCP Servers Status:

📡 pythonTools (CONNECTED)
  Command: python -m my_mcp_server --port 8080
  Working Directory: ./mcp-servers/python
  Timeout: 15000ms
  Tools: calculate_sum, file_analyzer, data_processor

🔌 nodeServer (DISCONNECTED)
  Command: node dist/server.js --verbose
  Error: Connection refused

🐳 dockerizedServer (CONNECTED)
  Command: docker run -i --rm -e API_KEY my-mcp-server:latest
  Tools: docker__deploy, docker__status

Discovery State: COMPLETED

Tool Usage
Once discovered, MCP tools are available to the Gemini model like built-in tools. The model will automatically:

Select appropriate tools based on your requests
Present confirmation dialogs (unless the server is trusted)
Execute tools with proper parameters
Display results in a user-friendly format
Status Monitoring and Troubleshooting
Connection States
The MCP integration tracks several states:

Server Status (MCPServerStatus)
DISCONNECTED: Server is not connected or has errors
CONNECTING: Connection attempt in progress
CONNECTED: Server is connected and ready
Discovery State (MCPDiscoveryState)
NOT_STARTED: Discovery hasn’t begun
IN_PROGRESS: Currently discovering servers
COMPLETED: Discovery finished (with or without errors)
Common Issues and Solutions
Server Won’t Connect
Symptoms: Server shows DISCONNECTED status

Troubleshooting:

Check configuration: Verify command, args, and cwd are correct
Test manually: Run the server command directly to ensure it works
Check dependencies: Ensure all required packages are installed
Review logs: Look for error messages in the CLI output
Verify permissions: Ensure the CLI can execute the server command
No Tools Discovered
Symptoms: Server connects but no tools are available

Troubleshooting:

Verify tool registration: Ensure your server actually registers tools
Check MCP protocol: Confirm your server implements the MCP tool listing correctly
Review server logs: Check stderr output for server-side errors
Test tool listing: Manually test your server’s tool discovery endpoint
Tools Not Executing
Symptoms: Tools are discovered but fail during execution

Troubleshooting:

Parameter validation: Ensure your tool accepts the expected parameters
Schema compatibility: Verify your input schemas are valid JSON Schema
Error handling: Check if your tool is throwing unhandled exceptions
Timeout issues: Consider increasing the timeout setting
Sandbox Compatibility
Symptoms: MCP servers fail when sandboxing is enabled

Solutions:

Docker-based servers: Use Docker containers that include all dependencies
Path accessibility: Ensure server executables are available in the sandbox
Network access: Configure sandbox to allow necessary network connections
Environment variables: Verify required environment variables are passed through
Debugging Tips
Enable debug mode: Run the CLI with --debug for verbose output
Check stderr: MCP server stderr is captured and logged (INFO messages filtered)
Test isolation: Test your MCP server independently before integrating
Incremental setup: Start with simple tools before adding complex functionality
Use /mcp frequently: Monitor server status during development
Important Notes
Security Considerations
Trust settings: The trust option bypasses all confirmation dialogs. Use cautiously and only for servers you completely control
Access tokens: Be security-aware when configuring environment variables containing API keys or tokens
Sandbox compatibility: When using sandboxing, ensure MCP servers are available within the sandbox environment
Private data: Using broadly scoped personal access tokens can lead to information leakage between repositories
Performance and Resource Management
Connection persistence: The CLI maintains persistent connections to servers that successfully register tools
Automatic cleanup: Connections to servers providing no tools are automatically closed
Timeout management: Configure appropriate timeouts based on your server’s response characteristics
Resource monitoring: MCP servers run as separate processes and consume system resources
Schema Compatibility
Property stripping: The system automatically removes certain schema properties ($schema, additionalProperties) for Gemini API compatibility
Name sanitization: Tool names are automatically sanitized to meet API requirements
Conflict resolution: Tool name conflicts between servers are resolved through automatic prefixing
This comprehensive integration makes MCP servers a powerful way to extend the Gemini CLI’s capabilities while maintaining security, reliability, and ease of use.

Returning Rich Content from Tools
MCP tools are not limited to returning simple text. You can return rich, multi-part content, including text, images, audio, and other binary data in a single tool response. This allows you to build powerful tools that can provide diverse information to the model in a single turn.

All data returned from the tool is processed and sent to the model as context for its next generation, enabling it to reason about or summarize the provided information.

How It Works
To return rich content, your tool’s response must adhere to the MCP specification for a CallToolResult. The content field of the result should be an array of ContentBlock objects. The Gemini CLI will correctly process this array, separating text from binary data and packaging it for the model.

You can mix and match different content block types in the content array. The supported block types include:

text
image
audio
resource (embedded content)
resource_link
Example: Returning Text and an Image
Here is an example of a valid JSON response from an MCP tool that returns both a text description and an image:

{
  "content": [
    {
      "type": "text",
      "text": "Here is the logo you requested."
    },
    {
      "type": "image",
      "data": "BASE64_ENCODED_IMAGE_DATA_HERE",
      "mimeType": "image/png"
    },
    {
      "type": "text",
      "text": "The logo was created in 2025."
    }
  ]
}

When the Gemini CLI receives this response, it will:

Extract all the text and combine it into a single functionResponse part for the model.
Present the image data as a separate inlineData part.
Provide a clean, user-friendly summary in the CLI, indicating that both text and an image were received.
This enables you to build sophisticated tools that can provide rich, multi-modal context to the Gemini model.

MCP Prompts as Slash Commands
In addition to tools, MCP servers can expose predefined prompts that can be executed as slash commands within the Gemini CLI. This allows you to create shortcuts for common or complex queries that can be easily invoked by name.

Defining Prompts on the Server
Here’s a small example of a stdio MCP server that defines prompts:

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'prompt-server',
  version: '1.0.0',
});

server.registerPrompt(
  'poem-writer',
  {
    title: 'Poem Writer',
    description: 'Write a nice haiku',
    argsSchema: { title: z.string(), mood: z.string().optional() },
  },
  ({ title, mood }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Write a haiku${mood ? ` with the mood ${mood}` : ''} called ${title}. Note that a haiku is 5 syllables followed by 7 syllables followed by 5 syllables `,
        },
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);

This can be included in settings.json under mcpServers with:

{
  "mcpServers": {
    "nodeServer": {
      "command": "node",
      "args": ["filename.ts"]
    }
  }
}

Invoking Prompts
Once a prompt is discovered, you can invoke it using its name as a slash command. The CLI will automatically handle parsing arguments.

Terminal window
/poem-writer --title="Gemini CLI" --mood="reverent"

or, using positional arguments:

Terminal window
/poem-writer "Gemini CLI" reverent

When you run this command, the Gemini CLI executes the prompts/get method on the MCP server with the provided arguments. The server is responsible for substituting the arguments into the prompt template and returning the final prompt text. The CLI then sends this prompt to the model for execution. This provides a convenient way to automate and share common workflows.

Managing MCP Servers with gemini mcp
While you can always configure MCP servers by manually editing your settings.json file, the Gemini CLI provides a convenient set of commands to manage your server configurations programmatically. These commands streamline the process of adding, listing, and removing MCP servers without needing to directly edit JSON files.

Adding a Server (gemini mcp add)
The add command configures a new MCP server in your settings.json. Based on the scope (-s, --scope), it will be added to either the user config ~/.gemini/settings.json or the project config .gemini/settings.json file.

Command:

Terminal window
gemini mcp add [options] <name> <commandOrUrl> [args...]

<name>: A unique name for the server.
<commandOrUrl>: The command to execute (for stdio) or the URL (for http/sse).
[args...]: Optional arguments for a stdio command.
Options (Flags):

-s, --scope: Configuration scope (user or project). [default: “project”]
-t, --transport: Transport type (stdio, sse, http). [default: “stdio”]
-e, --env: Set environment variables (e.g. -e KEY=value).
-H, --header: Set HTTP headers for SSE and HTTP transports (e.g. -H “X-Api-Key: abc123” -H “Authorization: Bearer abc123”).
--timeout: Set connection timeout in milliseconds.
--trust: Trust the server (bypass all tool call confirmation prompts).
--description: Set the description for the server.
--include-tools: A comma-separated list of tools to include.
--exclude-tools: A comma-separated list of tools to exclude.
Adding an stdio server
This is the default transport for running local servers.

Terminal window
# Basic syntax
gemini mcp add <name> <command> [args...]

# Example: Adding a local server
gemini mcp add my-stdio-server -e API_KEY=123 /path/to/server arg1 arg2 arg3

# Example: Adding a local python server
gemini mcp add python-server python server.py --port 8080

Adding an HTTP server
This transport is for servers that use the streamable HTTP transport.

Terminal window
# Basic syntax
gemini mcp add --transport http <name> <url>

# Example: Adding an HTTP server
gemini mcp add --transport http http-server https://api.example.com/mcp/

# Example: Adding an HTTP server with an authentication header
gemini mcp add --transport http secure-http https://api.example.com/mcp/ --header "Authorization: Bearer abc123"

Adding an SSE server
This transport is for servers that use Server-Sent Events (SSE).

Terminal window
# Basic syntax
gemini mcp add --transport sse <name> <url>

# Example: Adding an SSE server
gemini mcp add --transport sse sse-server https://api.example.com/sse/

# Example: Adding an SSE server with an authentication header
gemini mcp add --transport sse secure-sse https://api.example.com/sse/ --header "Authorization: Bearer abc123"

Listing Servers (gemini mcp list)
To view all MCP servers currently configured, use the list command. It displays each server’s name, configuration details, and connection status.

Command:

Terminal window
gemini mcp list

Example Output:

Terminal window
✓ stdio-server: command: python3 server.py (stdio) - Connected
✓ http-server: https://api.example.com/mcp (http) - Connected
✗ sse-server: https://api.example.com/sse (sse) - Disconnected

Removing a Server (gemini mcp remove)
To delete a server from your configuration, use the remove command with the server’s name.

Command:

Terminal window
gemini mcp remove <name>

Example:

Terminal window
gemini mcp remove my-server

This will find and delete the “my-server” entry from the mcpServers object in the appropriate settings.json file based on the scope (-s, --scope).

This website uses cookies from Google to deliver and enhance the quality of its services and to analyze traffic.
I understand.
Google logoFor Developers logo
Terms
|
Privacy