export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchId: string | null;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

export type ProductStatus = "DRAFT" | "ACTIVE" | "DISCONTINUED";

export interface Product {
  id: string;
  sku: string;
  name: string;
  brandId: string;
  categoryId: string;
  modelNumber: string | null;
  description: string | null;
  price: string;
  images: string[];
  features: string[];
  manualUrl: string | null;
  status: ProductStatus;
  hsnCode: string | null;
  gstRate: string | null;
  brand?: Brand;
  category?: Category;
  stockLevels?: StockLevel[];
}

export interface StockLevel {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  branch?: Branch;
}

export type ProductUnitStatus = "IN_STOCK" | "SOLD" | "RETURNED";

export interface ProductUnit {
  id: string;
  serialNumber: string;
  productId: string;
  customerId: string | null;
  salesOrderId: string | null;
  status: ProductUnitStatus;
  soldAt: string | null;
  warrantyExpiresAt: string | null;
  product?: Product;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  source: string | null;
  gstin: string | null;
  state: string | null;
  shippingAddress: string | null;
  productUnits?: ProductUnit[];
  salesOrders?: SalesOrder[];
  serviceTickets?: ServiceTicket[];
  interactions?: Interaction[];
}

export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST";

export const LEAD_STAGES: LeadStage[] = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST"];

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  stage: LeadStage;
  notes: string | null;
  nextFollowUpAt: string | null;
  assignedToId: string;
  customerId: string | null;
  assignedTo?: { id: string; name: string };
}

export type B2BAccountType = "ARCHITECT" | "INTERIOR_DESIGNER" | "BUILDER" | "DEVELOPER";

export interface B2BContact {
  id: string;
  b2bAccountId: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
}

export interface B2BAccount {
  id: string;
  name: string;
  type: B2BAccountType;
  address: string | null;
  gstin: string | null;
  state: string | null;
  shippingAddress: string | null;
  ownerId: string;
  owner?: { id: string; name: string };
  contacts?: B2BContact[];
  opportunities?: Opportunity[];
  interactions?: Interaction[];
}

export type OpportunityStage =
  | "CONSULTATION"
  | "DESIGN_SUPPORT"
  | "PRODUCT_SELECTION"
  | "INSTALLATION"
  | "AFTER_SALES"
  | "LOST";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "CONSULTATION",
  "DESIGN_SUPPORT",
  "PRODUCT_SELECTION",
  "INSTALLATION",
  "AFTER_SALES",
  "LOST",
];

export interface Opportunity {
  id: string;
  title: string;
  b2bAccountId: string;
  stage: OpportunityStage;
  estimatedValue: string | null;
  expectedCloseDate: string | null;
  ownerId: string;
  b2bAccount?: B2BAccount;
  owner?: { id: string; name: string };
}

export type InteractionType = "CALL" | "MEETING" | "NOTE" | "EMAIL" | "WHATSAPP" | "OTHER";

export interface Interaction {
  id: string;
  type: InteractionType;
  subject: string | null;
  body: string | null;
  occurredAt: string;
  createdById: string;
  createdBy?: { id: string; name: string };
}

export type ServiceTicketStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface ServiceTicket {
  id: string;
  productUnitId: string;
  customerId: string;
  status: ServiceTicketStatus;
  issueDescription: string;
  resolutionNotes: string | null;
  assignedToId: string | null;
  scheduledAt: string | null;
  resolvedAt: string | null;
  productUnit?: ProductUnit;
  customer?: Customer;
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface QuoteItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  hsnCode: string | null;
  gstRate: string | null;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  product?: Product;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  customerId: string | null;
  b2bAccountId: string | null;
  quoteDate: string;
  validUntil: string | null;
  placeOfSupplyState: string | null;
  shippingAddress: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  templateId: string;
  subtotal: string;
  discount: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  roundingAdjustment: string;
  total: string;
  items: QuoteItem[];
  customer?: Customer;
  b2bAccount?: B2BAccount;
  salesOrder?: { id: string } | null;
}

export interface CompanySettings {
  legalName: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  bankBranch: string | null;
  defaultTermsAndConditions: string | null;
  defaultNotes: string | null;
}

export type SalesOrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

export interface SalesOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  hsnCode: string | null;
  gstRate: string | null;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  product?: Product;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  dueDate: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: string;
  paidAt: string;
  reference: string | null;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  customerId: string | null;
  b2bAccountId: string | null;
  branchId: string;
  subtotal: string;
  discount: string;
  total: string;
  placeOfSupplyState: string | null;
  shippingAddress: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  roundingAdjustment: string;
  createdAt: string;
  items: SalesOrderItem[];
  productUnits?: ProductUnit[];
  invoice?: Invoice;
  customer?: Customer;
  b2bAccount?: B2BAccount;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roleId: string;
  branchId: string | null;
  permissions: string[];
  role: { id: string; name: string };
  branch: { id: string; name: string } | null;
}

export type IntegrationProviderName = "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "AI_IMAGE";

export interface IntegrationSetting {
  provider: IntegrationProviderName;
  isActive: boolean;
  configured: boolean;
  fields: Record<string, string> | null;
}

export interface SiteSettings {
  mapsUrl: string | null;
}

export interface SimulateWhatsAppResult {
  replyText: string;
  customerId?: string;
  leadId?: string;
}

export type SocialPostStatus = "PENDING_REVIEW" | "POSTED" | "DISCARDED";

export interface SocialPost {
  id: string;
  productId: string;
  caption: string;
  status: SocialPostStatus;
  postedToInstagramAt: string | null;
  postedToFacebookAt: string | null;
  instagramError: string | null;
  facebookError: string | null;
  generatedAt: string;
  product?: Product;
}

export type ReviewRequestStatus = "REQUESTED" | "RECEIVED";

export interface ProductReview {
  id: string;
  customerId: string;
  productId: string;
  productUnitId: string;
  status: ReviewRequestStatus;
  rating: number | null;
  comment: string | null;
  requestedAt: string;
  respondedAt: string | null;
  customer?: { id: string; name: string; phone: string };
  product?: { id: string; name: string; brand?: { id: string; name: string } };
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface LeadsTimeseries {
  daily: DailyPoint[];
  total: number;
}

export interface SalesTimeseries {
  daily: DailyPoint[];
  total: number;
  brands: { id: string; name: string }[];
}

export interface ConversionsTimeseries {
  daily: DailyPoint[];
  total: number;
  totalLeads: number;
}

export interface OrdersTimeseries {
  daily: DailyPoint[];
  total: number;
  totalRevenue: number;
  byStatus: { status: string; count: number }[];
}

export interface StageBreakdown {
  byStage: { stage: string; count: number }[];
  total: number;
}

export interface StatusBreakdown {
  byStatus: { status: string; count: number }[];
  total: number;
}
