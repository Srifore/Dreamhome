export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  { id: "standard", name: "Standard", description: "Clean two-column header, minimal borders." },
  { id: "modern", name: "Modern", description: "Bold color header band and accented totals." },
  { id: "simple", name: "Simple", description: "Borderless, airy spacing, light type." },
  { id: "classic", name: "Classic", description: "Centered header, fully gridded table." },
  { id: "compact", name: "Compact", description: "Dense spreadsheet-style layout." },
];

export interface QuoteTemplateStyle {
  /** Wraps the company/title header in a full-bleed colored band instead of plain text. */
  headerBand: boolean;
  headerAlign: "left" | "center";
  cardClass: string;
  headerWrapClass: string;
  companyNameClass: string;
  addressClass: string;
  titleClass: string;
  metaClass: string;
  tableHeadRowClass: string;
  tableHeadCellClass: string;
  tableCellClass: string;
  tableBorderClass: string;
  totalRowClass: string;
}

const BASE: QuoteTemplateStyle = {
  headerBand: false,
  headerAlign: "left",
  cardClass: "print:border-0 print:shadow-none",
  headerWrapClass: "mb-6 flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6",
  companyNameClass: "text-lg font-semibold text-neutral-900",
  addressClass: "text-sm text-neutral-600",
  titleClass: "mb-2 text-2xl font-bold uppercase text-neutral-900",
  metaClass: "text-sm text-neutral-600",
  tableHeadRowClass: "border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500",
  tableHeadCellClass: "px-2 py-2",
  tableCellClass: "px-2 py-2",
  tableBorderClass: "border-b border-neutral-100 last:border-0",
  totalRowClass: "border-t border-neutral-200 pt-1.5 text-base font-semibold text-neutral-900",
};

export function getQuoteTemplateStyle(templateId: string): QuoteTemplateStyle {
  switch (templateId) {
    case "modern":
      return {
        ...BASE,
        headerBand: true,
        cardClass: "overflow-hidden print:border-0 print:shadow-none",
        headerWrapClass:
          "-mx-4 -mt-4 mb-6 flex flex-wrap items-start justify-between gap-6 rounded-t-xl bg-sky-600 px-6 py-6",
        companyNameClass: "text-lg font-semibold text-white",
        addressClass: "text-sm text-sky-100",
        titleClass: "mb-2 text-2xl font-bold uppercase text-white",
        metaClass: "text-sm text-sky-100",
        tableHeadRowClass: "border-b border-neutral-200 bg-sky-50 text-left text-xs font-medium text-sky-700",
        totalRowClass: "border-t-2 border-sky-600 pt-1.5 text-base font-semibold text-sky-700",
      };
    case "simple":
      return {
        ...BASE,
        cardClass: "border-0 shadow-none print:border-0 print:shadow-none",
        headerWrapClass: "mb-8 flex flex-wrap items-start justify-between gap-6 pb-6",
        companyNameClass: "text-lg font-normal text-neutral-900",
        titleClass: "mb-2 text-2xl font-normal uppercase tracking-wide text-neutral-700",
        tableHeadRowClass: "border-b border-neutral-200 text-left text-xs font-medium text-neutral-500",
        tableCellClass: "px-2 py-3",
        totalRowClass: "border-t border-neutral-300 pt-2 text-base font-medium text-neutral-900",
      };
    case "classic":
      return {
        ...BASE,
        headerAlign: "center",
        headerWrapClass: "mb-6 flex flex-col items-center gap-2 border-b-2 border-double border-neutral-400 pb-6 text-center",
        companyNameClass: "font-serif text-xl font-semibold text-neutral-900",
        titleClass: "mb-1 font-serif text-2xl font-bold uppercase tracking-widest text-neutral-900",
        tableHeadRowClass: "border-2 border-neutral-400 bg-neutral-100 text-left text-xs font-semibold text-neutral-700",
        tableHeadCellClass: "border border-neutral-400 px-2 py-2",
        tableCellClass: "border border-neutral-300 px-2 py-2",
        tableBorderClass: "",
        totalRowClass: "border-t-2 border-double border-neutral-400 pt-1.5 text-base font-serif font-semibold text-neutral-900",
      };
    case "compact":
      return {
        ...BASE,
        headerWrapClass: "mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4",
        companyNameClass: "text-base font-semibold text-neutral-900",
        addressClass: "text-xs text-neutral-600",
        titleClass: "mb-1 text-xl font-bold uppercase text-neutral-900",
        metaClass: "text-xs text-neutral-600",
        tableHeadRowClass: "border border-neutral-300 bg-neutral-50 text-left text-[11px] font-medium text-neutral-500",
        tableHeadCellClass: "border border-neutral-300 px-1.5 py-1",
        tableCellClass: "border border-neutral-200 px-1.5 py-1 text-xs",
        tableBorderClass: "",
        totalRowClass: "border-t border-neutral-300 pt-1 text-sm font-semibold text-neutral-900",
      };
    default:
      return BASE;
  }
}
