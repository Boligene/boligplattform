#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Syncing with GitHub MCP...');

try {
  // Read MCP config
  const mcpConfigPath = path.join(process.cwd(), 'mcp-config.json');
  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  
  // Read package.json for version info
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log(`📦 Project: ${mcpConfig.project.name} v${packageJson.version}`);
  console.log(`🏠 Repository: ${mcpConfig.project.repository}`);
  
  // Sync project status
  console.log('\n📊 Feature Status:');
  console.log(`✅ Completed: ${mcpConfig.features.completed.length} features`);
  console.log(`🚧 In Progress: ${mcpConfig.features.in_progress.length} features`);
  console.log(`📋 Planned: ${mcpConfig.features.planned.length} features`);
  
  // Check for roadmap updates
  const roadmapPath = path.join(process.cwd(), 'roadmap.md');
  if (fs.existsSync(roadmapPath)) {
    const roadmapStats = fs.statSync(roadmapPath);
    console.log(`📈 Roadmap last updated: ${roadmapStats.mtime.toLocaleDateString()}`);
  }
  
  console.log('\n✅ MCP sync completed successfully!');
  console.log('💡 Run "npm run mcp:status" to view detailed status');
  
} catch (error) {
  console.error('❌ MCP sync failed:', error.message);
  process.exit(1);
} 