import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        productUnits: { include: { product: { include: { brand: true } } } },
        salesOrders: { include: { items: true, invoice: true } },
        serviceTickets: true,
        interactions: { orderBy: { occurredAt: "desc" } },
      },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException("A customer with this phone number already exists");
    }
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    if (dto.phone) {
      const existing = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
      if (existing && existing.id !== id) {
        throw new ConflictException("A customer with this phone number already exists");
      }
    }
    return this.prisma.customer.update({ where: { id }, data: dto });
  }
}
