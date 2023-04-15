import playdl from "@japanpanda/play-dl";
import { Logger } from "../config";
import { Artist, Song, SongSource } from "../models/music";
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
        const source = playdl.yt_validate(url);
        if (source === "playlist") {
            return fetchSongsFromYoutubePlaylistUrl(url);
        } else if (source === "video") {
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
    const playlist = await playdl.playlist_info(url, { incomplete: true });
    const playlistVideos = await playlist.all_videos();
    return playlistVideos?.map(item => {
        // we pop to get the largest resolution for our finest users' pleasure

        const artist: Artist = {
            artistName: item.channel.name,
            artistUrl: item.channel.url,
            iconUrl: undefined, // channel icon is not easily accessible in this flow, so we'll just leave it as null
        };

        const song: Song = {
            id: item.id,
            artist: artist,
            duration: item.durationInSec,
            imageUrl: item.thumbnails?.pop?.()?.url,
            source: SongSource.YOUTUBE,
            title: item.title,
            url: item.url,
        };
        return song;
    });
};

const fetchSongFromYoutubeVideoUrl = async (url: string): Promise<Song> => {
    const videoInfo = await playdl.video_basic_info(url);

    const artist: Artist = {
        artistName: videoInfo.video_details.channel.name,
        artistUrl: videoInfo.video_details.channel.url,
        iconUrl: videoInfo.video_details.channel.iconURL(),
    };

    const song: Song = {
        id: videoInfo.video_details.id,
        artist: artist,
        duration: videoInfo.video_details.durationInSec,
        imageUrl: videoInfo.video_details.thumbnails?.pop()?.url,
        source: SongSource.YOUTUBE,
        title: videoInfo.video_details.title,
        url: videoInfo.video_details.url,
    };
    return song;
};

const queryYoutubeForSearchTerm = async (queryString: string): Promise<Song> => {
    try {
        const result = await playdl.search(queryString, { limit: 1, unblurNSFWThumbnails: true });

        for (const item of result) {
            const artist: Artist = {
                artistName: item.channel.name,
                artistUrl: item.channel.url,
                iconUrl: item.channel.iconURL(),
            };

            return {
                artist,
                duration: item.durationInSec,
                id: item.id,
                imageUrl: item.thumbnails?.pop?.()?.url,
                source: SongSource.YOUTUBE,
                title: item.title,
                url: item.url,
            };
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

export const getSongRecommendations = async (song: Song): Promise<Array<Song>> => {
    if (song.source === SongSource.YOUTUBE) {
        return fetchAndConvertRelatedVideoToSongs(song.url);
    } else {
        const tracks = await SpotifyApi.getSongRecommendations(song);

        // TODO: maybe a spotify -> yt function would be nice here
        // fallback to youtube if spotify doesn't give any recommendations
        if (tracks.length === 0) {
            const searchQuery = song.isrc ?? `${song.artist} ${song.title}`;
            const results = await playdl.search(searchQuery, { limit: 1, unblurNSFWThumbnails: true });
            let video = results?.[0];

            // if we did an isrc search and got no videos, try searching by artist and title string
            if (song.isrc != null && video == null) {
                const results = await playdl.search(searchQuery, { limit: 1, unblurNSFWThumbnails: true });
                video = results?.[0];
            }

            if (video == null) {
                // we really can't find this song :|
                return null;
            }

            return fetchAndConvertRelatedVideoToSongs(video.url);
        }

        return tracks;
    }
};

const fetchAndConvertRelatedVideoToSongs = async (url: string): Promise<Array<Song>> => {
    const videoInfo = await playdl.video_basic_info(url);
    const relatedVideoUrls = videoInfo.related_videos.slice(0, 11);
    const relatedVideos = await Promise.all(relatedVideoUrls.map(relatedVideoUrl => playdl.video_basic_info(relatedVideoUrl)));

    return relatedVideos.map(relatedVideo => {
        const author = relatedVideo.video_details.channel;

        // we pop to get the largest resolution for our finest users' pleasure
        const artistThumbnail = author?.iconURL?.();
        const artist: Artist = {
            artistName: author.name,
            artistUrl: author.url,
            iconUrl: artistThumbnail,
        };

        const song: Song = {
            id: relatedVideo.video_details.id,
            artist: artist,
            duration: relatedVideo.video_details.durationInSec,
            imageUrl: relatedVideo.video_details.thumbnails.pop().url,
            source: SongSource.YOUTUBE,
            title: relatedVideo.video_details.title,
            url: relatedVideo.video_details.url,
        };
        return song;
    });
};
