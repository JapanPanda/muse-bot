import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient } from "../modules";

class AutoplayCommand extends BotCommand {
    public readonly description: string = "Automatically play a new song when the queue is empty";
    public readonly name: string = "autoplay";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const newValue = interaction.options.getBoolean("value");
        await MuseBotClient.mergeAndUpdateMuseSettingsForGuild(interaction.guildId, { autoplay: newValue });
        return interaction.reply({ embeds: [this.buildEmbed(newValue)] });
    }

    private buildEmbed(autoplay: boolean): EmbedBuilder {
        const valueString = autoplay ? "ON" : "OFF";
        return new EmbedBuilder().setColor(MUSE_COLORS.PURPLE).setTitle("Changed Autoplay").setDescription(`Autoplay is now: ${valueString}`);
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand.addBooleanOption(option =>
            option.setName("value").setDescription("Turn autoplay off or on").setRequired(true),
        );

        return command as SlashCommandBuilder;
    }
}

export default new AutoplayCommand();
