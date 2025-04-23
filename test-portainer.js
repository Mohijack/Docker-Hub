const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testPortainerConnection() {
  const portainerUrl = process.env.PORTAINER_URL;
  const username = process.env.PORTAINER_USERNAME;
  const password = process.env.PORTAINER_PASSWORD;

  console.log(`Testing connection to Portainer at ${portainerUrl}`);
  console.log(`Using username: ${username}`);
  
  try {
    // Test if Portainer is reachable
    console.log('Testing if Portainer is reachable...');
    await axios.get(`${portainerUrl}/api/status`);
    console.log('✅ Portainer is reachable');
    
    // Test authentication
    console.log('Testing authentication...');
    const authResponse = await axios.post(`${portainerUrl}/api/auth`, {
      username,
      password
    });
    
    if (authResponse.data && authResponse.data.jwt) {
      console.log('✅ Authentication successful');
      
      // Test API access with the token
      console.log('Testing API access...');
      const token = authResponse.data.jwt;
      const endpointsResponse = await axios.get(`${portainerUrl}/api/endpoints`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`✅ API access successful. Found ${endpointsResponse.data.length} endpoints.`);
      console.log('All tests passed! Portainer connection is working correctly.');
    } else {
      console.error('❌ Authentication response did not contain a JWT token');
    }
  } catch (error) {
    console.error('❌ Error connecting to Portainer:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Error message: ${error.message}`);
    }
  }
}

testPortainerConnection();
