#!/usr/bin/env node

// Simple test script to check basic functionality
import { ConfigLoader } from './dist/config/loader.js';
import { McpClient } from './dist/core/mcp-client.js';

async function testBasic() {
  try {
    console.log('Testing basic config loading...');
    
    // Test YAML config loading
    const config = ConfigLoader.loadIntegrationConfig('./examples/integration-test.yaml');
    console.log('✅ Config loaded successfully');
    console.log('Config:', JSON.stringify(config, null, 2));
    
    // Test server config loading
    const serverConfig = ConfigLoader.loadServerConfig('./examples/server-config.json', 'filesystem');
    console.log('✅ Server config loaded successfully');
    console.log('Server config:', JSON.stringify(serverConfig, null, 2));
    
    console.log('✅ All basic tests passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBasic();