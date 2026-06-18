import type { GuideRepository } from "./guide-repository";
import { PrismaGuideRepository } from "./prisma-guide-repository";

// The single configured repository for the app. To move to a cloud backend,
// implement GuideRepository against your API/DB and return it here — no caller
// changes required.
let repo: GuideRepository | undefined;

export function getGuideRepository(): GuideRepository {
  if (!repo) repo = new PrismaGuideRepository();
  return repo;
}

export type { GuideRepository } from "./guide-repository";
export * from "./types";
