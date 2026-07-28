import { COMPANY } from "@/lib/content";

/** wa.me expects country code + number with no spaces, +, or other punctuation. */
function toWhatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function WhatsAppButton() {
  return (
    <a
      href={toWhatsAppLink(COMPANY.phone)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="h-8 w-8">
        <path d="M16.004 3C9.375 3 4 8.373 4 15c0 2.29.638 4.43 1.746 6.257L4 29l7.94-1.706A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75a9.7 9.7 0 0 1-4.95-1.354l-.355-.21-4.71 1.012 1.03-4.59-.232-.372A9.71 9.71 0 0 1 5.25 15c0-5.93 4.824-10.75 10.754-10.75S26.758 9.07 26.758 15 21.934 24.75 16.004 24.75Zm5.62-7.868c-.308-.154-1.82-.898-2.102-1-.282-.103-.487-.154-.692.154-.205.308-.795 1-.975 1.205-.18.205-.36.231-.667.077-.308-.154-1.3-.479-2.475-1.526-.915-.816-1.533-1.824-1.713-2.132-.18-.308-.02-.474.135-.627.138-.138.308-.36.462-.539.154-.18.205-.308.308-.513.103-.205.051-.385-.026-.539-.077-.154-.692-1.667-.948-2.283-.25-.6-.505-.52-.692-.53-.18-.008-.385-.01-.59-.01-.205 0-.539.077-.821.385-.282.308-1.077 1.052-1.077 2.565 0 1.513 1.103 2.975 1.257 3.18.154.205 2.172 3.318 5.262 4.654.735.317 1.309.507 1.756.649.738.235 1.41.202 1.941.123.592-.088 1.82-.744 2.077-1.462.257-.718.257-1.333.18-1.462-.077-.128-.282-.205-.59-.36Z" />
      </svg>
    </a>
  );
}
