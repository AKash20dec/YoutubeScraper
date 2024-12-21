const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Video = require('../models/video');
let fs = require("fs");
let puppeteer = require("puppeteer");

const router = express.Router();


router.get('/scrape-trending', async (req, res) => {
    const browser = await puppeteer.launch({
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
        ],
        executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.youtube.com/feed/trending', { waitUntil: 'networkidle2' });

    const html = await page.content();
    const $ = cheerio.load(html);

    try {
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

            const description = $(elem).find('#description-text').text().trim() || 'No description available';
            const channelTitle = $(elem).find('#channel-name').text().trim() || 'Unknown Channel';

            const viewCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, ''), 10) || 0;
            const likeCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[0], 10) || 0;
            const dislikeCount = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[2], 10) || 0;
            const channelDescription = $(elem).find('.yt-simple-endpoint').text().trim() || 'No channel description available';

            const channelSubscribers = parseInt($(elem).find('.style-scope ytd-video-meta-block').first().text().trim().replace(/[^0-9]/g, '').split(' ')[4], 10) || 0;

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

        const pageNum = parseInt(req.query.page) || 1;
        const limit = 10;
        const startIndex = (pageNum - 1) * limit;
        const paginatedVideos = videos.slice(startIndex, startIndex + limit);

        res.status(200).json({
            message: 'Videos scraped successfully.',
            page: pageNum,
            perPage: limit,
            totalVideos: videos.length,
            totalPages: Math.ceil(videos.length / limit),
            videos: paginatedVideos
        });
    } catch (err) {
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
