const axios = require('axios');
require('dotenv').config();

async function testGroq() {
  try {
    console.log('Testing Groq API...');
    console.log('API Key:', process.env.GROQ_API_KEY ? '✓ Loaded' : '✗ Missing');
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a translator' },
          { role: 'user', content: 'Translate to Hindi: Hello' }
        ],
        temperature: 0.3,
        max_tokens: 256
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 60000
      }
    );
    
    console.log('✅ SUCCESS:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ ERROR Status:', error.response?.status);
    console.log('ERROR Body:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full Error:', error.message);
  }
}

testGroq();
