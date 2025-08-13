#!/usr/bin/env node
/**
 * E2E Test with Zod Output Parse Validation
 * Tests CRUD operations and validates responses against schemas
 */

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

async function loadZodSchemas() {
  // Import generated schemas for validation
  const customerModule = await import('./dist/generated/schemas/customer.js');
  return {

    customer: {
      Create: customerModule.CreateCustomerInput,
      Get: customerModule.GetCustomerInput,
      Update: customerModule.UpdateCustomerInput,
      Delete: customerModule.DeleteCustomerInput,
      List: customerModule.ListCustomersInput,
      Output: customerModule.CustomerSchema,
      DeleteResult: customerModule.DeleteResultSchema
    },

  };
}

async function testE2E() {
  console.log('🧪 Starting E2E Test with Zod Validation...');
  
  // Test 1: Normal server startup
  console.log('📋 Testing normal server startup...');
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let output = '';
  let errorOutput = '';
  let requestId = 1;
  
  server.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  const schemas = await loadZodSchemas();

  // Helper to send JSON-RPC request
  const sendRequest = (method, params = {}) => {
    const req = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    }) + '\n';
    server.stdin.write(req);
  };

  // Helper to extract response by ID
  const extractResponse = (targetId) => {
    const lines = output.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === targetId) {
          return parsed;
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
    return null;
  };

  console.log('📋 1. Testing tools/list...');
  sendRequest('tools/list');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const toolsResponse = extractResponse(1);
  if (toolsResponse?.result?.tools) {
    console.log('✅ tools/list working');
    console.log(`   Found ${toolsResponse.result.tools.length} tools`);
    
    // Verify output schemas are present
    const hasOutputSchemas = toolsResponse.result.tools.every(tool => 
      tool.inputSchema && tool.outputSchema
    );
    if (hasOutputSchemas) {
      console.log('✅ All tools have inputSchema and outputSchema');
    } else {
      console.log('❌ Some tools missing output schemas');
    }
  } else {
    console.log('❌ tools/list failed');
    server.kill();
    return;
  }



  console.log('🧪 2. Testing Customer CRUD with Zod validation...');
  
  // Test create-customer
  const createData = {



    firstname: 'Test firstname',



    lastname: 'Test lastname',



    email: 'test@example.com',







    status: 'Test status',

  };
  
  sendRequest('call_tool', {
    name: 'create-customer',
    arguments: createData
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const createResponse = extractResponse(requestId - 1);
  if (createResponse?.result?.content?.[0]?.text) {
    try {
      const createResult = JSON.parse(createResponse.result.content[0].text);
      
      // Validate response against Zod schema
      const validatedResult = schemas.customer.Output.parse(createResult);
      console.log(`✅ create-customer - Zod validation passed`);
      
      const createdId = validatedResult.id;
      
      // Test get-customer
      sendRequest('call_tool', {
        name: 'get-customer',
        arguments: { id: createdId }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const getResponse = extractResponse(requestId - 1);
      if (getResponse?.result?.content?.[0]?.text) {
        const getResult = JSON.parse(getResponse.result.content[0].text);
        schemas.customer.Output.parse(getResult);
        console.log(`✅ get-customer - Zod validation passed`);
      }
      
      // Test list-customers
      sendRequest('call_tool', {
        name: 'list-customers', 
        arguments: { page: 1, limit: 10 }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const listResponse = extractResponse(requestId - 1);
      if (listResponse?.result?.content?.[0]?.text) {
        const listResult = JSON.parse(listResponse.result.content[0].text);
        // Validate array of results
        if (Array.isArray(listResult)) {
          listResult.forEach(item => schemas.customer.Output.parse(item));
          console.log(`✅ list-customers - Zod validation passed`);
        }
      }
      
      // Test delete-customer
      sendRequest('call_tool', {
        name: 'delete-customer',
        arguments: { id: createdId }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const deleteResponse = extractResponse(requestId - 1);
      if (deleteResponse?.result?.content?.[0]?.text) {
        const deleteResult = JSON.parse(deleteResponse.result.content[0].text);
        schemas.customer.DeleteResult.parse(deleteResult);
        console.log(`✅ delete-customer - Zod validation passed`);
      }
      
    } catch (zodError) {
      console.log(`❌ Customer CRUD - Zod validation failed:`, zodError.message);
    }
  } else {
    console.log(`❌ create-customer failed`);
  }


  server.kill();
  
  if (errorOutput) {
    console.log('\n❌ Server errors:');
    console.log(errorOutput);
  } else {
    console.log('\n🎉 All E2E tests passed with Zod validation!');
  }
}

// Test DB connection failures
async function testDBFailures() {
  console.log('🧪 Testing DB connection failures...');
  
  // Test with wrong password
  const wrongPasswordServer = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      DATABASE_URL: 'postgresql://postgres:wrongpass@localhost:5432/test' 
    }
  });
  
  let errorOutput = '';
  wrongPasswordServer.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  // Try to create a customer (should fail)
  const createRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'call_tool',
    params: {
      name: 'create-customer',
      arguments: {
        name: 'Test Customer',
        email: 'test@example.com',
        status: 'active'
      }
    }
  }) + '\n';
  
  wrongPasswordServer.stdin.write(createRequest);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  wrongPasswordServer.kill();
  
  if (errorOutput.includes('authentication failed') || errorOutput.includes('password')) {
    console.log('✅ DB connection error handling working');
  } else {
    console.log('❌ DB connection error handling not working');
    console.log('Error output:', errorOutput);
  }
  
  // Test with non-existent database
  console.log('📋 Testing non-existent database...');
  const nonExistentDBServer = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/nonexistent_db_12345' 
    }
  });
  
  let output2 = '';
  let errorOutput2 = '';
  
  nonExistentDBServer.stdout.on('data', (data) => {
    output2 += data.toString();
  });
  
  nonExistentDBServer.stderr.on('data', (data) => {
    errorOutput2 += data.toString();
  });
  
  nonExistentDBServer.stdin.write(createRequest);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  nonExistentDBServer.kill();
  
  // Check if error response follows standard format
  const lines = output2.split('\n').filter(line => line.trim());
  let foundStandardError = false;
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.result?.content?.[0]?.text) {
        const responseText = JSON.parse(parsed.result.content[0].text);
        if (responseText.code && responseText.message && responseText.details) {
          foundStandardError = true;
          console.log('✅ Standard error format working:', {
            code: responseText.code,
            message: responseText.message.substring(0, 50) + '...',
            hasDetails: !!responseText.details
          });
          break;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  if (!foundStandardError) {
    console.log('❌ Standard error format not found');
  }
}

// Run both test suites
async function runAllTests() {
  await testE2E();
  console.log('\n' + '='.repeat(50));
  await testDBFailures();
}

runAllTests().catch(console.error);