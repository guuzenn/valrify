import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { readTrustProxyHops } from "./rate-limit.config";
import { readWebOrigins, securityMiddleware } from "./security";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  const trustProxyHops = readTrustProxyHops();
  if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  const origins = readWebOrigins();
  app.use(securityMiddleware(origins));
  app.enableCors({
    origin: origins,
    credentials: true,
  });
  await app.listen(Number(process.env.PORT ?? 3001));
}

void bootstrap();
