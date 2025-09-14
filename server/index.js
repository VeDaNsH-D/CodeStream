const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get the initial code
app.get('/api/code', (req, res) => {
  const initialCode = `// Fetched from server!
function greet() {
  console.log("Hello from the server!");
}`;
  res.json({ code: initialCode });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
