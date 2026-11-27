type Translator = ((key: string) => string) & { has: (key: string) => boolean };

/** An announcement category ("meeting") in the language of the UI ("सभा" / "Meeting"); a custom category is shown as typed. */
export function announcementCategory(ta: Translator, category: string): string {
  const key = category.trim().toLowerCase();
  return ta.has(`announcements.type.${key}`) ? ta(`announcements.type.${key}`) : category;
}
