import type {
  AddStepInput,
  CreateGuideInput,
  Guide,
  GuideSummary,
  UpdateGuideInput,
  UpdateStepInput,
} from "./types";

// The contract every storage backend must satisfy. The API and UI depend only
// on this interface — swapping SQLite for Postgres/cloud means writing a new
// implementation, not touching callers.
export interface GuideRepository {
  list(): Promise<GuideSummary[]>;
  get(id: string): Promise<Guide | null>;
  getByShareId(shareId: string): Promise<Guide | null>;
  create(input: CreateGuideInput): Promise<Guide>;
  update(id: string, input: UpdateGuideInput): Promise<Guide | null>;
  remove(id: string): Promise<boolean>;

  /** Append a new (manual) step to a guide. */
  addStep(guideId: string, input: AddStepInput): Promise<Guide | null>;
  updateStep(
    guideId: string,
    stepId: string,
    input: UpdateStepInput
  ): Promise<Guide | null>;
  /** Replace (or set) a step's screenshot from a base64 image. */
  setStepImage(
    guideId: string,
    stepId: string,
    image: string
  ): Promise<Guide | null>;
  removeStep(guideId: string, stepId: string): Promise<Guide | null>;
  reorderSteps(guideId: string, orderedStepIds: string[]): Promise<Guide | null>;

  /** Enable/disable public sharing; returns the (possibly new) share slug. */
  setSharing(id: string, enabled: boolean): Promise<Guide | null>;

  /** Set (or clear, with null) the guide's header logo from a base64 image. */
  setLogo(id: string, image: string | null): Promise<Guide | null>;
}
