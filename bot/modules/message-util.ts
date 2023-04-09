import { EmbedBuilder } from "discord.js";
import { QueuedSong, Song } from "../models/music";
import { MuseBotClient } from "./muse-bot";

export const enum MUSE_COLORS {
    BLUE = "#398fc4",
    PURPLE = "#5614db",
    RED = "#cf3c32",
    YELLOW = "#dede33",
}

export const buildSongEmbed = (song: QueuedSong, guildId: string): EmbedBuilder => {
    return new EmbedBuilder()
        .setAuthor({ name: song.artist.artistName, url: song.artist.artistUrl })
        .setThumbnail(song.artist.iconUrl)
        .setImage(song.imageUrl)
        .addFields(
            { name: "Song Title", value: `[${song.title}](${song.url})` },
            { name: "Duration", value: formatSecondsToDurationString(song.duration), inline: true },
            { name: "Requested By", value: song.requester, inline: true },
        )
        .setFooter({
            text: buildSettingsFooter(guildId),
        });
};

export const buildSettingsFooter = (guildId: string): string => {
    const settings = MuseBotClient.getAudioManagerForGuild(guildId).settings;
    let settingsString = [];
    // TODO, probably a better way of doing this is to have a settings class that's built from the settings object
    if (settings.autoplay) {
        settingsString.push("Autoplay");
    }
    if (settings.nightcore) {
        settingsString.push("Nightcore");
    }
    if (settings.rotate) {
        settingsString.push(`Rotate ${settings.rotate}s`);
    }
    if (settings.shuffle) {
        settingsString.push("Shuffle");
    }
    if (settings.vaporwave) {
        settingsString.push("Vaporwave");
    }
    if (settings.volume != null && settings.volume !== 1) {
        settingsString.push(`Volume ${settings.volume * 100}%`);
    }
    return settingsString.join(", ");
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
