const express = require('express');
const cors = require('cors');
const path = require('path');
const { YouTube } = require('youtube-sr');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const TEMP_DOWNLOAD_DIR = path.join(os.tmpdir(), 'syncadelica-downloads');
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB (adjust based on Render plan)
const MAX_FILE_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Update CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' blob:; media-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com;"
  );
  next();
});

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      } catch (statError) {
        console.warn(`Could not stat file ${filePath}: ${statError.message}`);
      }
    }
  } catch (readDirError) {
    console.error(`Could not read directory ${dirPath} for size calculation: ${readDirError.message}`);
  }
  return totalSize;
}

async function enforceCacheLimits() {
  console.log('Running cache cleanup...');
  if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
    // Attempt to create the directory if it doesn't exist, as it might be the first run.
    try {
      await fs.promises.mkdir(TEMP_DOWNLOAD_DIR, { recursive: true });
      console.log('Cache directory created during cleanup check.');
    } catch (mkdirError) {
      console.error(`Cache cleanup: Could not create cache directory ${TEMP_DOWNLOAD_DIR}: ${mkdirError.message}`);
      // If creation fails, it's likely a permissions issue or an invalid path, so we can't proceed.
      return;
    }
  }
  // Re-check after attempting creation. If it still doesn't exist, something is wrong.
  if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
    console.log('Cache directory does not exist. Skipping cleanup.');
    return;
  }

  let filesWithStats = [];
  try {
    const files = await fs.promises.readdir(TEMP_DOWNLOAD_DIR);
    for (const file of files) {
      const filePath = path.join(TEMP_DOWNLOAD_DIR, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile()) {
          filesWithStats.push({ path: filePath, stats });
        }
      } catch (statError) {
        console.warn(`Cache cleanup: Could not stat file ${filePath}: ${statError.message}`);
      }
    }
  } catch (readDirError) {
    console.error(`Cache cleanup: Could not read cache directory: ${readDirError.message}`);
    return;
  }

  // 1. Delete files older than MAX_FILE_AGE_MS
  const now = Date.now();
  for (const file of filesWithStats) {
    if (now - file.stats.mtime.getTime() > MAX_FILE_AGE_MS) {
      console.log(`Deleting old file: ${file.path} (age: ${((now - file.stats.mtime.getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)} days)`);
      try {
        await fs.promises.unlink(file.path);
      } catch (unlinkError) {
        console.error(`Cache cleanup: Error deleting old file ${file.path}: ${unlinkError.message}`);
      }
    }
  }

  // 2. Enforce MAX_CACHE_SIZE_BYTES by deleting oldest files (least recently accessed/modified)
  // Re-read stats as some files might have been deleted
  filesWithStats = [];
  let currentCacheSize = 0;
  try {
    const remainingFiles = await fs.promises.readdir(TEMP_DOWNLOAD_DIR);
    for (const file of remainingFiles) {
      const filePath = path.join(TEMP_DOWNLOAD_DIR, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile()) {
          filesWithStats.push({ path: filePath, stats });
          currentCacheSize += stats.size;
        }
      } catch (statError) {
        console.warn(`Cache cleanup (size check): Could not stat file ${filePath}: ${statError.message}`);
      }
    }
  } catch (readDirError) {
    console.error(`Cache cleanup (size check): Could not re-read cache directory: ${readDirError.message}`);
    return;
  }

  if (currentCacheSize > MAX_CACHE_SIZE_BYTES) {
    console.log(`Cache size (${(currentCacheSize / (1024*1024)).toFixed(2)}MB) exceeds limit (${(MAX_CACHE_SIZE_BYTES / (1024*1024)).toFixed(2)}MB). Pruning...`);
    filesWithStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime()); // Sort by modification time, oldest first

    for (const file of filesWithStats) {
      if (currentCacheSize <= MAX_CACHE_SIZE_BYTES) break;
      console.log(`Pruning file by size limit: ${file.path}`);
      try {
        await fs.promises.unlink(file.path);
        currentCacheSize -= file.stats.size;
      } catch (unlinkError) {
        console.error(`Cache cleanup: Error pruning file ${file.path}: ${unlinkError.message}`);
      }
    }
  }
  console.log(`Cache cleanup finished. Current size: ${(currentCacheSize / (1024*1024)).toFixed(2)}MB`);
}

