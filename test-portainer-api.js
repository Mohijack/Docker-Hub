const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const portainerUrl = process.env.PORTAINER_URL;
const username = process.env.PORTAINER_USERNAME;
const password = process.env.PORTAINER_PASSWORD;

console.log(`Testing Portainer API at ${portainerUrl}`);
console.log(`Using username: ${username}`);

// Function to test Portainer API status
async function testPortainerStatus() {
  try {
    console.log('\n--- Testing Portainer Status ---');
    const response = await axios.get(`${portainerUrl}/api/status`);
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error testing Portainer status:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Function to test Portainer API endpoints
async function testPortainerEndpoints() {
  try {
    console.log('\n--- Testing Portainer Endpoints ---');
    const response = await axios.get(`${portainerUrl}/api/endpoints`);
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error testing Portainer endpoints:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Function to test Portainer authentication with different formats
async function testPortainerAuth() {
  // Format 1: Standard JSON (lowercase)
  try {
    console.log('\n--- Testing Authentication Format 1: Standard JSON (lowercase) ---');
    const response = await axios.post(`${portainerUrl}/api/auth`, {
      username,
      password
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 1:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Format 2: Camel Case
  try {
    console.log('\n--- Testing Authentication Format 2: Camel Case ---');
    const response = await axios.post(`${portainerUrl}/api/auth`, {
      Username: username,
      Password: password
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 2:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Format 3: Form Data
  try {
    console.log('\n--- Testing Authentication Format 3: Form Data ---');
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${portainerUrl}/api/auth`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 3:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Format 4: Different Endpoint
  try {
    console.log('\n--- Testing Authentication Format 4: Different Endpoint ---');
    const response = await axios.post(`${portainerUrl}/api/users/login`, {
      username,
      password
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 4:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Format 5: Different Endpoint with Camel Case
  try {
    console.log('\n--- Testing Authentication Format 5: Different Endpoint with Camel Case ---');
    const response = await axios.post(`${portainerUrl}/api/users/login`, {
      Username: username,
      Password: password
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 5:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Format 6: Different Endpoint with Form Data
  try {
    console.log('\n--- Testing Authentication Format 6: Different Endpoint with Form Data ---');
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${portainerUrl}/api/users/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error with Format 6:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  throw new Error('All authentication formats failed');
}

// Main function to run all tests
async function runTests() {
  try {
    // Test Portainer status
    const statusData = await testPortainerStatus();
    console.log(`\nPortainer version: ${statusData.Version}`);

    // Test authentication
    const authData = await testPortainerAuth();
    console.log('\nAuthentication successful!');
    console.log('JWT Token:', authData.jwt);

    // Test endpoints with token
    if (authData && authData.jwt) {
      try {
        console.log('\n--- Testing Endpoints with Token ---');
        const response = await axios.get(`${portainerUrl}/api/endpoints`, {
          headers: {
            'Authorization': `Bearer ${authData.jwt}`
          }
        });
        console.log('Status Code:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.error('Error testing endpoints with token:', error.message);
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
  } catch (error) {
    console.error('\nTests failed:', error.message);
  }
}

// Run the tests
runTests();
