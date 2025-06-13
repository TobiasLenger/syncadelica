"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSongDetails = exports.fetchDownloadUrl = exports.fetchSongs = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const node_fetch_1 = __importDefault(require("node-fetch")); // Ensure node-fetch is imported
async function fetchSongs(query) {
    console.log(`[musicService] fetchSongs called with query: "${query}"`);
    const searchUrl = `https://sefon.pro/search/?q=${encodeURIComponent(query)}`;
    console.log(`[musicService] Constructed search URL: ${searchUrl}`);
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(searchUrl, { waitUntil: 'networkidle2' }).catch(err => console.error(`[musicService] Error navigating to ${searchUrl}:`, err));
    let songsData = await page.evaluate(() => {
        const songElements = Array.from(document.querySelectorAll('.mp3'));
        return songElements.map(el => {
            const artist = el.querySelector('.artist_name')?.textContent?.trim() || '';
            const title = el.querySelector('.song_name')?.textContent?.trim() || '';
            const pagePath = el.querySelector('.download a')?.getAttribute('href') || '';
            const albumArtImg = el.querySelector('.playlist_item_img_in img');
            let albumArtUrl = albumArtImg ? albumArtImg.getAttribute('src') : null;
            if (albumArtUrl && !albumArtUrl.startsWith('http')) {
                albumArtUrl = `https://sefon.pro${albumArtUrl}`;
            }
            return artist && title && pagePath // Ensure essential fields are present
                ? {
                    artist,
                    title,
                    page: `https://sefon.pro${pagePath}`,
                    albumArtUrl: albumArtUrl || undefined // Assign if found, else undefined
                }
                : null; // Explicitly return null if essential fields are missing
        }).filter(Boolean);
    });
    console.log(`[musicService] Found ${songsData.length} song entries (title, artist, page).`);
    await browser.close();
    console.log(`[musicService] Browser closed. Returning song list.`);
    return songsData; // Return songs without pre-fetching download URLs
}
exports.fetchSongs = fetchSongs;
// Keep this for the CLI tool (index.ts) or other direct uses
async function fetchDownloadUrl(songPageUrl) {
    const details = await fetchSongDetails(songPageUrl);
    return details ? details.downloadUrl : null;
}
exports.fetchDownloadUrl = fetchDownloadUrl;
async function fetchAlbumArtFromMusicBrainz(artist, title) {
    const appName = "YetAnotherVisualizer";
    const appVersion = "0.1.0";
    const contactEmail = "sarvarzied2005@gmail.com"; // Replace with your actual contact info
    const userAgent = `${appName}/${appVersion} ( ${contactEmail} )`;
    // 1. Search for the recording on MusicBrainz
    const searchUrl = `https://musicbrainz.org/ws/2/recording/?query=artist:"${encodeURIComponent(artist)}" AND recording:"${encodeURIComponent(title)}"&fmt=json`;
    console.log(`[musicService] Fetching from MusicBrainz (search): ${searchUrl}`);
    try {
        const mbResponse = await (0, node_fetch_1.default)(searchUrl, { headers: { 'User-Agent': userAgent } });
        if (!mbResponse.ok) {
            console.error(`[musicService] MusicBrainz search request failed: ${mbResponse.status}`);
            return null;
        }
        const mbData = await mbResponse.json();
        if (mbData.recordings && mbData.recordings.length > 0) {
            const recording = mbData.recordings[0]; // Take the first recording match
            if (recording.releases && recording.releases.length > 0) {
                const release = recording.releases[0]; // Take the first release of that recording
                const releaseMbid = release.id;
                // 2. Fetch cover art from Cover Art Archive
                const coverArtUrl = `https://coverartarchive.org/release/${releaseMbid}`;
                console.log(`[musicService] Fetching from Cover Art Archive: ${coverArtUrl}`);
                const caaResponse = await (0, node_fetch_1.default)(coverArtUrl, { headers: { 'User-Agent': userAgent } });
                if (caaResponse.ok) {
                    const caaData = await caaResponse.json();
                    const frontImage = caaData.images.find(img => img.front);
                    if (frontImage) {
                        console.log(`[musicService] MusicBrainz/CAA found front image: ${frontImage.image}`);
                        return frontImage.image;
                    }
                    else if (caaData.images.length > 0) {
                        // Fallback to the first image if no 'front' is explicitly marked
                        console.log(`[musicService] MusicBrainz/CAA found image (first available): ${caaData.images[0].image}`);
                        return caaData.images[0].image;
                    }
                }
                else if (caaResponse.status === 404) {
                    console.log(`[musicService] No cover art found on Cover Art Archive for release MBID: ${releaseMbid}`);
                }
                else {
                    console.error(`[musicService] Cover Art Archive request failed: ${caaResponse.status}`);
                }
            }
            else {
                console.log(`[musicService] MusicBrainz recording found, but no releases listed for MBID: ${recording.id}`);
            }
        }
    }
    catch (error) {
        console.error('[musicService] Error fetching or parsing from MusicBrainz/CAA:', error);
    }
    return null;
}
async function fetchSongDetails(songPageUrl, browserInstance, providedArtist, // New parameter
providedTitle // New parameter
) {
    let browser = browserInstance;
    let newBrowserInstanceCreated = false;
    let scrapedDetails = null;
    let finalDownloadUrl = null;
    let finalAlbumArtUrl = null;
    try {
        if (!browser) {
            console.log("[musicService] No browser instance provided, launching new one for fetchSongDetails.");
            browser = await puppeteer_1.default.launch({ headless: true });
            newBrowserInstanceCreated = true;
        }
        const page = await browser.newPage();
        console.log(`[musicService] fetchSongDetails: Navigating to ${songPageUrl}`);
        await page.goto(songPageUrl, { waitUntil: 'networkidle2' });
        scrapedDetails = await page.evaluate(() => {
            const downloadLink = document.querySelector('a.b_btn.download.no-ajix');
            const dlUrl = downloadLink ? downloadLink.getAttribute('href') : null;
            // Note: Sefon.pro individual song pages often use a placeholder for album art.
            // We are not relying on this for the final album art.
            // const albumArtImg = document.querySelector('div.image_cont img');
            // let artUrl = albumArtImg ? albumArtImg.getAttribute('src') : null;
            const pArtist = document.querySelector('.title_artist_name')?.textContent?.trim() || '';
            const pTitle = document.querySelector('.title_track_name')?.textContent?.trim() || '';
            return { downloadUrl: dlUrl, albumArtUrl: null, artist: pArtist, title: pTitle }; // albumArtUrl from page is ignored
        });
        await page.close();
        if (scrapedDetails && scrapedDetails.downloadUrl) {
            finalDownloadUrl = scrapedDetails.downloadUrl.startsWith('http') ? scrapedDetails.downloadUrl : `https://sefon.pro${scrapedDetails.downloadUrl}`;
        }
        // Use provided artist/title if available for MusicBrainz query, otherwise fallback to scraped ones from the page
        const artistForMB = providedArtist || (scrapedDetails ? scrapedDetails.artist : '');
        const titleForMB = providedTitle || (scrapedDetails ? scrapedDetails.title : '');
        if (artistForMB && titleForMB) {
            console.log(`[musicService] Querying MusicBrainz with Artist: "${artistForMB}", Title: "${titleForMB}"`);
            finalAlbumArtUrl = await fetchAlbumArtFromMusicBrainz(artistForMB, titleForMB);
        }
    }
    catch (error) {
        console.error("[musicService] Error during fetchSongDetails (Puppeteer/scraping part):", error);
    }
    finally {
        if (newBrowserInstanceCreated && browser) {
            console.log("[musicService] Closing browser instance created by fetchSongDetails.");
            await browser.close();
        }
    }
    // Updated logging to clarify the source if art is found
    const artistForMB = providedArtist || (scrapedDetails ? scrapedDetails.artist : ''); // Re-declare for scope if needed, or ensure it's available
    const titleForMB = providedTitle || (scrapedDetails ? scrapedDetails.title : ''); // Re-declare for scope if needed, or ensure it's available
    const artSourceMessage = finalAlbumArtUrl ? "MusicBrainz/CoverArtArchive" : "None (MusicBrainz/CAA did not return art)";
    console.log(`[musicService] fetchSongDetails: Download: ${finalDownloadUrl}, Art: ${finalAlbumArtUrl} (Source: ${artSourceMessage}), Artist (used for DB): ${artistForMB}, Title (used for DB): ${titleForMB}`);
    return { downloadUrl: finalDownloadUrl, albumArtUrl: finalAlbumArtUrl, artist: artistForMB, title: titleForMB }; // Return the artist/title used for DB
}
exports.fetchSongDetails = fetchSongDetails;
//# sourceMappingURL=musicService.js.map