app.get('/stream', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('URL is required');
  }
  console.log('Request to stream/download URL:', url);
  try {
    if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
      fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
    }

    // Basic sanitization for filename. Consider more robust slugification for production.
    const safeFilenameBase = encodeURIComponent(url).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 100);
    const tempFilePath = path.join(TEMP_DOWNLOAD_DIR, `${safeFilenameBase}.mp3`);

    if (fs.existsSync(tempFilePath)) {
      console.log('Serving cached file:', tempFilePath);
      // Update modification time to mark as recently accessed
      try {
        const now = new Date();
        fs.utimesSync(tempFilePath, now, now);
      } catch (touchError) {
        console.warn(`Could not update access time for ${tempFilePath}: ${touchError.message}`);
      }
      res.header('Accept-Ranges', 'bytes');
      return res.sendFile(tempFilePath, (err) => {
        if (err) {
          console.error('Error sending cached file:', err);
          // Attempt to delete potentially corrupted cache file
          try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (e) { console.error("Error deleting corrupted cached file:", e); }
          if (!res.headersSent) {
            res.status(500).send('Error serving cached audio');
          }
        }
      });
    }

    console.log('Downloading to temporary file:', tempFilePath);
    const ytdlOptions = {
      output: tempFilePath,
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0', // yt-dlp expects '0' for best quality
      noCheckCertificates: true,
      preferFreeFormats: true,
      noProgress: true,
      // quiet: true, // Suppress informational messages, only errors. Enable if stderr is too noisy.
    };

    // Increased timeout for potentially long downloads (e.g., 10 minutes)
    try {
      const output = await youtubedl(url, ytdlOptions, { timeout: 600000 });
      console.log('Download complete. Serving file:', tempFilePath);
      if (output.stdout) console.log(`yt-dlp stdout: ${output.stdout.trim()}`);
      if (output.stderr && output.stderr.trim().length > 0) console.log(`yt-dlp stderr (non-fatal): ${output.stderr.trim()}`);

      if (!fs.existsSync(tempFilePath)) {
        console.error('Downloaded file path does not exist after successful download:', tempFilePath);
        if (!res.headersSent) {
          return res.status(500).send('Downloaded audio file not found on server.');
        }
        return;
      }

      res.header('Accept-Ranges', 'bytes');
      res.sendFile(tempFilePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          // Attempt to delete potentially corrupted cache file
          try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch (e) { console.error("Error deleting corrupted file on send error:", e); }
          if (!res.headersSent) {
            res.status(500).send('Error serving audio');
          }
        }
        // Note: File is kept for caching.
      });
    } catch (error) {
      console.error(`yt-dlp exec error: ${error.message}`);
      if (error.stderr) console.error(`yt-dlp stderr: ${error.stderr.trim()}`);
      // Clean up partially downloaded file if it exists
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) { console.error("Error deleting temp file on failure:", e); }
      }
      if (!res.headersSent) {
        return res.status(500).send('Error downloading audio');
      }
    }

  } catch (err) {
    console.error('Error in /stream endpoint:', err);
    if (!res.headersSent) {
        res.status(500).send('Server error processing stream request');
    }
  }
});

app.get('/search', async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limitPerPage = parseInt(req.query.limit) || 10; // Default to 10 results per page

  console.log(`Attempting to search for: "${query}", page: ${page}, limit: ${limitPerPage}`);

  if (!query) {
    return res.status(400).json({ message: 'Search query (q) is required' });
  }

  try {
    // youtube-sr limit is total, so fetch enough for the current page
    const youtubeSrTotalLimit = page * limitPerPage;
    const allFetchedResults = await YouTube.search(query, { limit: youtubeSrTotalLimit, type: 'video' });

    const startIndex = (page - 1) * limitPerPage;
    const searchResults = allFetchedResults.slice(startIndex, startIndex + limitPerPage);

    if (!searchResults || searchResults.length === 0) {
      console.log(`No YouTube results found for: ${query}`);
      return res.json([]);
    }

    const formattedResults = searchResults.map(video => {
      if (!video || !video.id) return null; // Skip if video data is incomplete
      return {
        id: video.id,
        title: video.title || 'Unknown Title',
        artist: video.channel?.name || 'Unknown Artist',
        albumArtUrl: video.thumbnail?.url || null,
        youtubeUrl: video.url,
      };
    }).filter(item => item !== null); // Filter out any null entries

    console.log(`Search processed with youtube-sr, returning ${formattedResults.length} items for page ${page} of query: "${query}"`);
    res.json(formattedResults);

  } catch (err) {
    console.error('youtube-sr search execution error:', err);
    res.status(500).json({ message: 'Error processing YouTube search with youtube-sr' });
  }
});

// Add favicon to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// For Vercel, we export the app. app.listen() is handled by Vercel.
// The cache cleanup on startup will run when a new serverless function instance starts (cold start).
// Periodic cleanup via setInterval is not effective in a serverless environment.
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) { // Only listen locally
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initial cleanup on startup for local development
    enforceCacheLimits().catch(err => console.error("Initial cache cleanup failed:", err));
    // Periodic cleanup for local development
    setInterval(() => enforceCacheLimits().catch(err => console.error("Periodic cache cleanup failed:", err)), CLEANUP_INTERVAL_MS);
  });
} else {
  // In Vercel, run initial cleanup once if possible (e.g., on cold start)
  enforceCacheLimits().catch(err => console.error("Initial cache cleanup failed:", err));
}

module.exports = app;