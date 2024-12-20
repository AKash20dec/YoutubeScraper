const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    videoId: { type: String, unique: true },
    title: String,
    description: String,
    videoUrl: String,
    thumbnails: [String],
    viewCount: Number,
    likeCount: Number,
    dislikeCount: Number,
    channelTitle: String,
    channelDescription: String,
    channelThumbnail: String,
    channelSubscribers: Number,
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema); //videos