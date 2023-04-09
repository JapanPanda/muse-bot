import { createClient } from "redis";
import { Config } from "./config";
import { Logger } from "./logger";

export const Redis = createClient({ url: `redis://${Config.redisHost}:${Config.redisPort}` });

export const startRedis = (): Promise<void> => {
    Logger.info("Initializing Redis");
    return Redis.connect().then(() => {
        Logger.info("Successfully initialized Redis");
    });
};
