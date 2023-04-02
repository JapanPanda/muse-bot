import { BaseMessageOptions, CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient, buildSongEmbed } from "../modules";
import { formatSecondsToDurationString } from "../modules/message-util";
import { QueuedSong } from "../models/music";

class TestCommand extends BotCommand {
    public readonly description: string = "Play a song!";
    public readonly name: string = "test";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        console.time("play");
        const query = interaction.options.getString("query");
        const position = interaction.options.getInteger("position");

        let member = await interaction.guild.members.fetch(interaction.member.user.id);
        let voiceChannelId = member.voice?.channelId;

        Logger.info(`Play command queued for ${member.user.username}#${member.user.discriminator} with query=${query}`);

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first! (If you are in a voice channel, please try rejoining the voice channel)");
        }

        await interaction.deferReply();

        const node = MuseBotClient.shoukaku.getNode();
        const results = await node.rest.resolve(`${query}`);
        console.log(JSON.stringify(results, null, 2));
        const player = await node.joinChannel({
            guildId: interaction.guildId,
            channelId: voiceChannelId,
            shardId: 0,
        });
        player.playTrack({ track: results.tracks[0].track });
        player.on("end", reason => {
            console.log(reason);
        });

        return interaction.editReply("wtf");
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
                const durationString = formatSecondsToDurationString(duration);
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
                option.setName("query").setDescription("Enter a search query or url. Supported links: youtube").setRequired(true),
            )
            .addIntegerOption(option =>
                option.setName("position").setDescription("Which position you want to insert the song. 1 is the front of the queue").setMinValue(1),
            );

        return command as SlashCommandBuilder;
    }
}

export default new TestCommand();
