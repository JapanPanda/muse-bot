import { createClient } from "redis";
import { Config } from "./config";
import { Logger } from "./logger";

export const Redis = createClient();

export const startRedis = (): Promise<void> => {
    Logger.info("Initializing Redis");
    return Redis.connect({ url: `redis://${Config.redisHost}:${Config.redisPort}` }).then(() => {
        Logger.info("Successfully initialized Redis");
    });
};
