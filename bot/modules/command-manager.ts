import { Config, Logger } from "../config";
import { CacheType, ChatInputCommandInteraction, Collection, REST, Routes, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";

export abstract class BotCommand {
    public readonly description: string;
    public readonly name: string;
    public readonly whitelisted?: boolean;

    public abstract execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<any>;

    get slashCommand(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }
}

export class CommandManager {
    private _commands: Collection<string, BotCommand>;

    constructor() {
        Logger.info("Initializing command manager");
        this.initCommands();
        Logger.info("Finished initializing command manager");
    }

    private initCommands(): void {
        this._commands = new Collection();
        const commandsPath = path.join(__dirname, "../commands");
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command: BotCommand = require(filePath).default;
            this._commands.set(command.name, command);
        }

        // TODO handle private voice channel
    }

    public async registerGuildCommands(guildId: string): Promise<unknown> {
        Logger.info("Registering commands to dev guild");
        const slashCommandData = this._commands.map(command => command.slashCommand.toJSON());
        const rest = new REST().setToken(Config.discordToken);

        try {
            const applicationGuildPromise = await rest.put(Routes.applicationGuildCommands(Config.clientId, guildId), {
                body: slashCommandData,
            });
            Logger.info(`Successfully registered ${slashCommandData.length} application commands`);
            return applicationGuildPromise;
        } catch (e) {
            Logger.error("Error registering application commands", e);
            throw new Error("Error registering application commands.");
        }
    }

    public async registerGlobalCommands(): Promise<void> {
        Logger.info("Registering commands to global application");
        const slashCommandData = this._commands.map(command => command.slashCommand.toJSON());
        const rest = new REST().setToken(Config.discordToken);

        try {
            const applicationGuildPromise = await rest.put(Routes.applicationCommands(Config.clientId), {
                body: slashCommandData,
            });
            Logger.info(`Successfully registered ${slashCommandData.length} application commands`);
        } catch (e) {
            Logger.error("Error registering application commands", e);
            throw new Error("Error registering application commands.");
        }
    }

    public async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            Logger.info(
                `Executing command: ${interaction.commandName} for ${interaction.member.user.toString()} ${interaction.member.user.username}#${
                    interaction.member.user.discriminator
                }.`,
            );
            await this._commands.get(interaction.commandName).execute(interaction);
            Logger.info(
                `Finished executing command: ${interaction.commandName} for ${interaction.member.user.username}#${interaction.member.user.discriminator}.`,
            );
        } catch (e: any) {
            Logger.error(`Failed executing command: ${interaction.commandName}`);
            Logger.error("Error found: %O", e);

            interaction.reply("Something went wrong executing this command. Sorry!");
        }
    }
}
