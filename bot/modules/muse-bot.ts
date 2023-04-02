import { DiscordGatewayAdapterCreator } from "@discordjs/voice";
import {
    BaseMessageOptions,
    ChatInputCommandInteraction,
    Client,
    Events,
    GatewayIntentBits,
    Interaction,
    Message,
    TextChannel,
    VoiceState,
} from "discord.js";
import { Shoukaku, Connectors } from "shoukaku";
import { Config, Logger, startRedis } from "../config";
import { AudioManager } from "./audio-manager";
import { CommandManager } from "./command-manager";

export class MuseBot {
    private _audioManagerForGuild: Record<string, AudioManager> = {};
    private _shoukaku: Shoukaku;
    private _client: Client;
    private _commandManager: CommandManager;
    private _discordToken: string = Config.discordToken;

    public async start(): Promise<void> {
        await startRedis();
        this._client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
        });
        this.initShoukaku();
        this._commandManager = new CommandManager();
        await this._commandManager.registerGuildCommands(Config.devGuildId);
        this.registerDiscordListeners();
        await this.login();
    }

    private initShoukaku(): void {
        const nodes = [
            {
                name: "muse-bot",
                url: Config.lavalinkUrl,
                auth: Config.lavalinkPassword,
            },
        ];
        this._shoukaku = new Shoukaku(new Connectors.DiscordJS(this._client), nodes);
    }

    private async login(): Promise<void> {
        try {
            await this._client.login(this._discordToken);
        } catch (e) {
            Logger.error("Error logging into discord.", e);
        }
    }

    private registerDiscordListeners(): void {
        this._client.on(Events.ClientReady, () => this.onReady());
        this._client.on(Events.InteractionCreate, intr => this.onInteraction(intr));
        this._client.on(Events.VoiceStateUpdate, (oldState, newState) => {
            this.onVoiceStateUpdate(oldState, newState);
        });
    }

    private onReady(): void {
        Logger.info("Muse bot has logged on!");
    }

    private async onInteraction(interaction: Interaction): Promise<void> {
        if (!this._client.isReady) {
            return;
        }

        if (interaction instanceof ChatInputCommandInteraction) {
            try {
                this._commandManager.handleChatCommand(interaction);
            } catch (e) {
                Logger.error(`Error executing command ${interaction.commandName}.`, e);
            }
        }
    }

    private async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (oldState.member.user.bot) {
            return;
        }

        const voiceChannel = await oldState.guild.channels.fetch(oldState.channelId);
        if (voiceChannel?.isVoiceBased?.() && voiceChannel?.members.size == 1 && voiceChannel?.members.at(0).user.bot) {
            Logger.info(`All members left the voice channel... cleaning up for guildId=${oldState.guild.id}`);
            this.cleanupAudioManagerForGuild(oldState.guild.id);
        }
    }

    public async sendMessageToChannelId(message: BaseMessageOptions, channelId: string): Promise<Message> {
        const channel = await this._client.channels.fetch(channelId);
        if (channel instanceof TextChannel) {
            return await channel.send(message);
        }

        return Promise.reject(`Failed to send message to channelId=${channelId}`);
    }

    public getOrCreateAudioManagerForGuild(guildId: string): AudioManager {
        if (this._audioManagerForGuild[guildId] == null) {
            this._audioManagerForGuild[guildId] = new AudioManager(guildId);
        }

        return this._audioManagerForGuild[guildId];
    }

    public getAudioManagerForGuild(guildId: string): AudioManager {
        return this._audioManagerForGuild[guildId];
    }

    public cleanupAudioManagerForGuild(guildId: string): void {
        Logger.info(`Cleaning up for guildId=${guildId}`);
        const audioManager = this._audioManagerForGuild[guildId];
        audioManager?.cleanUp?.();
        delete this._audioManagerForGuild[guildId];
    }

    public async getAdapterCreatorForGuild(guildId: string): Promise<DiscordGatewayAdapterCreator> {
        return (await this._client.guilds.fetch(guildId)).voiceAdapterCreator;
    }

    get shoukaku(): Shoukaku {
        return this._shoukaku;
    }
}

export const MuseBotClient = new MuseBot();
