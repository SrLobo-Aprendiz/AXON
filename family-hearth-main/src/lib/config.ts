// Global application configuration
// CRITICAL: Never hardcode the app name in UI components - always use this constant

export const APP_CONFIG = {
  name: "Axon",
  tagline: "Household connections, simplified",
  version: "1.0.0",
  storage: {
    defaultLimitMb: 1000,
    maxFileSizeMb: 0.5, // 500KB
  },
  tiers: {
    alpha: "Alpha Pioneer",
    beta: "Beta Pioneer",
  },
  uiModes: {
    standard: "standard",
    stealth: "stealth", 
    simple: "simple",
  },
} as const;

export const NEXT_PUBLIC_APP_NAME = APP_CONFIG.name;
