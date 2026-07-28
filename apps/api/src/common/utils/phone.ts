/**
 * Last 10 digits of a phone number — treats "+91 9900011122", "+919900011122", "919900011122",
 * and "9900011122" as the same underlying (Indian mobile) number regardless of spacing, the "+",
 * or whether a country code is present. Phones aren't stored in one canonical format across
 * every entry point (WhatsApp's `from` field, the website's free-text input, staff typing into
 * a form), so lookups compare on this instead of the raw string.
 */
export function phoneMatchKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
