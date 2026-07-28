export interface FeatureToggle {
  key: string;
  label: string;
  description: string;
}

// Mirrors the @RequirePermissions() strings actually enforced across the API.
export const SUPERVISOR_FEATURES: FeatureToggle[] = [
  {
    key: "inventory:write",
    label: "Manage Inventory",
    description: "Create/edit products, brands, categories, and stock levels",
  },
  {
    key: "crm:write",
    label: "Manage CRM",
    description: "Create/edit customers, leads, B2B accounts, and opportunities",
  },
  {
    key: "sales:write",
    label: "Manage Sales",
    description: "Create quotes, confirm orders, and record payments",
  },
  {
    key: "service:write",
    label: "Manage Service Tickets",
    description: "Create and update service tickets",
  },
  {
    key: "branches:manage",
    label: "Manage Branches",
    description: "Add and edit showroom branches",
  },
  // "settings:manage" is deliberately absent — integration credentials and the showroom
  // location link are Admin-only and stripped server-side even if sent directly (see
  // excludeAdminOnlyPermissions in the API's users.service.ts).
  {
    key: "social:manage",
    label: "Manage Social Media",
    description: "Review, download, regenerate, and post the daily product graphic to Instagram/Facebook",
  },
];
