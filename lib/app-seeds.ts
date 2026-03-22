import { hospitalSeedData } from "@/lib/seed-data-hospital";
import { seedData } from "@/lib/seed-data";
import type { AppSeed, SystemMode } from "@/lib/types";

export const appSeeds: Record<SystemMode, AppSeed> = {
  automotive: seedData,
  hospital: hospitalSeedData,
};

export function getAppSeed(systemMode: SystemMode) {
  return appSeeds[systemMode];
}

export function cloneAppSeed(systemMode: SystemMode): AppSeed {
  return JSON.parse(JSON.stringify(getAppSeed(systemMode))) as AppSeed;
}
