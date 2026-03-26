import winston from "winston";

// destructuring helpers. So no winston.format.combine BS
const { combine, timestamp, colorize, printf, json } = winston.format;

// this is how devFormat will look
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  }),
);

// this is how production format will look
const prodFormat = combine(timestamp(), json());

// a boolean to differentiate production and development environments
const isProduction = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  // decides the level
  level: isProduction ? "info" : "debug",
  // decides the format
  format: isProduction ? prodFormat : devFormat,
  // decides how the basic error outputs
  transports: isProduction
    ? [new winston.transports.File({ filename: "logs/app.log" })]
    : [new winston.transports.Console()],

  // decides how the exception error outputs
  exceptionHandlers: isProduction
    ? [new winston.transports.File({ filename: "logs/exceptions.log" })]
    : [new winston.transports.Console()],

  // decides how the rejection error outputs
  rejectionHandlers: isProduction
    ? [new winston.transports.File({ filename: "logs/rejections.log" })]
    : [new winston.transports.Console()],
});

export default logger;
