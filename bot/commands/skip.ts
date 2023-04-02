import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient, buildSongEmbed } from "../modules";
import { formatSecondsToDurationString } from "../modules/message-util";

class SkipCommand extends BotCommand {
    public readonly description: string = "Skip the current song or multiple songs in the queue";
    public readonly name: string = "skip";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const amount = interaction.options.getInteger("amount") ?? 1;

        let member = await interaction.guild.members.fetch(interaction.member.user.id);
        let voiceChannelId = member.voice?.channelId;

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first! (If you are in a voice channel, please try rejoining the voice channel)");
        }

        const audioManager = MuseBotClient.getAudioManagerForGuild(interaction.guildId);
        if (!audioManager?.queue?.length && audioManager?.currentSong == null) {
            return interaction.reply("Unable to skip because there are no currently playing songs and the queue is empty.");
        }

        const skippedSongs = audioManager.skipSongs(amount);
        const totalSkippedTime = skippedSongs.map(song => song.duration).reduce((prevValue, currValue) => prevValue + currValue, 0);
        const skippedSongsString = skippedSongs
            .map((song, i) => {
                const durationString = formatSecondsToDurationString(song.duration);
                return `**${i + 1}.** [${song.title}](${song.url}) ${song.requester}`;
            })
            .join("\n");

        // TODO: sometime handle pagination and overflow correctly
        const embed = new EmbedBuilder()
            .setColor(MUSE_COLORS.YELLOW)
            .setTitle("Successfully Skipped")
            .setDescription(`Skipped the following songs (${formatSecondsToDurationString(totalSkippedTime)}):\n${skippedSongsString}`);
        return interaction.reply({ embeds: [embed] });
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand.addIntegerOption(option =>
            option.setName("amount").setDescription("How many songs you want to skip").setMinValue(1),
        );

        return command as SlashCommandBuilder;
    }
}

export default new SkipCommand();
