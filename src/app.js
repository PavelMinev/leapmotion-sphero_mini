const express = require('express');
const path = require('path');

const app = express();

const spheroModule = require('./sphero_module/index.js');
spheroModule();

const staticPath = path.join(__dirname, 'public');

app.use(express.static(staticPath));

app.all('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(3002);
console.log("server running on port 3001");