import express from 'express';
import cors from 'cors';
import { fetchSongs, fetchDownloadUrl, fetchSongDetails } from './musicService'; // Import fetchSongDetails
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware
app.use(cors({
  origin: '*',
}));

app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }
  try {
    const songs = await fetchSongs(query);
    res.json(songs);
  } catch (err) {
    console.error('[server.ts] Error in /api/search:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/song-details', async (req, res) => {
  const pageUrl = req.query.page as string;
  const artist = req.query.artist as string | undefined;
  const title = req.query.title as string | undefined;

  if (!pageUrl) {
    return res.status(400).json({ error: 'Missing page parameter for song details' });
  }
  try {
    // Pass artist and title from query to fetchSongDetails
    const details = await fetchSongDetails(pageUrl, undefined, artist, title);
    if (!details || !details.downloadUrl) {
      return res.status(404).json({ error: 'Song details or download URL not found' });
    }
    res.json(details); // Send back all details: downloadUrl, albumArtUrl, artist, title
  } catch (err) {
    console.error('[server.ts] Error in /api/song-details:', err);
    res.status(500).json({ error: 'Internal server error fetching song details' });
  }
});

app.get('/api/stream', async (req, res) => {
  const directAudioUrl = req.query.url as string; // Changed from pageUrl to url
  if (!directAudioUrl) {
    return res.status(400).json({ error: 'Missing direct audio URL (url) parameter' });
  }
  try {
    const downloadUrl = directAudioUrl;
    const range = req.headers.range;
    const commonUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    if (range) {
      console.log(`[server.ts] /api/stream: Range request for ${downloadUrl}: ${range}`);
      const audioRes = await fetch(downloadUrl, {
        headers: { 
          'Range': range,
          'User-Agent': commonUserAgent 
        }
      });

      // It's important to handle the response status correctly for range requests.
      // A 206 (Partial Content) is expected. Other 2xx statuses might occur if the server ignores the range.

      if (!audioRes.ok && audioRes.status !== 206) { // Allow 206 Partial Content
        console.error(`[server.ts] /api/stream: Ranged GET to ${downloadUrl} with range ${range} failed with status ${audioRes.status}`);
        return res.status(502).json({ error: `Failed to fetch audio range from source. Status: ${audioRes.status}` });
      }
      
      // Proxy necessary headers from sefon.pro's response
      const responseHeaders: Record<string, string> = {
        'Accept-Ranges': audioRes.headers.get('accept-ranges') || 'bytes',
        'Content-Type': audioRes.headers.get('content-type') || 'audio/mpeg',
      };
      if (audioRes.headers.get('content-length')) {
        responseHeaders['Content-Length'] = audioRes.headers.get('content-length')!;
      }
      if (audioRes.headers.get('content-range')) {
        responseHeaders['Content-Range'] = audioRes.headers.get('content-range')!;
      }

      // Use actual status from upstream (e.g., 206 for partial, 200 if range was ignored but still OK)
      res.writeHead(audioRes.status, responseHeaders);
      if (!audioRes.ok || !audioRes.body) {
        // This case should ideally be caught by the check above, but as a fallback:
        console.error(`[server.ts] /api/stream: Upstream response for ranged GET to ${downloadUrl} was not ok or body missing, status ${audioRes.status}`);
        // End the response if headers were already sent but body is bad
        return res.end();
      }
      audioRes.body.pipe(res);
    } else {
      // No range request from client, fetch full content
      console.log(`[server.ts] /api/stream: Full request for ${downloadUrl}`);
      const audioRes = await fetch(downloadUrl, {
        headers: { 'User-Agent': commonUserAgent }
      });
      if (!audioRes.ok || !audioRes.body) {
        console.error(`[server.ts] /api/stream: Full GET to ${downloadUrl} failed with status ${audioRes.status}`);
        return res.status(502).json({ error: `Failed to fetch full audio from source. Status: ${audioRes.status}` });
      }

      const responseHeaders: Record<string, string> = {
        'Content-Type': audioRes.headers.get('content-type') || 'audio/mpeg',
      };
      if (audioRes.headers.get('content-length')) {
        responseHeaders['Content-Length'] = audioRes.headers.get('content-length')!;
      }
      res.setHeader('Accept-Ranges', 'bytes'); // Good to declare even for full responses
      
      // Send all headers at once
      Object.entries(responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      audioRes.body.pipe(res);
    }
  } catch (err) {
    console.error('[server.ts] Error in /api/stream:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});