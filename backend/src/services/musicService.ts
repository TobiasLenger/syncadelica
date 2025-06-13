import axios from 'axios';
import { Music, FetchOptions } from '../types';

export class MusicService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = 'https://sefon.pro/api/music'; // Example API endpoint
    }

    public async fetchMusic(options: FetchOptions): Promise<Music[]> {
        try {
            const response = await axios.get(this.baseUrl, { params: options });
            return this.parseMusic(response.data);
        } catch (error) {
            console.error('Error fetching music data:', error);
            throw new Error('Failed to fetch music data');
        }
    }

    private parseMusic(data: any): Music[] {
        return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            year: item.year,
        }));
    }
}