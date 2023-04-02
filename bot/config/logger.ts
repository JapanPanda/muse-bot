import winston, { createLogger } from "winston";

const formatMeta = (meta: any) => {
    // You can format the splat yourself
    const splat = meta[Symbol.for("splat")];
    if (splat && splat.length) {
        return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
    }
    return "";
};

export const Logger = createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({
            format: "YY-MM-DD HH:mm:ss",
        }),
        winston.format.label({
            label: "LOGGER",
        }),
        winston.format.prettyPrint(),
        winston.format.splat(),
        winston.format.errors({ stack: true }),
    ),
    transports: [
        new winston.transports.File({
            filename: "error.log",
            level: "error",
        }),
        new winston.transports.File({ filename: "combined.log", format: winston.format.combine(winston.format.json()) }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    Logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.prettyPrint(),
                winston.format.splat(),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ label, level, message, timestamp, ...meta }) => `[${timestamp}] [${label}] [${level}]: ${message}`),
            ),
        }),
    );
}
