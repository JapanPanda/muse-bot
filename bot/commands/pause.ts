import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient, buildSongEmbed } from "../modules";
import { formatSecondsToDurationString } from "../modules/message-util";

class PauseCommand extends BotCommand {
    public readonly description: string = "Pause the current song";
    public readonly name: string = "pause";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const query = interaction.options.getString("query");
        const position = interaction.options.getInteger("position");

        let member = await interaction.guild.members.fetch(interaction.member.user.id);
        let voiceChannelId = member.voice?.channelId;

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first! (If you are in a voice channel, please try rejoining the voice channel)");
        }

        const audioManager = MuseBotClient.getAudioManagerForGuild(interaction.guildId);
        if (audioManager?.currentSong == null) {
            return interaction.reply("Unable to pause because nothing's playing right now.");
        }

        if (!audioManager.pause()) {
            return interaction.reply("Unable to pause due to an error.");
        }

        const currentSong = audioManager.currentSong;
        const durationString = formatSecondsToDurationString(currentSong.duration);
        const embed = new EmbedBuilder()
            .setColor(MUSE_COLORS.PURPLE)
            .setTitle("Successfully Paused")
            .setDescription(
                `[${currentSong.title}](${currentSong.url}) (${durationString}) ${currentSong.requester} - Paused at ${formatSecondsToDurationString(
                    audioManager.currentSongTime,
                )}`,
            );
        return interaction.reply({ embeds: [embed] });
    }

    get slashCommand(): SlashCommandBuilder {
        return super.slashCommand;
    }
}

export default new PauseCommand();
