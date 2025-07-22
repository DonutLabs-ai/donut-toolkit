#!/usr/bin/env node

/**
 * Simple MCP Server starter script to test functionality
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types");

// Import AgentKit functions - using require since this is a JS file
const { defillamaActionProvider, DexScreenerActionProvider } = require("@coinbase/agentkit");

// Create a simple read-only MCP server
async function createReadOnlyMcpServer() {
  console.log("Starting AgentKit MCP Server...");
  
  // Create action providers
  const providers = [
    defillamaActionProvider(),
    new DexScreenerActionProvider(),
  ];
  
  console.log("Created action providers:", providers.map(p => p.constructor.name));
  
  // Collect actions from providers
  const actions = [];
  for (const provider of providers) {
    try {
      const providerActions = provider.getActions(null);
      actions.push(...providerActions);
      console.log(`Added ${providerActions.length} actions from ${provider.constructor.name}`);
    } catch (error) {
      console.warn(`Skipping provider ${provider.constructor.name}: ${error.message}`);
    }
  }
  
  console.log(`Total actions available: ${actions.length}`);
  
  // Create MCP tools from actions
  const tools = actions.map(action => ({
    name: action.name,
    description: action.description,
    inputSchema: action.schema ? {} : {}, // Simplified schema for now
  }));
  
  console.log("Tools:", tools.map(t => t.name));
  
  // Create MCP server
  const server = new Server(
    {
      name: "agentkit",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const action = actions.find(action => action.name === request.params.name);
      if (!action) {
        throw new Error(`Tool ${request.params.name} not found`);
      }

      const result = await action.invoke(request.params.arguments || {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Tool ${request.params.name} failed: ${error.message}`);
    }
  });

  return server;
}

// Start the server
async function main() {
  try {
    const server = await createReadOnlyMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("AgentKit MCP Server started successfully");
  } catch (error) {
    console.error("Failed to start MCP Server:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}