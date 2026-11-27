/** The translator of the `admin` messages (next-intl): a function with `has`. */
type Translator = ((key: string) => string) & { has: (key: string) => boolean };

const humanise = (s: string) => {
  const x = s.replace(/[._-]+/g, " ").trim();
  return x.charAt(0).toUpperCase() + x.slice(1);
};

/**
 * "announcement.publish" → "सूचना प्रकाशित केले" (or "Announcement published"): the audit action in the language of the
 * UI, from the `admin.auditUi.groups` / `verbs` messages. An unknown code falls back to a readable form of the code.
 */
export function auditActionLabel(t: Translator, action: string): string {
  const [group = "", ...rest] = action.split(".");
  const verb = rest.join("_");
  const g = t.has(`auditUi.groups.${group}`) ? t(`auditUi.groups.${group}`) : humanise(group);
  const v = verb ? (t.has(`auditUi.verbs.${verb}`) ? t(`auditUi.verbs.${verb}`) : humanise(verb).toLowerCase()) : "";
  return `${g} ${v}`.trim();
}

/** "SuccessStory" → "यशोगाथा" (or "Success story"). */
export function auditEntityLabel(t: Translator, entityType: string): string {
  return t.has(`auditUi.entities.${entityType}`) ? t(`auditUi.entities.${entityType}`) : entityType;
}
