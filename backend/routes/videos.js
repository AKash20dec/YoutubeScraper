const express = require('express');
const { chromium } = require('playwright');
const Video = require('../models/video'); // Adjust the path to your Video model

const router = express.Router();

// Scrape Trending Videos from YouTube
router.get('/scrape-trending', async (req, res) => {
    try {
        // Launch Playwright browser
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Navigate to YouTube Trending
        await page.goto('https://www.youtube.com/feed/trending', { waitUntil: 'domcontentloaded' });

        // Wait for videos to load on the page
        await page.waitForSelector('ytd-video-renderer');

        // Scrape video details
        const videos = await page.evaluate(() => {
            const videoElements = Array.from(document.querySelectorAll('ytd-video-renderer'));
            return videoElements.map(elem => {
                const videoId = elem.querySelector('a#thumbnail')?.href.split('=')[1];
                const title = elem.querySelector('a#video-title')?.innerText.trim();
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const thumbnails = [
                    `https://img.youtube.com/vi/${videoId}/default.jpg`,
                    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                ];
                const description = elem.querySelector('#description-text')?.innerText.trim() || 'No description available';
                const channelTitle = elem.querySelector('#channel-name')?.innerText.trim() || 'Unknown Channel';
                const viewCountText = elem.querySelector('.style-scope.ytd-video-meta-block')?.innerText.trim();
                const viewCount = parseInt(viewCountText?.replace(/[^0-9]/g, '') || '0', 10);

                return { videoId, title, videoUrl, thumbnails, description, channelTitle, viewCount };
            });
        });

        // Close the browser
        await browser.close();

        // Save or process videos
        const bulkOps = videos.map(video => ({
            updateOne: {
                filter: { videoId: video.videoId },
                update: video,
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await Video.bulkWrite(bulkOps);
        }

        res.status(200).json({
            message: 'Videos scraped successfully.',
            videos,
        });
    } catch (err) {
        console.error('Error scraping videos:', err);
        res.status(500).json({ message: 'Error scraping videos.' });
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
