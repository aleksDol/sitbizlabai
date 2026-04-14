import { LeadStatus, Prisma } from "@prisma/client";

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "boolean") {
    return undefined;
  }
  return value;
}

function parseLeadStatus(value: unknown): LeadStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === "NEW") return LeadStatus.NEW;
  if (normalized === "CONTACTED") return LeadStatus.CONTACTED;
  if (normalized === "WON") return LeadStatus.WON;
  if (normalized === "LOST") return LeadStatus.LOST;
  return undefined;
}

export type CreateLeadInput = {
  name: string;
  contact: string;
  websiteUrl?: string | null;
  analysisText?: string | null;
  lossesText?: string | null;
  solutionOfferText?: string | null;
  siteType?: string | null;
  hasRepeatSales?: boolean | null;
  trafficSources?: string | null;
};

export function validateCreateLeadPayload(payload: unknown): ValidationResult<Prisma.LeadCreateInput> {
  if (!isObject(payload)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const errors: string[] = [];

  const name = normalizeString(payload.name);
  if (!name) {
    errors.push("Field 'name' is required.");
  }

  const contact = normalizeString(payload.contact);
  if (!contact) {
    errors.push("Field 'contact' is required.");
  }

  const websiteUrl = normalizeOptionalString(payload.websiteUrl);
  if (payload.websiteUrl !== undefined && websiteUrl === undefined) {
    errors.push("Field 'websiteUrl' must be a string or null.");
  }

  const analysisText = normalizeOptionalString(payload.analysisText);
  if (payload.analysisText !== undefined && analysisText === undefined) {
    errors.push("Field 'analysisText' must be a string or null.");
  }

  const lossesText = normalizeOptionalString(payload.lossesText);
  if (payload.lossesText !== undefined && lossesText === undefined) {
    errors.push("Field 'lossesText' must be a string or null.");
  }

  const solutionOfferText = normalizeOptionalString(payload.solutionOfferText);
  if (payload.solutionOfferText !== undefined && solutionOfferText === undefined) {
    errors.push("Field 'solutionOfferText' must be a string or null.");
  }

  const siteType = normalizeOptionalString(payload.siteType);
  if (payload.siteType !== undefined && siteType === undefined) {
    errors.push("Field 'siteType' must be a string or null.");
  }

  const hasRepeatSales = normalizeOptionalBoolean(payload.hasRepeatSales);
  if (payload.hasRepeatSales !== undefined && hasRepeatSales === undefined) {
    errors.push("Field 'hasRepeatSales' must be a boolean or null.");
  }

  const trafficSources = normalizeOptionalString(payload.trafficSources);
  if (payload.trafficSources !== undefined && trafficSources === undefined) {
    errors.push("Field 'trafficSources' must be a string or null.");
  }

  if (errors.length > 0 || !name || !contact) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      contact,
      websiteUrl: websiteUrl ?? null,
      analysisText: analysisText ?? null,
      lossesText: lossesText ?? null,
      solutionOfferText: solutionOfferText ?? null,
      siteType: siteType ?? null,
      hasRepeatSales: hasRepeatSales ?? null,
      trafficSources: trafficSources ?? null,
    },
  };
}

export type UpdateLeadInput = {
  status?: LeadStatus;
  managerComment?: string | null;
};

export function validateUpdateLeadPayload(payload: unknown): ValidationResult<UpdateLeadInput> {
  if (!isObject(payload)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const errors: string[] = [];
  const data: UpdateLeadInput = {};

  if (payload.status !== undefined) {
    const status = parseLeadStatus(payload.status);
    if (!status) {
      errors.push("Field 'status' must be one of: NEW, CONTACTED, WON, LOST.");
    } else {
      data.status = status;
    }
  }

  if (payload.managerComment !== undefined) {
    const managerComment = normalizeOptionalString(payload.managerComment);
    if (managerComment === undefined) {
      errors.push("Field 'managerComment' must be a string or null.");
    } else {
      data.managerComment = managerComment;
    }
  }

  if (Object.keys(data).length === 0) {
    errors.push("At least one field must be provided for update.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function parseLeadId(rawId: string): string | null {
  const id = rawId.trim();
  return id.length > 0 ? id : null;
}

