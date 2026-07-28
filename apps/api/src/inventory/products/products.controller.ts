import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { RemoveImageDto } from "./dto/remove-image.dto";
import { ProductsService } from "./products.service";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MANUAL_BYTES = 20 * 1024 * 1024;

@Controller("inventory/products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermissions("inventory:write")
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("inventory:write")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("inventory:write")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }

  @Post(":id/images")
  @RequirePermissions("inventory:write")
  @UseInterceptors(
    FilesInterceptor("images", 8, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, callback) => {
        callback(null, IMAGE_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  addImages(@Param("id") id: string, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException("No valid image files were uploaded (JPEG/PNG/WebP, max 5MB each)");
    }
    return this.productsService.addImages(id, files);
  }

  @Delete(":id/images")
  @RequirePermissions("inventory:write")
  removeImage(@Param("id") id: string, @Body() dto: RemoveImageDto) {
    return this.productsService.removeImage(id, dto.url);
  }

  @Post(":id/manual")
  @RequirePermissions("inventory:write")
  @UseInterceptors(
    FileInterceptor("manual", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MANUAL_BYTES },
      fileFilter: (_req, file, callback) => {
        callback(null, file.mimetype === "application/pdf");
      },
    }),
  )
  setManual(@Param("id") id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No valid PDF was uploaded (max 20MB)");
    }
    return this.productsService.setManual(id, file);
  }

  @Delete(":id/manual")
  @RequirePermissions("inventory:write")
  removeManual(@Param("id") id: string) {
    return this.productsService.removeManual(id);
  }
}
