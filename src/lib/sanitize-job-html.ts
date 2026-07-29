import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "s",
    "u",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "a",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["class"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
    }),
  },
};

export function sanitizeJobHtml(
  input: string | null | undefined
): string | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (raw === "") return null;
  const cleaned = sanitizeHtml(raw, SANITIZE_OPTIONS).trim();
  if (cleaned === "" || cleaned === "<p></p>") return null;
  return cleaned;
}

export function normalizeJobSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const JOB_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
] as const;

export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number];

export const JOB_STATUSES = ["open", "closed", "draft"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export function isJobEmploymentType(v: unknown): v is JobEmploymentType {
  return (
    typeof v === "string" &&
    (JOB_EMPLOYMENT_TYPES as readonly string[]).includes(v)
  );
}

export function isJobStatus(v: unknown): v is JobStatus {
  return typeof v === "string" && (JOB_STATUSES as readonly string[]).includes(v);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function employmentTypeLabel(type: string): string {
  switch (type) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "contract":
      return "Contract";
    case "internship":
      return "Internship";
    default:
      return type;
  }
}
