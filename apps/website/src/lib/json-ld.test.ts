import { describe, expect, it } from "vitest";
import { jsonLdScript } from "./json-ld";

describe("jsonLdScript", () => {
  it("serializes a plain object as JSON", () => {
    const data = { "@type": "Product", name: "Chimney" };
    expect(jsonLdScript(data)).toBe(JSON.stringify(data));
  });

  it("escapes '<' so a closing </script> tag inside admin-authored text can't break out", () => {
    const data = { description: "Great value</script><script>alert(1)</script>" };
    const script = jsonLdScript(data);

    expect(script).not.toContain("</script>");
    // Only "<" is escaped (that's the character a browser needs to open a new tag); the
    // trailing ">" is left as-is, which is harmless outside of a "<" context.
    expect(script).toContain("\\u003c/script>");
    expect(script).toContain("\\u003cscript>");
  });

  it("produces output that still round-trips back to equivalent JSON", () => {
    const data = { name: "<Brand> Oven", value: 42 };
    const script = jsonLdScript(data);
    // \u003c is a valid JSON escape for "<", so the string is still parseable.
    expect(JSON.parse(script)).toEqual(data);
  });
});
