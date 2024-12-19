const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Video = require('../models/video');
let fs = require("fs")
let puppeteer = require("puppeteer")

const router = express.Router();

// Scrape Trending Videos from YouTube
// Scrape Trending Videos from YouTube
router.get('/scrape-trending', async (req, res) => {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('https://www.youtube.com/feed/trending', { waitUntil: 'networkidle2' });

        const html = await page.content();
        const $ = cheerio.load(html);

        const videos = [];

        $('ytd-video-renderer').each((i, elem) => {
            const videoId = $(elem).find('a#thumbnail').attr('href')?.split('=')[1];
            if (!videoId) return; // Skip if videoId is not present

            const title = $(elem).find('a#video-title').text().trim();
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const thumbnails = [
                `https://img.youtube.com/vi/${videoId}/default.jpg`,
                `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            ];

            // Extracting additional fields
            const description = $(elem).find('#description-text').text().trim() || 'No description available';
            const channelTitle = $(elem).find('#channel-name').text().trim() || 'Unknown Channel';

            // Ensure numeric fields have valid values (parse or default to 0)
            const viewCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, ''), 10) || 0;
            const likeCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[0], 10) || 0;
            const dislikeCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[2], 10) || 0;
            const channelDescription = $(elem).find('.yt-simple-endpoint').text().trim() || 'No channel description available';

            // Ensure that channelSubscribers is a number (default to 0 if invalid)
            const channelSubscribers = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[4], 10) || 0;

            // Push the cleaned and valid data into the videos array
            videos.push({
                videoId,
                title,
                videoUrl,
                thumbnails,
                description,
                channelTitle,
                viewCount,
                likeCount,
                dislikeCount,
                channelDescription,
                channelSubscribers
            });
        });

        // Log the extracted video data for debugging
        console.log(videos);

        // Insert or update videos in the database
        const bulkOps = videos.map(video => ({
            updateOne: {
                filter: { videoId: video.videoId },
                update: video,
                upsert: true
            }
        }));

        // Only perform bulk write if there are videos to update
        if (bulkOps.length > 0) {
            await Video.bulkWrite(bulkOps);
        }

        // Respond with a success message
        res.status(200).json({ message: 'Videos scraped successfully.', count: videos.length });
    } catch (err) {
        console.error('Error scraping videos:', err);
        res.status(500).json({ message: 'Error scraping videos.' });
    } finally {
        await browser.close();
    }
});

// Fetch All Videos
router.get('/', async (req, res) => {
    try {
        const videos = await Video.find();
        res.status(200).json(videos);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching videos.' });
    }
});

// Fetch Video Details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findOne({ videoId: id });
        if (!video) return res.status(404).json({ message: 'Video not found.' });
        res.status(200).json(video);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching video details.' });
    }
});

module.exports = router;