import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { CreateEnquiryDto } from "./dto/create-enquiry.dto";
import { PublicService } from "./public.service";

@Public()
@Controller("public")
export class PublicController {
  constructor(
    private publicService: PublicService,
    private siteSettingsService: SiteSettingsService,
  ) {}

  @Get("site-settings")
  getSiteSettings() {
    return this.siteSettingsService.get();
  }

  @Get("brands")
  listBrands() {
    return this.publicService.listBrands();
  }

  @Get("categories")
  listCategories() {
    return this.publicService.listCategories();
  }

  @Get("products")
  listProducts(
    @Query("categorySlug") categorySlug?: string,
    @Query("brandId") brandId?: string,
    @Query("search") search?: string,
  ) {
    return this.publicService.listProducts({ categorySlug, brandId, search });
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string) {
    return this.publicService.getProduct(id);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post("enquiries")
  createEnquiry(@Body() dto: CreateEnquiryDto) {
    return this.publicService.createEnquiry(dto);
  }
}
