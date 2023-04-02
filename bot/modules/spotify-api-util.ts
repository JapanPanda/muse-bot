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
            // TODO support artist objects
            return null;
        }

        if (Search.is(spotifyObject)) {
            // TODO support Search objects
            return null;
        }

        return null;
    }

    private async getTrack(id: string): Promise<Song> {
        try {
            const track = (await this._client.getTrack(id)).body;
            const imageUrl = track.album.images[0].url;
            const artistString = track.artists.map(artist => artist.name).join(", ");
            const artist = {
                artistName: artistString,
                // for sake of simplicity, the url will just be the first artist
                artistUrl: track.artists[0].href,
                // TODO figure out if there's a way to get artist image
                iconUrl: imageUrl,
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
            // TODO figure out this stupid typescript thing
            let next;
            let allTracks: Array<any> = [];
            do {
                const playlistTracksResponse = (await this._client.getPlaylistTracks(id, { limit, offset })).body;
                allTracks = allTracks.concat(playlistTracksResponse.items);
                next = playlistTracksResponse.next;
                offset += limit;
            } while (next);

            console.log(allTracks.length);
            return allTracks.map(playlistTrack => {
                const track = playlistTrack.track;

                const imageUrl = track.album.images[0].url;
                //@ts-ignore
                const artistString = track.artists.map(artist => artist.name).join(", ");
                const artist = {
                    artistName: artistString,
                    // for sake of simplicity, the url will just be the first artist
                    artistUrl: track.artists[0].href,
                    // TODO figure out if there's a way to get artist image
                    iconUrl: imageUrl,
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
