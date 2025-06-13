"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicService = void 0;
const axios_1 = __importDefault(require("axios"));
class MusicService {
    constructor() {
        this.baseUrl = 'https://sefon.pro/api/music'; // Example API endpoint
    }
    async fetchMusic(options) {
        try {
            const response = await axios_1.default.get(this.baseUrl, { params: options });
            return this.parseMusic(response.data);
        }
        catch (error) {
            console.error('Error fetching music data:', error);
            throw new Error('Failed to fetch music data');
        }
    }
    parseMusic(data) {
        return data.map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            year: item.year,
        }));
    }
}
exports.MusicService = MusicService;
//# sourceMappingURL=musicService.js.map