import { validateEnvironment } from "./src/lib/env";

export function register() {
  validateEnvironment();
}
