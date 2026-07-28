import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { LeadStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.lead.findMany({
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        interactions: { orderBy: { occurredAt: "desc" } },
      },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found");
    }
    return lead;
  }

  async create(dto: CreateLeadDto) {
    await this.assertActiveUser(dto.assignedToId);
    return this.prisma.lead.create({ data: dto });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    if (dto.assignedToId) {
      await this.assertActiveUser(dto.assignedToId);
    }
    // A lead closed out (Won or Lost) has no future call to schedule, so any follow-up date
    // it's carrying is stale — clear it rather than leaving dead data that could resurface if a
    // future query on nextFollowUpAt forgets to filter out closed stages.
    const closingOut = dto.stage === LeadStage.WON || dto.stage === LeadStage.LOST;
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        nextFollowUpAt: closingOut
          ? null
          : dto.nextFollowUpAt === null
            ? null
            : dto.nextFollowUpAt
              ? new Date(dto.nextFollowUpAt)
              : undefined,
      },
    });
  }

  private async assertActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException("Cannot assign to an inactive or unknown user");
    }
  }

  /** Converts a won lead into a retail Customer record, linking the two. */
  async convertToCustomer(id: string) {
    const lead = await this.findOne(id);

    if (lead.customerId) {
      throw new ConflictException("Lead has already been converted to a customer");
    }

    const existingCustomer = await this.prisma.customer.findUnique({
      where: { phone: lead.phone },
    });

    const customer =
      existingCustomer ??
      (await this.prisma.customer.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
        },
      }));

    return this.prisma.lead.update({
      where: { id },
      data: { customerId: customer.id, stage: LeadStage.WON, nextFollowUpAt: null },
      include: { customer: true },
    });
  }
}
