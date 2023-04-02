import { CacheType, ChatInputCommandInteraction, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Logger } from "../config";
import { BotCommand, MUSE_COLORS, MuseBotClient, buildSongEmbed } from "../modules";
import { formatSecondsToDurationString } from "../modules/message-util";

class RemoveCommand extends BotCommand {
    public readonly description: string = "Remove one or multiple songs from the queue";
    public readonly name: string = "remove";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const remove = interaction.options.getInteger("remove");
        const amount = interaction.options.getInteger("amount") ?? 1;

        let member = await interaction.guild.members.fetch(interaction.member.user.id);
        let voiceChannelId = member.voice?.channelId;

        if (voiceChannelId == null) {
            return interaction.reply("Please join a voice channel first! (If you are in a voice channel, please try rejoining the voice channel)");
        }

        const audioManager = MuseBotClient.getAudioManagerForGuild(interaction.guildId);
        if (!audioManager?.queue?.length) {
            return interaction.reply("Unable to skip because the queue is empty.");
        }

        const skippedSongs = audioManager.removeSongsAtIndex(remove, amount);
        const skippedSongsString = skippedSongs
            .map((song, i) => {
                const durationString = formatSecondsToDurationString(song.duration);
                return `**${i + 1}.** [${song.title}](${song.url}) (${durationString}) ${song.requester}`;
            })
            .join("\n");

        // TODO: sometime handle pagination and overflow correctly
        const embed = new EmbedBuilder()
            .setColor(MUSE_COLORS.YELLOW)
            .setTitle("Successfully Removed")
            .setDescription(`Removed the following songs:\n${skippedSongsString}`);
        return interaction.reply({ embeds: [embed] });
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand
            .addIntegerOption(option =>
                option.setName("position").setDescription("From which position do you want to remove songs from").setRequired(true).setMinValue(1),
            )
            .addIntegerOption(option => option.setName("amount").setDescription("How many songs you want to remove").setMinValue(1));

        return command as SlashCommandBuilder;
    }
}

export default new RemoveCommand();
