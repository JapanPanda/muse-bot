import ytdl from "ytdl-core";
import { Logger } from "../config";
import { Artist, Song, SongSource } from "../models/music";
import ytsr from "ytsr";
import ytpl from "ytpl";
import { SpotifyApi } from "./spotify-api-util";

// TODO VINCENT: should probably make a custom error class
export const enum MUSIC_ERROR {
    UNSUPPORTED_URL_DOMAIN = "UNSUPPORTED_URL_DOMAIN",
    NO_RESULTS = "NO_RESULTS",
}

export const parseUrl = async (url: string): Promise<Song | Array<Song>> => {
    if (!isUrl(url)) {
        // not a url, we'll do a youtube search query for this
        return queryYoutubeForSearchTerm(url);
    }

    // currently supported: Youtube (that's it lol)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        if (ytpl.validateID(url)) {
            return fetchSongsFromYoutubePlaylistUrl(url);
        } else {
            return fetchSongFromYoutubeVideoUrl(url);
        }
    }

    if (url.includes("spotify")) {
        return SpotifyApi.getSongsFromUrl(url);
    }

    Logger.warn(`User passed in an unsupported url domain=${url}`);
    throw new Error(MUSIC_ERROR.UNSUPPORTED_URL_DOMAIN);
};

const isUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch (ignored) {
        return false;
    }
};

const fetchSongsFromYoutubePlaylistUrl = async (url: string): Promise<Array<Song>> => {
    const playlist = await ytpl(url, { limit: Infinity });
    return playlist.items?.map(item => {
        // we pop to get the largest resolution for our finest users' pleasure

        const artist: Artist = {
            artistName: item.author.name,
            artistUrl: item.author.url,
            iconUrl: item.bestThumbnail.url, // channel icon is not easily accessible in this flow, so we'll settle for song image
        };

        const song: Song = {
            artist: artist,
            duration: item.durationSec,
            imageUrl: item.bestThumbnail.url,
            source: SongSource.YOUTUBE,
            title: item.title,
            url: item.shortUrl,
        };
        return song;
    });
};

const fetchSongFromYoutubeVideoUrl = async (url: string): Promise<Song> => {
    const videoInfo = await ytdl.getBasicInfo(url);

    // we pop to get the largest resolution for our finest users' pleasure
    const artistThumbnail = videoInfo.videoDetails.author?.thumbnails?.pop()?.url;
    const artist: Artist = {
        artistName: videoInfo.videoDetails.author.name,
        artistUrl: videoInfo.videoDetails.author.channel_url,
        iconUrl: artistThumbnail,
    };

    const song: Song = {
        artist: artist,
        duration: parseInt(videoInfo.videoDetails.lengthSeconds),
        imageUrl: videoInfo.videoDetails.thumbnails.pop().url,
        source: SongSource.YOUTUBE,
        title: videoInfo.videoDetails.title,
        url: videoInfo.videoDetails.video_url,
    };
    return song;
};

const queryYoutubeForSearchTerm = async (queryString: string): Promise<Song> => {
    try {
        console.time("ytsr");
        const result = await ytsr(queryString, { limit: 10 });
        console.timeEnd("ytsr");

        for (const item of result.items) {
            if (item.type === "video") {
                const artist: Artist = {
                    artistName: item.author.name,
                    artistUrl: item.author.url,
                    iconUrl: item.author.bestAvatar.url,
                };

                const duration = durationToSeconds(item.duration);
                return {
                    artist,
                    duration,
                    imageUrl: item.bestThumbnail.url,
                    source: SongSource.YOUTUBE,
                    title: item.title,
                    url: item.url,
                };
            }
        }

        return null;
    } catch (e) {
        Logger.warn(`Failed to query youtube for queryString=${queryString} %O`, e);
        throw e;
    }
};

const durationToSeconds = (value: string): number => {
    let splitValues = value.split(":");
    let seconds = 0;
    let interval = 1;

    while (splitValues.length > 0) {
        seconds += interval * parseInt(splitValues.pop(), 10);
        interval *= 60;
    }

    return seconds;
};
