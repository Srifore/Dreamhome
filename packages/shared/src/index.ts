export const OPPORTUNITY_STAGES = [
  "CONSULTATION",
  "DESIGN_SUPPORT",
  "PRODUCT_SELECTION",
  "INSTALLATION",
  "AFTER_SALES",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "WON",
  "LOST",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const SERVICE_TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type ServiceTicketStatus = (typeof SERVICE_TICKET_STATUSES)[number];

export const B2B_ACCOUNT_TYPES = [
  "ARCHITECT",
  "INTERIOR_DESIGNER",
  "BUILDER",
  "DEVELOPER",
] as const;
export type B2BAccountType = (typeof B2B_ACCOUNT_TYPES)[number];
