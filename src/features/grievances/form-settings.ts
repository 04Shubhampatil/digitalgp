import { publishedSectionData } from "@/lib/published-section";

/** Published complaint-form settings, with safe defaults when the section is missing or unpublished. */
export type ComplaintFormSettings = {
  captchaEnabled: boolean;
  allowFileUpload: boolean;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  recipientEmail?: string;
};

export async function complaintFormSettings(tenantId: string): Promise<ComplaintFormSettings> {
  const data = (await publishedSectionData(tenantId, "grievance", "complaint-form")) as Partial<ComplaintFormSettings> | null;
  return {
    captchaEnabled: data?.captchaEnabled === true,
    allowFileUpload: data?.allowFileUpload === true,
    maxFileSizeMb: data?.maxFileSizeMb ?? 10,
    allowedFileTypes: data?.allowedFileTypes ?? [],
    recipientEmail: data?.recipientEmail,
  };
}
