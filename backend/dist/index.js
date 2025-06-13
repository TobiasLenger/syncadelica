"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const musicService_1 = require("./musicService");
const readline = __importStar(require("readline"));
async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter artist or song name to search: ', async (query) => {
        const songs = await (0, musicService_1.fetchSongs)(query);
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
            const url = await (0, musicService_1.fetchDownloadUrl)(selectedSong.page);
            if (url) {
                console.log(`Download link: ${url}`);
            }
            else {
                console.log('Could not fetch download link.');
            }
            rl.close();
        });
    });
}
main();
//# sourceMappingURL=index.js.map