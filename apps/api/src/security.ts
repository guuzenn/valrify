import type { NextFunction, Request, Response } from "express";

export function readWebOrigins(env: NodeJS.ProcessEnv = process.env) {
  const origins = (env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map((value) => value.trim());
  if (env.PUBLIC_APP_URL) origins.push(new URL(env.PUBLIC_APP_URL).origin);
  for (const value of origins) {
    const url = new URL(value);
    if (url.origin !== value || !["http:", "https:"].includes(url.protocol) || (env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("WEB_ORIGIN must contain explicit HTTPS origins in production.");
  }
  return [...new Set(origins)];
}

export function securityMiddleware(origins: string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    if (request.cookies?.valrify_session || request.headers.authorization || /^\/api\/(auth|account|admin|notifications)(\/|$)/.test(request.path)) response.setHeader("Cache-Control", "private, no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      let origin = request.headers.origin;
      if (!origin && request.headers.referer) { try { origin = new URL(request.headers.referer).origin; } catch { /* invalid referer is rejected below */ } }
      if ((origin && !origins.includes(origin)) || (!origin && request.cookies?.valrify_session)) {
        response.status(403).json({ message: "Asal permintaan tidak diizinkan." });
        return;
      }
    }
    next();
  };
}
