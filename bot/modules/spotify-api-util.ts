import SpotifyWebApi from "spotify-web-api-node";
import { Config, Logger } from "../config";
import { Song, SongSource } from "../models";
import { Album, Artist, Playlist, Search, Track, parse } from "spotify-uri";

/// <reference types="spotify-api" />

class SpotifyApiUtil {
    private _clientId: string;
    private _clientSecret: string;
    private _client: SpotifyWebApi;

    constructor() {
        this._clientId = Config.spotifyClientId;
        this._clientSecret = Config.spotifyClientSecret;
        this._client = new SpotifyWebApi({
            clientId: this._clientId,
            clientSecret: this._clientSecret,
        });

        this.renewToken();
    }

    public async getSongsFromUrl(url: string): Promise<Song | Array<Song>> {
        // this._client.
        const spotifyObject = parse(url);

        if (Track.is(spotifyObject)) {
            return this.getTrack(spotifyObject.id);
        }

        if (Playlist.is(spotifyObject)) {
            return this.getPlaylist(spotifyObject.id);
        }

        if (Album.is(spotifyObject)) {
            // TODO support album objects
            return null;
        }

        if (Artist.is(spotifyObject)) {
            return null;
        }

        if (Search.is(spotifyObject)) {
            return null;
        }

        return null;
    }

    private async getTrack(id: string): Promise<Song> {
        try {
            const track = (await this._client.getTrack(id)).body;

            const primaryArtist = track.artists[0];
            const imageUrl = track.album.images[0].url;
            const artistImage = (await this._client.getArtist(primaryArtist.id)).body.images?.[0]?.url;
            const artistString = track.artists.map(artist => artist.name).join(", ");
            const artist = {
                artistName: artistString,
                // for sake of simplicity, the url will just be the first artist
                artistUrl: track.artists[0].href,
                iconUrl: artistImage ?? imageUrl,
            };
            return {
                artist: artist,
                duration: track.duration_ms / 1000,
                imageUrl: imageUrl,
                isrc: track.external_ids?.isrc,
                source: SongSource.SPOTIFY,
                title: track.name,
                url: track.external_urls?.spotify,
            };
        } catch (e) {
            Logger.warn("Encountered error when getting track: %O", e);
            return null;
        }
    }

    private async getPlaylist(id: string): Promise<Array<Song>> {
        try {
            let limit = 50;
            let offset = 0;
            let next;
            let allTracks: Array<SpotifyApi.PlaylistTrackObject> = [];
            do {
                const playlistTracksResponse = (await this._client.getPlaylistTracks(id, { limit, offset })).body;
                allTracks = allTracks.concat(playlistTracksResponse.items);
                next = playlistTracksResponse.next;
                offset += limit;
            } while (next);

            let seenArtists: Set<string> = new Set();
            allTracks.forEach(playlistTrack => {
                const primaryArtist = playlistTrack.track.artists[0];
                seenArtists.add(primaryArtist.id);
            });

            let artistIdToImageUrl: Record<string, string> = {};
            const artistsArray = Array.from(seenArtists);

            // spotify api limits to 50 per artists
            let currentIndex = 0;
            let pageSize = 50;
            while (currentIndex <= artistsArray.length) {
                const currentArtists = artistsArray.slice(currentIndex, currentIndex + pageSize);
                const artistsResponse = (await this._client.getArtists(currentArtists)).body;
                artistsResponse.artists.forEach(artist => {
                    artistIdToImageUrl[artist.id] = artist.images?.[0]?.url;
                });
                currentIndex += pageSize;
            }

            return allTracks.map(playlistTrack => {
                const track = playlistTrack.track;

                const imageUrl = track.album.images[0].url;
                const artistImage = artistIdToImageUrl[track.artists[0].id];

                const artistString = track.artists.map(artist => artist.name).join(", ");
                const artist = {
                    artistName: artistString,
                    // for sake of simplicity, the url will just be the first artist
                    artistUrl: track.artists[0].href,
                    iconUrl: artistImage ?? imageUrl,
                };

                return {
                    artist: artist,
                    duration: track.duration_ms / 1000,
                    imageUrl: imageUrl,
                    isrc: track.external_ids?.isrc,
                    source: SongSource.SPOTIFY,
                    title: track.name,
                    url: track.external_urls?.spotify,
                };
            });
        } catch (e) {
            Logger.warn("Encountered error when getting playlist: %O", e);
            return null;
        }
    }

    private renewToken(): void {
        Logger.info("Refreshing Spotify token");
        this._client.clientCredentialsGrant().then(data => {
            this._client.setAccessToken(data.body.access_token);
            Logger.info("Successfully refreshed Spotify token.");

            const expiresIn = data.body.expires_in;
            setTimeout(() => this.renewToken(), expiresIn * 1000);
        });
    }
}

export const SpotifyApi = new SpotifyApiUtil();
