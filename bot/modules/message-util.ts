import { EmbedBuilder } from "discord.js";
import { QueuedSong, Song } from "../models/music";

export const enum MUSE_COLORS {
    BLUE = "#398fc4",
    PURPLE = "#5614db",
    RED = "#cf3c32",
    YELLOW = "#dede33",
}

export const buildSongEmbed = (song: QueuedSong): EmbedBuilder => {
    return new EmbedBuilder()
        .setAuthor({ name: song.artist.artistName, iconURL: song.artist.iconUrl, url: song.artist.artistUrl })
        .setImage(song.imageUrl)
        .addFields(
            { name: "Song Title", value: `[${song.title}](${song.url})` },
            { name: "Artist", value: `[${song.artist.artistName}](${song.artist.artistUrl})` },
            { name: "Duration", value: formatSecondsToDurationString(song.duration), inline: true },
            { name: "Requested By", value: song.requester, inline: true },
        );
};

export const formatSecondsToDurationString = (seconds: number): string => {
    // gets it to be HH:MM:SS
    let formattedString = new Date(seconds * 1000).toISOString().slice(11, 19);
    if (formattedString.startsWith("00:")) {
        // truncate unnecessary HH
        formattedString = formattedString.slice(3);
    }
    return formattedString;
};
