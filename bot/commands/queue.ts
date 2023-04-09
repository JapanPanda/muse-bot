import {
    APIEmbedField,
    ActionRowBuilder,
    BaseMessageOptions,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { QueuedSong } from "../models/music";
import { BotCommand, MuseBotClient } from "../modules";
import { MUSE_COLORS, buildSettingsFooter, formatSecondsToDurationString } from "../modules/message-util";
import { Logger } from "../config";

class QueueCommand extends BotCommand {
    private static readonly COLLECTOR_TIMEOUT = 30000;
    private static readonly PAGE_LIMIT = 5;

    public readonly description: string = "Show the current queue.";
    public readonly name: string = "queue";

    public async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any> {
        const guildId = interaction.guildId;
        const audioManager = MuseBotClient.getAudioManagerForGuild(guildId);
        // queue includes any currently playing songs
        const queue = audioManager?.queue;
        if (audioManager?.currentSong == null && !queue?.length) {
            return interaction.reply({ embeds: [this.getEmptyQueueEmbed()] });
        }

        // subtract 1 to make it zero indexed
        let currentPage = (interaction.options.getInteger("page") ?? 1) - 1;
        let maxPages = this.getMaxPages(queue.length);
        if (maxPages > 0 && (currentPage < 0 || currentPage >= maxPages)) {
            return interaction.reply(`The page parameter must be between 1 and ${maxPages}.`);
        }
        await interaction.reply(this.getQueueMessage(guildId, currentPage));

        const message = await interaction.fetchReply();

        if (message.components.length >= 1) {
            Logger.info(`Started collector for ${this.name} by ${interaction.user.tag}`);
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: QueueCommand.COLLECTOR_TIMEOUT });
            collector.on("collect", i => {
                try {
                    Logger.info(`Handling collection for with ${i.customId} by ${i.user.tag} ${this.name}`);
                    if (i.customId === "prev") {
                        currentPage--;
                    } else if (i.customId === "next") {
                        currentPage++;
                    }
                    i.update(this.getQueueMessage(guildId, currentPage));
                    collector.resetTimer();
                } catch (e) {
                    Logger.error(`Failed on collector ${interaction.commandName}`);
                    Logger.error("Error found: %O", e);
                }
            });

            collector.on("end", collected => {
                Logger.info(`Ended collector for ${this.name}`);
                message.edit({ components: [] });
            });
        }
    }

    private getEmptyQueueEmbed(): EmbedBuilder {
        return new EmbedBuilder().setTitle("Empty Queue").setDescription("There are currently no songs in the queue. Use /play to add some songs!");
    }

    private getQueueMessage(guildId: string, page: number): BaseMessageOptions {
        const audioManager = MuseBotClient.getAudioManagerForGuild(guildId);
        const embed = new EmbedBuilder().setColor(MUSE_COLORS.YELLOW).setTitle("Queue");
        const currentlyPlayingSong = audioManager.currentSong;
        const queuedSongs = audioManager.queue;

        // build the now playing field
        const currentSongTimeString = formatSecondsToDurationString(audioManager.currentSongTime);
        const currentSongDuration = formatSecondsToDurationString(currentlyPlayingSong.duration);

        const nowPlayingString = `[${currentlyPlayingSong.artist.artistName}](${currentlyPlayingSong.artist.artistUrl}) - [${currentlyPlayingSong.title}](${currentlyPlayingSong.url})
        Requested By: ${currentlyPlayingSong.requester}`;

        embed.addFields({ name: `Now Playing (${currentSongTimeString} / ${currentSongDuration})`, value: nowPlayingString });

        const queueSongField = this.getQueuedSongField(queuedSongs, page);
        embed.addFields(queueSongField);

        embed.setFooter({ text: buildSettingsFooter(guildId) });

        const message: BaseMessageOptions = { embeds: [embed] };

        let maxPages = this.getMaxPages(queuedSongs.length);
        if (maxPages > 1) {
            const pageField = this.getPageField(page, maxPages);
            embed.addFields(pageField);

            const prevButton = new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Primary);
            const nextButton = new ButtonBuilder().setCustomId("next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary);

            if (page === 0) {
                prevButton.setDisabled(true);
            } else if (page >= maxPages - 1) {
                nextButton.setDisabled(true);
            }
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton);
            message.components = [actionRow];
        }

        return message;
    }

    private getPaginatedQueue(queuedSongs: Array<QueuedSong>, currentPage: number) {
        const startIndex = currentPage * QueueCommand.PAGE_LIMIT;
        return queuedSongs.slice(startIndex, startIndex + QueueCommand.PAGE_LIMIT);
    }

    private getQueuedSongField(queuedSongs: Array<QueuedSong>, currentPage: number): APIEmbedField {
        if (queuedSongs.length === 0) {
            return { name: "Queued Songs", value: "There are currently no songs in the queue. Use /play to add some songs!" };
        }

        const paginatedSongs = this.getPaginatedQueue(queuedSongs, currentPage);
        const duration = queuedSongs.map(song => song.duration).reduce((prevValue, currValue) => prevValue + currValue, 0);
        const durationString = formatSecondsToDurationString(duration);
        const queuedSongFieldTitle = `Queued Songs (${queuedSongs.length} ${queuedSongs.length > 1 ? "songs" : "song"}) (${durationString})`;
        const queuedSongString = paginatedSongs
            .map((song, i) => {
                const songIndex = currentPage * QueueCommand.PAGE_LIMIT + i + 1;
                // a limit of 175 will help avoid the embed value character limit of 1024
                return `**${songIndex}.** ` + this.buildSongString(song, 175);
            })
            .join("\n");

        return { name: queuedSongFieldTitle, value: queuedSongString };
    }

    private buildSongString(song: QueuedSong, charLimit: number): string {
        const metadata = `(${formatSecondsToDurationString(song.duration)}) ${song.requester}`;
        charLimit -= metadata.length;
        charLimit -= song.url.length;
        // subtract to account for the link markdown [xxx](url)
        charLimit -= 4;

        // escapeMarkdown

        let truncatedSongTitle = song.title;
        if (song.title.length > charLimit) {
            // subtract 3 for ellipses
            charLimit -= 3;
            truncatedSongTitle = truncatedSongTitle.slice(0, charLimit) + "...";
        }
        const songString = `[${truncatedSongTitle}](${song.url})`;
        return `${songString} ${metadata}`;
    }

    private getPageField(currentPage: number, maxPages: number): APIEmbedField {
        return { name: "Page", value: `${currentPage + 1}/${maxPages}` };
    }

    private getMaxPages(queueLength: number): number {
        return Math.ceil(queueLength / QueueCommand.PAGE_LIMIT);
    }

    get slashCommand(): SlashCommandBuilder {
        const command = super.slashCommand.addIntegerOption(option =>
            option.setName("page").setDescription("Page of the queue to show").setMinValue(1),
        );
        return command as SlashCommandBuilder;
    }
}

export default new QueueCommand();
