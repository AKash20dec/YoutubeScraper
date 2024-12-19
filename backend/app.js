const express = require('express');
const mongoose = require('mongoose');
const videoRoutes = require('./routes/videos');
const cors = require("cors")

require("dotenv").config()

const app = express();
app.use(express.json());
app.use(cors())

// MongoDB Connection
// mongoose.connect('mongodb+srv://yakash20dec:D0KhFpBzgeriyjfS@cluster0.gcscn.mongodb.net/');
const connectDB = async () => {
    let client = await mongoose.connect(process.env.MONGODB);
    console.log('MongoDB Connected');

}
connectDB()

// Use Video Routes
app.use('/api/videos', videoRoutes);

// Start Server
// const PORT = 3000;
app.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});