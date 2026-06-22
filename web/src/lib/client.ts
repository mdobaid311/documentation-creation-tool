// Thin client-side fetch helpers for the dashboard/editor mutations.
import type { Guide, NoteKind } from "./data";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async updateGuide(
    id: string,
    data: { title?: string; description?: string; status?: string }
  ): Promise<Guide> {
    const res = await fetch(`/api/guides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async deleteGuide(id: string): Promise<void> {
    await asJson(
      await fetch(`/api/guides/${id}`, { method: "DELETE" })
    );
  },

  async updateStep(
    guideId: string,
    stepId: string,
    data: { title?: string; description?: string; annotation?: unknown }
  ): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async deleteStep(guideId: string, stepId: string): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/steps/${stepId}`, {
      method: "DELETE",
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async addStep(
    guideId: string,
    data: { description?: string; screenshot?: string | null; index?: number } = {}
  ): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async addNote(
    guideId: string,
    noteKind: NoteKind = "note",
    index?: number
  ): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", noteKind, index, description: "" }),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async setStepImage(
    guideId: string,
    stepId: string,
    image: string
  ): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/steps/${stepId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async reorder(guideId: string, orderedStepIds: string[]): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedStepIds }),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async generateDescriptions(guideId: string): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/rephrase`, {
      method: "POST",
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async setLogo(guideId: string, image: string | null): Promise<Guide> {
    const res = await fetch(`/api/guides/${guideId}/logo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    return (await asJson<{ guide: Guide }>(res)).guide;
  },

  async setSharing(
    guideId: string,
    enabled: boolean
  ): Promise<{ guide: Guide; shareUrl: string | null }> {
    const res = await fetch(`/api/guides/${guideId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    return asJson(res);
  },
};
