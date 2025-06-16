#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📊 GitHub MCP Status Report\n');

try {
  // Read MCP config
  const mcpConfigPath = path.join(process.cwd(), 'mcp-config.json');
  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  
  // Read package.json
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Project Overview
  console.log('🚀 PROJECT OVERVIEW');
  console.log('=' .repeat(50));
  console.log(`Name: ${mcpConfig.project.name}`);
  console.log(`Version: ${packageJson.version}`);
  console.log(`Type: ${mcpConfig.project.type}`);
  console.log(`Repository: ${mcpConfig.project.repository}`);
  console.log(`Description: ${mcpConfig.project.description}\n`);
  
  // Feature Status
  console.log('✅ COMPLETED FEATURES');
  console.log('=' .repeat(30));
  mcpConfig.features.completed.forEach(feature => {
    console.log(`  ✓ ${feature}`);
  });
  
  console.log('\n🚧 IN PROGRESS FEATURES');
  console.log('=' .repeat(30));
  mcpConfig.features.in_progress.forEach(feature => {
    console.log(`  🔄 ${feature}`);
  });
  
  console.log('\n📋 PLANNED FEATURES');
  console.log('=' .repeat(30));
  mcpConfig.features.planned.forEach(feature => {
    console.log(`  📝 ${feature}`);
  });
  
  // Tech Stack
  console.log('\n🛠️ TECHNOLOGY STACK');
  console.log('=' .repeat(30));
  
  console.log('\nFrontend:');
  mcpConfig.tech_stack.frontend.forEach(tech => {
    console.log(`  • ${tech}`);
  });
  
  console.log('\nIntegrations:');
  mcpConfig.tech_stack.integrations.forEach(tech => {
    console.log(`  • ${tech}`);
  });
  
  console.log('\nDevelopment:');
  mcpConfig.tech_stack.development.forEach(tech => {
    console.log(`  • ${tech}`);
  });
  
  // MCP Configuration
  console.log('\n⚙️ MCP CONFIGURATION');
  console.log('=' .repeat(30));
  console.log(`Enabled: ${mcpConfig.github_mcp.enabled ? '✅' : '❌'}`);
  console.log(`Auto Sync: ${mcpConfig.github_mcp.auto_sync ? '✅' : '❌'}`);
  console.log(`PR Templates: ${mcpConfig.github_mcp.pr_templates ? '✅' : '❌'}`);
  console.log(`Issue Templates: ${mcpConfig.github_mcp.issue_templates ? '✅' : '❌'}`);
  console.log(`Automated Testing: ${mcpConfig.github_mcp.automated_testing ? '✅' : '❌'}`);
  console.log(`Protected Branches: ${mcpConfig.github_mcp.branch_protection.join(', ')}`);
  
  // File Status
  console.log('\n📁 FILE STATUS');
  console.log('=' .repeat(30));
  
  const filesToCheck = [
    '.github/workflows/ci.yml',
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/pull_request_template.md',
    '.eslintrc.js',
    '.prettierrc',
    'GITHUB_MCP_SETUP.md'
  ];
  
  filesToCheck.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  // Progress Summary
  const totalFeatures = mcpConfig.features.completed.length + 
                       mcpConfig.features.in_progress.length + 
                       mcpConfig.features.planned.length;
  const completedPercentage = Math.round((mcpConfig.features.completed.length / totalFeatures) * 100);
  
  console.log('\n📈 PROGRESS SUMMARY');
  console.log('=' .repeat(30));
  console.log(`Total Features: ${totalFeatures}`);
  console.log(`Completed: ${mcpConfig.features.completed.length} (${completedPercentage}%)`);
  console.log(`In Progress: ${mcpConfig.features.in_progress.length}`);
  console.log(`Planned: ${mcpConfig.features.planned.length}`);
  
  console.log('\n🎯 NEXT ACTIONS');
  console.log('=' .repeat(30));
  if (mcpConfig.features.in_progress.length > 0) {
    console.log(`  • Focus on completing: ${mcpConfig.features.in_progress[0]}`);
  }
  if (mcpConfig.features.planned.length > 0) {
    console.log(`  • Next to start: ${mcpConfig.features.planned[0]}`);
  }
  console.log('  • Update roadmap.md with latest progress');
  console.log('  • Create issues for new features');
  console.log('  • Review and update MCP configuration\n');
  
} catch (error) {
  console.error('❌ Failed to generate status report:', error.message);
  process.exit(1);
} 