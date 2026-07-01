import { randomBytes } from "node:crypto";
import { prisma } from "../db";
import { decodeImageInput, getStorage } from "../storage";
import type { GuideRepository } from "./guide-repository";
import type {
  AddStepInput,
  CreateGuideInput,
  Guide,
  GuideStatus,
  GuideSummary,
  Step,
  StepAnnotation,
  StepType,
  UpdateGuideInput,
  UpdateStepInput,
} from "./types";

type StepRow = {
  id: string;
  guideId: string;
  order: number;
  type: string;
  title: string;
  description: string;
  screenshotPath: string | null;
  annotation: string | null;
  pageUrl: string;
  createdAt: Date;
};

type GuideRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  shareId: string | null;
  shareEnabled: boolean;
  sourceUrl: string;
  logoPath: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps?: StepRow[];
};

function shareSlug(): string {
  return randomBytes(9).toString("base64url"); // ~12 url-safe chars
}

// Download a favicon and store it; returns the storage key (or null on failure).
async function downloadLogo(faviconUrl?: string): Promise<string | null> {
  if (!faviconUrl || !/^https?:\/\//i.test(faviconUrl)) return null;
  try {
    const res = await fetch(faviconUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    return await getStorage().save(buf, contentType.split(";")[0].trim());
  } catch {
    return null;
  }
}

function toStep(row: StepRow): Step {
  const storage = getStorage();
  let annotation: StepAnnotation | null = null;
  if (row.annotation) {
    try {
      annotation = JSON.parse(row.annotation) as StepAnnotation;
    } catch {
      annotation = null;
    }
  }
  return {
    id: row.id,
    guideId: row.guideId,
    order: row.order,
    type: row.type as StepType,
    title: row.title,
    description: row.description,
    screenshotUrl: storage.publicUrl(row.screenshotPath),
    annotation,
    pageUrl: row.pageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

function toGuide(row: GuideRow): Guide {
  const steps = (row.steps ?? []).map(toStep).sort((a, b) => a.order - b.order);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as GuideStatus,
    shareId: row.shareId,
    shareEnabled: row.shareEnabled,
    sourceUrl: row.sourceUrl,
    logoUrl: getStorage().publicUrl(row.logoPath),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    steps,
  };
}

export class PrismaGuideRepository implements GuideRepository {
  async list(): Promise<GuideSummary[]> {
    const rows = await prisma.guide.findMany({
      orderBy: { updatedAt: "desc" },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    const storage = getStorage();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as GuideStatus,
      shareEnabled: row.shareEnabled,
      stepCount: row.steps.length,
      coverUrl: storage.publicUrl(row.steps[0]?.screenshotPath),
      logoUrl: storage.publicUrl(row.logoPath),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async get(id: string): Promise<Guide | null> {
    const row = await prisma.guide.findUnique({
      where: { id },
      include: { steps: true },
    });
    return row ? toGuide(row) : null;
  }

  async getByShareId(shareId: string): Promise<Guide | null> {
    const row = await prisma.guide.findUnique({
      where: { shareId },
      include: { steps: true },
    });
    if (!row || !row.shareEnabled) return null;
    return toGuide(row);
  }

  async create(input: CreateGuideInput): Promise<Guide> {
    const storage = getStorage();

    // Persist screenshots first so a failure doesn't leave half a guide.
    const prepared = await Promise.all(
      input.steps.map(async (step, index) => {
        let screenshotPath: string | null = null;
        if (step.screenshot) {
          const { buffer, contentType } = decodeImageInput(step.screenshot);
          screenshotPath = await storage.save(buffer, contentType);
        }
        return {
          order: index,
          type: step.type ?? "click",
          title: step.title ?? "",
          description: step.description ?? "",
          screenshotPath,
          annotation: step.annotation ? JSON.stringify(step.annotation) : null,
          pageUrl: step.pageUrl ?? "",
        };
      })
    );

    const logoPath = await downloadLogo(input.faviconUrl);

    const row = await prisma.guide.create({
      data: {
        title: input.title,
        description: input.description ?? "",
        sourceUrl: input.sourceUrl ?? "",
        logoPath,
        steps: { create: prepared },
      },
      include: { steps: true },
    });
    return toGuide(row);
  }

  async addStep(guideId: string, input: AddStepInput): Promise<Guide | null> {
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) return null;

    const existing = await prisma.step.findMany({
      where: { guideId },
      orderBy: { order: "asc" },
    });
    // Where to insert: clamp the requested index into [0, length]; append if none.
    const at =
      input.index == null
        ? existing.length
        : Math.max(0, Math.min(input.index, existing.length));

    let screenshotPath: string | null = null;
    if (input.screenshot) {
      const { buffer, contentType } = decodeImageInput(input.screenshot);
      screenshotPath = await getStorage().save(buffer, contentType);
    }

    // Note steps carry their callout variant in the annotation JSON.
    const annotation = input.noteKind
      ? JSON.stringify({ noteKind: input.noteKind })
      : null;

    await prisma.$transaction([
      // Shift everything at/after the insert point down by one.
      ...existing
        .filter((s) => s.order >= at)
        .map((s) =>
          prisma.step.update({ where: { id: s.id }, data: { order: s.order + 1 } })
        ),
      prisma.step.create({
        data: {
          guideId,
          order: at,
          type: input.type ?? "manual",
          title: input.title ?? "",
          description: input.description ?? "",
          screenshotPath,
          annotation,
        },
      }),
      prisma.guide.update({ where: { id: guideId }, data: {} }), // bump updatedAt
    ]);
    return this.get(guideId);
  }

  async setStepImage(
    guideId: string,
    stepId: string,
    image: string
  ): Promise<Guide | null> {
    const step = await prisma.step.findFirst({ where: { id: stepId, guideId } });
    if (!step) return null;

    const { buffer, contentType } = decodeImageInput(image);
    const screenshotPath = await getStorage().save(buffer, contentType);
    if (step.screenshotPath) await getStorage().remove(step.screenshotPath);

    await prisma.step.update({
      where: { id: stepId },
      data: { screenshotPath },
    });
    await prisma.guide.update({ where: { id: guideId }, data: {} });
    return this.get(guideId);
  }

  async update(id: string, input: UpdateGuideInput): Promise<Guide | null> {
    const exists = await prisma.guide.findUnique({ where: { id } });
    if (!exists) return null;
    const row = await prisma.guide.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
      },
      include: { steps: true },
    });
    return toGuide(row);
  }

  async remove(id: string): Promise<boolean> {
    const row = await prisma.guide.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!row) return false;
    const storage = getStorage();
    await Promise.all(
      [...row.steps.map((s) => s.screenshotPath), row.logoPath]
        .filter((p): p is string => Boolean(p))
        .map((p) => storage.remove(p))
    );
    await prisma.guide.delete({ where: { id } });
    return true;
  }

  async updateStep(
    guideId: string,
    stepId: string,
    input: UpdateStepInput
  ): Promise<Guide | null> {
    const step = await prisma.step.findFirst({ where: { id: stepId, guideId } });
    if (!step) return null;
    await prisma.step.update({
      where: { id: stepId },
      data: {
        title: input.title,
        description: input.description,
        annotation:
          input.annotation === undefined
            ? undefined
            : input.annotation === null
              ? null
              : JSON.stringify(input.annotation),
      },
    });
    await prisma.guide.update({ where: { id: guideId }, data: {} }); // bump updatedAt
    return this.get(guideId);
  }

  async removeStep(guideId: string, stepId: string): Promise<Guide | null> {
    const step = await prisma.step.findFirst({ where: { id: stepId, guideId } });
    if (!step) return null;
    if (step.screenshotPath) await getStorage().remove(step.screenshotPath);
    await prisma.step.delete({ where: { id: stepId } });

    // Re-pack order values so they stay contiguous.
    const remaining = await prisma.step.findMany({
      where: { guideId },
      orderBy: { order: "asc" },
    });
    await prisma.$transaction(
      remaining.map((s, i) =>
        prisma.step.update({ where: { id: s.id }, data: { order: i } })
      )
    );
    return this.get(guideId);
  }

  async duplicateStep(guideId: string, stepId: string): Promise<Guide | null> {
    const step = await prisma.step.findFirst({ where: { id: stepId, guideId } });
    if (!step) return null;

    // Give the copy its own image file so deleting either step is safe.
    const screenshotPath = step.screenshotPath
      ? await getStorage().copy(step.screenshotPath)
      : null;

    const after = await prisma.step.findMany({
      where: { guideId, order: { gt: step.order } },
    });

    await prisma.$transaction([
      // Make room: shift everything after the original down by one.
      ...after.map((s) =>
        prisma.step.update({ where: { id: s.id }, data: { order: s.order + 1 } })
      ),
      prisma.step.create({
        data: {
          guideId,
          order: step.order + 1,
          type: step.type,
          title: step.title,
          description: step.description,
          screenshotPath,
          annotation: step.annotation,
          pageUrl: step.pageUrl,
        },
      }),
      prisma.guide.update({ where: { id: guideId }, data: {} }), // bump updatedAt
    ]);
    return this.get(guideId);
  }

  async reorderSteps(
    guideId: string,
    orderedStepIds: string[]
  ): Promise<Guide | null> {
    const steps = await prisma.step.findMany({ where: { guideId } });
    const valid = new Set(steps.map((s) => s.id));
    if (orderedStepIds.some((id) => !valid.has(id))) return null;
    await prisma.$transaction(
      orderedStepIds.map((id, i) =>
        prisma.step.update({ where: { id }, data: { order: i } })
      )
    );
    return this.get(guideId);
  }

  async setLogo(id: string, image: string | null): Promise<Guide | null> {
    const guide = await prisma.guide.findUnique({ where: { id } });
    if (!guide) return null;

    let logoPath: string | null = null;
    if (image) {
      const { buffer, contentType } = decodeImageInput(image);
      logoPath = await getStorage().save(buffer, contentType);
    }
    if (guide.logoPath) await getStorage().remove(guide.logoPath);

    await prisma.guide.update({ where: { id }, data: { logoPath } });
    return this.get(id);
  }

  async setSharing(id: string, enabled: boolean): Promise<Guide | null> {
    const row = await prisma.guide.findUnique({ where: { id } });
    if (!row) return null;
    const shareId = enabled ? (row.shareId ?? shareSlug()) : row.shareId;
    await prisma.guide.update({
      where: { id },
      data: {
        shareEnabled: enabled,
        shareId,
        status: enabled ? "published" : row.status,
      },
    });
    return this.get(id);
  }
}
