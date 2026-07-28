import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException("A brand with this name already exists");
    }
    return this.prisma.brand.create({ data: dto });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException("A brand with this name already exists");
      }
    }
    return this.prisma.brand.update({ where: { id }, data: dto });
  }
}
