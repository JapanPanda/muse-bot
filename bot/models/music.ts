export interface Artist {
    iconUrl: string;
    artistUrl: string;
    artistName: string;
}

// TODO multiple artists?
// TODO source data?
export interface Song {
    id: string;
    artist: Artist;
    duration: number;
    imageUrl: string;
    // isLive: boolean;
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
