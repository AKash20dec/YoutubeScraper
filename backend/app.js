const express = require('express');
const mongoose = require('mongoose');
const videoRoutes = require('./routes/videos');
const cors = require("cors");
const { PORT } = require('./config');


require("dotenv").config()

const app = express();
app.use(express.json());
app.use(cors())

console.log(PORT)

// MongoDB Connection
// mongoose.connect();
const connectDB = async () => {
    let client = await mongoose.connect('mongodb+srv://yakash20dec:D0KhFpBzgeriyjfS@cluster0.gcscn.mongodb.net/');
    console.log('MongoDB Connected');

}
connectDB()

// Use Video Routes
app.use('/api/videos', videoRoutes);

// Start Server
// const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});