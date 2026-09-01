import { hours, minutes, type ThrottlerModuleOptions } from "@nestjs/throttler";

export const RATE_LIMITS = {
  login: { limit: 8, ttl: minutes(5), blockDuration: minutes(10) },
  register: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
  emailRequest: { limit: 3, ttl: minutes(15), blockDuration: minutes(15) },
  tokenAction: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) },
  search: { limit: 60, ttl: minutes(1), blockDuration: minutes(1) },
  upload: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
  communityReport: { limit: 10, ttl: hours(1), blockDuration: hours(1) },
} as const;

export const rateLimitOptions: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: "default",
      limit: 180,
      ttl: minutes(1),
      blockDuration: minutes(1),
    },
  ],
  errorMessage: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
};

export function readTrustProxyHops(value = process.env.TRUST_PROXY_HOPS) {
  if (!value) return 0;
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : 0;
}
