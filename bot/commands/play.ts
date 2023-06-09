import { BaseMessageOptions, CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient, buildSongEmbed } from "../modules";
import { formatSecondsToDurationString } from "../modules/message-util";
import { QueuedSong } from "../models/music";
import { MUSIC_ERROR } from "../modules/music-util";

class PlayCommand extends BotCommand {
    public readonly description: string = "Play a song!";
    public readonly name: string = "play";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        console.time("play" + interaction.id);
        const query = interaction.options.getString("query");
        const position = interaction.options.getInteger("position");

        let member = await interaction.guild.members.fetch(interaction.member.user.id);
        let voiceChannelId = member.voice?.channelId;

        Logger.info(`Play command queued for ${member.user.username}#${member.user.discriminator} with query=${query}`);

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first! (If you are in a voice channel, please try rejoining the voice channel)");
        }

        await interaction.deferReply();

        const audioManager = await MuseBotClient.getOrCreateAudioManagerForGuild(interaction.guildId);
        audioManager.messageChannelId = interaction.channelId;

        const index = position ?? audioManager.queue.length;
        const wasQueueEmpty = audioManager.queue.length === 0;
        try {
            await audioManager.joinVoiceChannel(voiceChannelId);
            const queuedSongs = await audioManager.fetchAndQueueSongs(query, interaction.member.user.toString(), index);
            console.timeEnd("play" + interaction.id);

            if (queuedSongs.length > 1) {
                // user queued a playlist
                return interaction.editReply(this.buildPlaylistMessage(queuedSongs));
            }

            // TODO: proper duration for livestreams

            // user queued a single video (or a playlist with a single song perhaps)
            const embedTitle = wasQueueEmpty ? "Now Playing" : "Queued Song";
            const embedColor = wasQueueEmpty ? MUSE_COLORS.YELLOW : MUSE_COLORS.BLUE;
            const queuedSongEmbed = buildSongEmbed(queuedSongs[0], interaction.guildId).setColor(embedColor).setTitle(embedTitle);
            return interaction.editReply({ embeds: [queuedSongEmbed] });
        } catch (e: any) {
            if (e?.message === MUSIC_ERROR.NO_RESULTS) {
                return interaction.editReply("Our ninjas couldn't find any songs for this query, our humblest apologies.");
            } else if (e?.message === MUSIC_ERROR.UNSUPPORTED_URL_DOMAIN) {
                return interaction.editReply(
                    "This link isn't currently supported. We only support Youtube playlist/video links, or Spotify track/playlist/album links.",
                );
            }
            throw e;
        }
    }

    private buildPlaylistMessage(queuedSongs: Array<QueuedSong>): BaseMessageOptions {
        // TODO pagination...
        // TODO fix wrong duration string lol
        const duration = queuedSongs.map(song => song.duration).reduce((prevValue, currValue) => prevValue + currValue, 0);
        const durationString = formatSecondsToDurationString(duration);
        const queuedSongFieldTitle = `Queued Songs (${queuedSongs.length} ${queuedSongs.length > 1 ? "songs" : "song"}) (${durationString})`;
        let queuedSongString = queuedSongs
            .slice(0, 5)
            .map((song, i) => {
                const durationString = formatSecondsToDurationString(song.duration);
                // a limit of 175 will help avoid the embed value character limit of 1024
                return `**${i + 1}.** [${song.title}](${song.url}) (${durationString}) ${song.requester}`;
            })
            .join("\n");

        queuedSongString += "\n...";

        const embed = new EmbedBuilder().setTitle("Queued Playlist").setFields({ name: queuedSongFieldTitle, value: queuedSongString });
        return { embeds: [embed] };
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand
            .addStringOption(option =>
                option.setName("query").setDescription("Enter a search query or url. Supported links: Youtube, Spotify").setRequired(true),
            )
            .addIntegerOption(option =>
                option.setName("position").setDescription("Which position you want to insert the song. 1 is the front of the queue").setMinValue(1),
            );

        return command as SlashCommandBuilder;
    }
}

export default new PlayCommand();
