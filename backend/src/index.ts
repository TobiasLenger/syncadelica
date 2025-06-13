import { fetchSongs, fetchDownloadUrl } from './musicService';
import * as readline from 'readline';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter artist or song name to search: ', async (query) => {
    const songs = await fetchSongs(query);

    if (songs.length === 0) {
      console.log('No songs found.');
      rl.close();
      return;
    }

    songs.forEach((song, idx) => {
      console.log(`${idx + 1}. ${song.artist} - ${song.title}`);
    });

    rl.question('Enter the number of the song to get the download link: ', async (numStr) => {
      const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 1 || num > songs.length) {
        console.log('Invalid selection.');
        rl.close();
        return;
      }
      const selectedSong = songs[num - 1];
      console.log(`Fetching download link for: ${selectedSong.artist} - ${selectedSong.title}...`);
      const url = await fetchDownloadUrl(selectedSong.page);
      if (url) {
        console.log(`Download link: ${url}`);
      } else {
        console.log('Could not fetch download link.');
      }
      rl.close();
    });
  });
}

main();