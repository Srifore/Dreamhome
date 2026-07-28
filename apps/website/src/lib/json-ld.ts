/** Serializes a JSON-LD object for embedding in a <script type="application/ld+json"> tag.
 *  Escapes "<" so a "</script>" sequence inside admin-authored text (a product name or
 *  description) can't break out of the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
