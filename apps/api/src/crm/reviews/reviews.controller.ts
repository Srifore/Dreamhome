import { Controller, Get } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";

/** Read-only — reviews are captured automatically by the WhatsApp bot's post-purchase check-in,
 *  never written by staff, so there's no create/update endpoint here. */
@Controller("crm/reviews")
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }
}
