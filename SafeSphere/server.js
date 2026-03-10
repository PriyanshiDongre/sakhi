// This line tells the computer to use the Express tool we installed
const express = require('express'); 

// This starts the "App" engine
const app = express(); 

// This is the "Address" where the server will live on your laptop
const PORT = 5000; 

// This is a "Welcome Mat". If someone visits the main link, they see this.
app.get('/', (req, res) => {
    res.send('SafeSphere Backend is now running! 🛡️');
});

// This tells the server to start listening for visitors
app.listen(PORT, () => {
    console.log(`Server started! Go to http://localhost:${PORT} to see it.`);
});