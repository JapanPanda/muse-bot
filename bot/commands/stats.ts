import { CacheType, ChatInputCommandInteraction, InteractionResponse } from "discord.js";
import { BotCommand } from "../modules";

class StatsCommand extends BotCommand {
    public readonly description: string = "Some random bot stats!";
    public readonly name: string = "stats";

    public execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<InteractionResponse> {
        const numGuilds = interaction.client.guilds.cache.size;
        const daysAlive = this.getTimeAlive(interaction.client.readyTimestamp);
        const message = `_Ni-haowdy._ I've been alive for ${daysAlive} days serving ${numGuilds} servers!`;
        return interaction.reply(message);
    }

    private getTimeAlive(readyTimestamp: number): number {
        const currentTimestamp = Date.now();
        const msPerDay = 1000 * 60 * 60 * 24;
        const diff = Math.floor((currentTimestamp - readyTimestamp) / msPerDay);
        return diff;
    }
}

export default new StatsCommand();
