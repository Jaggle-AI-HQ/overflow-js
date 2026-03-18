import type { ParsedDSN } from "./types";

/** Parse a Overflow DSN into host and public key components. */
export function parseDSN(dsn: string): ParsedDSN {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    throw new Error(`[overflow] Invalid DSN: ${dsn}`);
  }

  const publicKey = url.username;
  if (!publicKey) {
    throw new Error("[overflow] DSN missing public key");
  }

  // Reconstruct host without credentials
  url.username = "";
  url.password = "";
  const host = url.toString().replace(/\/$/, "");

  return { host, publicKey };
}
