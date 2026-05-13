import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "apiKey", "secret"],
  serializers: {
    req: (req: { method: string; url: string }) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});

export function createModuleLogger(module: string) {
  return logger.child({ module });
}
