import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateB2BAccountDto } from "./dto/create-b2b-account.dto";
import { UpdateB2BAccountDto } from "./dto/update-b2b-account.dto";
import { CreateB2BContactDto } from "./dto/create-b2b-contact.dto";

@Injectable()
export class B2BAccountsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.b2BAccount.findMany({
      include: { owner: { select: { id: true, name: true } }, contacts: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.b2BAccount.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: true,
        opportunities: true,
        interactions: { orderBy: { occurredAt: "desc" } },
      },
    });
    if (!account) {
      throw new NotFoundException("B2B account not found");
    }
    return account;
  }

  create(dto: CreateB2BAccountDto) {
    return this.prisma.b2BAccount.create({ data: dto });
  }

  async update(id: string, dto: UpdateB2BAccountDto) {
    await this.findOne(id);
    return this.prisma.b2BAccount.update({ where: { id }, data: dto });
  }

  async addContact(b2bAccountId: string, dto: CreateB2BContactDto) {
    await this.findOne(b2bAccountId);
    return this.prisma.b2BContact.create({ data: { ...dto, b2bAccountId } });
  }
}
