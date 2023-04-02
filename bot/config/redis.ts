import { Config } from "./config";
import { Client } from "redis-om";
import { Logger } from "./logger";

export const Redis = new Client();

export const startRedis = (): Promise<void> => {
    Logger.info("Initializing Redis");
    return Redis.open(`redis://${Config.redisHost}:${Config.redisPort}`).then(() => {
        Logger.info("Successfully initialized Redis");
    });
};
