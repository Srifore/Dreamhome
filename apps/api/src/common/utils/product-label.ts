/**
 * Product names in this catalog aren't consistently one convention or the other — some already
 * embed the brand ("Faber Designer Chimney 90cm"), some don't ("iQ700 Island Chimney Hood 90cm").
 * Prepending the brand unconditionally produces "Faber Faber Designer Chimney 90cm" for the
 * former, so only prepend when it's actually missing.
 */
export function productLabel(product: { name: string; brand: { name: string } }): string {
  return product.name.toLowerCase().startsWith(product.brand.name.toLowerCase())
    ? product.name
    : `${product.brand.name} ${product.name}`;
}
