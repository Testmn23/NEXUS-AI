// server.js
const express = require('express');
const path = require('path');
// const baileysHandler = require('./baileys_handler'); // Will be used later
const routes = require('./routes/api'); // Will be used later

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routes); // Will be used later for API endpoints

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
