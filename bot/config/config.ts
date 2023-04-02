import * as dotenv from "dotenv";

dotenv.config();

export interface MuseBotConfig {
    adminUserIds: Array<string>;
    clientId: string;
    devGuildId: string;
    discordToken: string;
    lavalinkUrl: string;
    lavalinkPassword: string;
    redisHost: string;
    redisPort: string;
    spotifyClientId: string;
    spotifyClientSecret: string;
}

export const Config: MuseBotConfig = {
    adminUserIds: process.env.ADMIN_IDS.split(","),
    clientId: process.env.CLIENT_ID,
    devGuildId: process.env.DEV_GUILD_ID,
    discordToken: process.env.DISCORD_TOKEN,
    lavalinkUrl: process.env.LAVALINK_URL,
    lavalinkPassword: process.env.LAVALINK_PASSWORD,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};
