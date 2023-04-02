import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient } from "../modules";

class StopCommand extends BotCommand {
    public readonly description: string = "Stop and clear the queue";
    public readonly name: string = "stop";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const member = await interaction.guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first!");
        }

        MuseBotClient.cleanupAudioManagerForGuild(interaction.guildId);

        return interaction.reply({ embeds: [this.buildEmbed()] });
    }

    private buildEmbed(): EmbedBuilder {
        return new EmbedBuilder().setColor(MUSE_COLORS.RED).setTitle("Successfully Stopped").setDescription("Thank you for listening!");
    }

    get slashCommand(): SlashCommandBuilder {
        return super.slashCommand;
    }
}

export default new StopCommand();
