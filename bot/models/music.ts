export interface Artist {
    iconUrl: string;
    artistUrl: string;
    artistName: string;
}

export interface Song {
    artist: Artist;
    duration: number;
    imageUrl: string;
    isrc?: string;
    source: SongSource;
    title: string;
    url: string;
}

export enum SongSource {
    "SPOTIFY",
    "YOUTUBE",
}

export interface QueuedSong extends Song {
    guildId: string;
    requester: string;
}
