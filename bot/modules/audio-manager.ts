import { EmbedBuilder } from "discord.js";
import { Player } from "shoukaku";
import { Logger } from "../config";
import { QueuedSong, SongSource } from "../models/music";
import { MUSE_COLORS, buildSongEmbed } from "./message-util";
import { MuseBotClient } from "./muse-bot";
import { MUSIC_ERROR, parseUrl } from "./music-util";

export class AudioManager {
    private _currentSong: QueuedSong;
    private _guildId: string;
    // TODO propagate this to other commands
    private _messageChannelId: string;
    private _player: Player;
    private _queue: Array<QueuedSong> = [];

    constructor(guildId: string) {
        this._guildId = guildId;
    }

    public async joinVoiceChannel(voiceChannelId: string): Promise<void> {
        if (this._player?.connection?.channelId === voiceChannelId) {
            return;
        }

        const node = MuseBotClient.shoukaku.getNode();
        this._player = await node.joinChannel({ channelId: voiceChannelId, guildId: this._guildId, deaf: true, shardId: 0 });

        this._player.on("start", () => {
            // announce that we're now playing a new song
            const songEmbed = buildSongEmbed(this._currentSong).setColor(MUSE_COLORS.YELLOW).setTitle("Now Playing");
            const message = { embeds: [songEmbed] };
            MuseBotClient.sendMessageToChannelId(message, this._messageChannelId);
        });

        this._player.on("end", () => {
            if (this._queue.length === 0) {
                // there are no songs, so disconnect after 10 seconds if there are no more queued songs
                setTimeout(() => {
                    // if there's no song playing still, then disconnect
                    if (this._currentSong == null) {
                        Logger.info(`No more songs in queue for guildId=${this._guildId}, cleaning up.`);
                        MuseBotClient.cleanupAudioManagerForGuild(this._guildId);
                    }
                }, 10000);
            }

            // there are songs, so just play the next one
            this.playNextSong();
        });
    }

    public async fetchAndQueueSongs(url: string, requester: string, index?: number): Promise<Array<QueuedSong>> {
        const songOrSongs = await parseUrl(url);
        let songs = [].concat(songOrSongs);
        if (songOrSongs == null || songs.length === 0) {
            throw new Error(MUSIC_ERROR.NO_RESULTS);
        }
        return this.queueSongs(songs, requester, index);
    }

    public queueSongs(songs: Array<QueuedSong>, requester: string, index?: number): Array<QueuedSong> {
        const queuedSongs = songs.map(song => ({
            guildId: this._guildId,
            requester: requester,
            ...song,
        }));

        if (index == null) {
            index = this._queue.length;
        }

        this._queue.splice(index, 0, ...queuedSongs);

        if (this._currentSong == null) {
            this.playNextSong();
        }

        return queuedSongs;
    }

    private async playNextSong(): Promise<void> {
        const nextSong = this._queue.shift();
        this._currentSong = nextSong;
        if (nextSong == null) {
            // clean up no songs left
            return;
        }

        console.log(this.currentSong);

        const node = MuseBotClient.shoukaku.getNode();

        let query;
        let isIsrcSearch = false;
        if (nextSong.source === SongSource.YOUTUBE) {
            query = nextSong.url;
        } else if (nextSong.source === SongSource.SPOTIFY) {
            if (nextSong.isrc) {
                query = `ytsearch:"${nextSong.isrc}"`;
                isIsrcSearch = true;
            } else {
                query = `ytsearch:${nextSong.artist.artistName} ${nextSong.title}`;
            }
        }

        const results = await node.rest.resolve(query);
        let trackMetadata = results.tracks.shift();

        if (trackMetadata == null) {
            if (isIsrcSearch) {
                // maybe the isrc was incorrect, so try again with with generic yt search
                query = `ytsearch:${nextSong.artist.artistName} ${nextSong.title}`;
                const results = await node.rest.resolve(query);
                trackMetadata = results.tracks.shift();
            }

            if (trackMetadata == null) {
                // if it's still null, then just skip and complain that we're skipping since we can't find it on youtube
                const noSongFoundEmbed = new EmbedBuilder()
                    .setColor(MUSE_COLORS.RED)
                    .setTitle("Error")
                    .setDescription(
                        `We could not find the song [${nextSong.artist.artistName} - ${nextSong.title}](${nextSong.url}).\nSkipping to next song...`,
                    );
                MuseBotClient.sendMessageToChannelId({ embeds: [noSongFoundEmbed] }, this._messageChannelId);
                this.playNextSong();
                return;
            }
        }

        await this._player.playTrack({ track: trackMetadata.track });
        // TODO make this a guild
        await this._player.setVolume(0.5);
    }

    public skipSongs(numSkip: number): Array<QueuedSong> {
        const skippedSongs = [this.currentSong];
        // numSkip - 1 because we technically skipped the current song
        skippedSongs.push(...this._queue.splice(0, numSkip - 1));
        this.stopCurrentSong();
        return skippedSongs;
    }

    public removeSongsAtIndex(idx: number, numRemove: number): Array<QueuedSong> {
        const skippedSongs = this._queue.splice(idx, idx + numRemove);
        return skippedSongs;
    }

    public stopCurrentSong(): void {
        this._player.stopTrack();
        this._currentSong = null;
    }

    public pause(): boolean {
        if (this._player?.paused) {
            return false;
        }

        this._player?.setPaused(true);
        return true;
    }

    public resume(): boolean {
        if (!this._player?.paused) {
            return false;
        }

        this._player?.setPaused(false);
        return true;
    }

    public cleanUp(): void {
        this._player?.connection?.disconnect?.();
    }

    get currentSong(): QueuedSong {
        return this._currentSong;
    }

    get currentSongTime(): number {
        return (this._player?.position ?? 0) / 1000;
    }

    get queue(): Array<QueuedSong> {
        return this._queue;
    }

    set messageChannelId(messageChannelId: string) {
        this._messageChannelId = messageChannelId;
    }
}
