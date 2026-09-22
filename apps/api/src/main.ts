import "./environment";
import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./module";

function listenPort(): number {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT 必须是 1 到 65535 之间的整数");
  }
  return port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
      whitelist: true,
    }),
  );

  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length) {
    app.enableCors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
    });
  }

  app.enableShutdownHooks();
  await app.listen(listenPort(), "0.0.0.0");
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(error instanceof Error ? error.message : "服务启动失败");
  process.exitCode = 1;
});
