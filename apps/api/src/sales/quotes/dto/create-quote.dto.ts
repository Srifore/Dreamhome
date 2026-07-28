import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";
import { NewCustomerInputDto } from "./new-customer-input.dto";
import { QuoteItemInputDto } from "./quote-item-input.dto";

export class CreateQuoteDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  // Quick-add path — provide instead of customerId to create the customer as part of saving the
  // quote. See QuotesService.create.
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerInputDto)
  newCustomer?: NewCustomerInputDto;

  @IsOptional()
  @IsString()
  b2bAccountId?: string;

  // Lets the person creating the quote fill in/correct an existing customer's or B2B account's
  // GSTIN on the spot, without needing separate CRM-edit access. See QuotesService.create.
  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsOptional()
  @IsString()
  b2bAccountGstin?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsDateString()
  quoteDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  // Defaults to the selected customer's/B2B account's `state` when omitted — see
  // QuotesService.resolvePlaceOfSupplyState.
  @IsOptional()
  @IsString()
  placeOfSupplyState?: string;

  // Defaults to the selected customer's/B2B account's `shippingAddress` (or billing address) when
  // omitted — see QuotesService.resolveShippingAddress.
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  // Visual layout for the printed/PDF document — see apps/web/src/lib/quote-templates.ts. Defaults
  // to "standard" when omitted.
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items: QuoteItemInputDto[];
}
