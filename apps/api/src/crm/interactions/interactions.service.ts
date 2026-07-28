import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateInteractionDto } from "./dto/create-interaction.dto";

interface InteractionFilter {
  customerId?: string;
  leadId?: string;
  b2bAccountId?: string;
  opportunityId?: string;
}

@Injectable()
export class InteractionsService {
  constructor(private prisma: PrismaService) {}

  findByTarget(filter: InteractionFilter) {
    const { customerId, leadId, b2bAccountId, opportunityId } = filter;
    if (!customerId && !leadId && !b2bAccountId && !opportunityId) {
      throw new BadRequestException(
        "At least one of customerId, leadId, b2bAccountId, or opportunityId is required",
      );
    }

    return this.prisma.interaction.findMany({
      where: { customerId, leadId, b2bAccountId, opportunityId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
    });
  }

  create(dto: CreateInteractionDto, createdById: string) {
    const { customerId, leadId, b2bAccountId, opportunityId } = dto;
    if (!customerId && !leadId && !b2bAccountId && !opportunityId) {
      throw new BadRequestException(
        "An interaction must be linked to a customer, lead, b2bAccount, or opportunity",
      );
    }

    return this.prisma.interaction.create({
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        createdById,
      },
    });
  }
}
