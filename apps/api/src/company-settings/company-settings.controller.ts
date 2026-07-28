import { BadRequestException, Body, Controller, Delete, Get, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";
import { CompanySettingsService } from "./company-settings.service";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Controller("settings/company")
@RequirePermissions("settings:manage")
export class CompanySettingsController {
  constructor(private companySettingsService: CompanySettingsService) {}

  @Get()
  get() {
    return this.companySettingsService.get();
  }

  @Put()
  update(@Body() dto: UpdateCompanySettingsDto) {
    return this.companySettingsService.update(dto);
  }

  @Post("logo")
  @UseInterceptors(
    FileInterceptor("logo", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_BYTES },
      fileFilter: (_req, file, callback) => {
        callback(null, IMAGE_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  setLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No valid image was uploaded (JPEG/PNG/WebP/SVG, max 2MB)");
    }
    return this.companySettingsService.setLogo(file);
  }

  @Delete("logo")
  removeLogo() {
    return this.companySettingsService.removeLogo();
  }
}
