import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient } from "../modules";

class VolumeCommand extends BotCommand {
    public readonly description: string = "Set the volume of the music player";
    public readonly name: string = "volume";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const newVolume = interaction.options.getInteger("amount") / 100;
        await MuseBotClient.mergeAndUpdateMuseSettingsForGuild(interaction.guildId, { volume: newVolume });
        return interaction.reply({ embeds: [this.buildEmbed(newVolume)] });
    }

    private buildEmbed(volume: number): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(MUSE_COLORS.PURPLE)
            .setTitle("Changed Volume")
            .setDescription(`The volume is now: ${volume * 100}%\n*It may take a couple of seconds to update.*`);
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand.addIntegerOption(option =>
            option.setName("amount").setDescription("A value from 0% - 500%").setMinValue(0).setMaxValue(500),
        );

        return command as SlashCommandBuilder;
    }
}

export default new VolumeCommand();
