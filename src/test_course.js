const http = require('http');

http.get('http://localhost:5000/api/courses/3', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
}).on('error', (err) => console.error('Error:', err));
