const REQUIRED_VARIABLES = [
  "APP_URL",
  "DATABASE_URL",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_GUILD_ID",
  "APP_SECRET",
] as const;

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function validateEnvironment() {
  const errors: string[] = [];

  for (const name of REQUIRED_VARIABLES) {
    if (!process.env[name]?.trim()) {
      errors.push(`${name} is required`);
    }
  }

  const appUrlValue = process.env.APP_URL?.trim();
  if (appUrlValue) {
    try {
      const appUrl = new URL(appUrlValue);

      if (!["http:", "https:"].includes(appUrl.protocol)) {
        errors.push("APP_URL must use http:// or https://");
      }

      if (appUrl.pathname !== "/" || appUrl.search || appUrl.hash) {
        errors.push("APP_URL must be an origin only, without a path, query, or fragment");
      }

      if (appUrlValue.endsWith("/")) {
        errors.push("APP_URL must not end with a trailing slash");
      }

      if (!isLocalHostname(appUrl.hostname)) {
        if (appUrl.protocol !== "https:") {
          errors.push("A non-local APP_URL must use HTTPS");
        }

        if (process.env.SECURE_COOKIES !== "true") {
          errors.push("SECURE_COOKIES must be true for a non-local APP_URL");
        }
      }
    } catch {
      errors.push("APP_URL must be a valid URL");
    }
  }

  const databaseUrlValue = process.env.DATABASE_URL?.trim();
  if (databaseUrlValue) {
    try {
      const databaseUrl = new URL(databaseUrlValue);

      if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
        errors.push("DATABASE_URL must use the PostgreSQL protocol");
      }

      if (!databaseUrl.username) {
        errors.push("DATABASE_URL must include a database username");
      }

      if (!databaseUrl.password) {
        errors.push("DATABASE_URL must include a database password");
      } else if (databaseUrl.password.toLowerCase() === "change-me") {
        errors.push("DATABASE_URL still uses the placeholder database password");
      }
    } catch {
      errors.push("DATABASE_URL must be a valid PostgreSQL connection URL");
    }
  }

  const appSecret = process.env.APP_SECRET?.trim();
  if (appSecret) {
    if (appSecret.length < 32) {
      errors.push("APP_SECRET must be at least 32 characters long");
    }

    if (appSecret.toLowerCase() === "change-me") {
      errors.push("APP_SECRET still uses a placeholder value");
    }
  }

  const secureCookies = process.env.SECURE_COOKIES ?? "false";
  if (!["true", "false"].includes(secureCookies)) {
    errors.push("SECURE_COOKIES must be either true or false");
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid Partyfinder environment configuration:\n${errors
        .map((error) => ` - ${error}`)
        .join("\n")}`,
    );
  }
}
