export interface Music {
    title: string;
    artist: string;
    album: string;
    year: number;
    genre: string;
    duration: number; // duration in seconds
}

export interface FetchOptions {
    limit?: number;
    offset?: number;
    genre?: string;
    year?: number;
}