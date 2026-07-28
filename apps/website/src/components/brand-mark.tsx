const MONOGRAM_SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-20 w-20 text-2xl",
} as const;

// Real logos are wordmarks of varying aspect ratio — a fixed-width tile with object-contain
// (not a square clipped to a circle) is the only way to show one without cropping it.
const LOGO_SIZES = {
  sm: "h-10 w-20",
  md: "h-16 w-32",
  lg: "h-20 w-40",
} as const;

/**
 * Shows a brand's real logo once one is uploaded (Brand.logoUrl, set via the CRM's Manage
 * Brands screen). Until then, a circular monogram echoes DreamHome's own logo mark (a ringed
 * initial) instead of a plain text box.
 */
export function BrandMark({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof MONOGRAM_SIZES;
}) {
  if (logoUrl) {
    return (
      <div
        className={`${LOGO_SIZES[size]} flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- brand-supplied logo URL */}
        <img src={logoUrl} alt={`${name} logo`} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className={`${MONOGRAM_SIZES[size]} flex items-center justify-center rounded-full border-2 border-sky-600 bg-sky-50 font-bold text-sky-700`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
