import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.opportunity.findMany({
      include: {
        b2bAccount: { select: { id: true, name: true, type: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        b2bAccount: true,
        owner: { select: { id: true, name: true } },
        interactions: { orderBy: { occurredAt: "desc" } },
      },
    });
    if (!opportunity) {
      throw new NotFoundException("Opportunity not found");
    }
    return opportunity;
  }

  create(dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({ data: dto });
  }

  async update(id: string, dto: UpdateOpportunityDto) {
    await this.findOne(id);
    return this.prisma.opportunity.update({ where: { id }, data: dto });
  }
}
