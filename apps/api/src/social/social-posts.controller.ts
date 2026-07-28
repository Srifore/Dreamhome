import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { GenerateSocialPostDto } from "./dto/generate-social-post.dto";
import { SocialPostsService } from "./social-posts.service";

@Controller("social-posts")
@RequirePermissions("social:manage")
export class SocialPostsController {
  constructor(private socialPostsService: SocialPostsService) {}

  @Get()
  findAll() {
    return this.socialPostsService.findAll();
  }

  @Get("latest-pending")
  findLatestPending() {
    return this.socialPostsService.findLatestPending();
  }

  @Post("generate")
  generate(@Body() dto: GenerateSocialPostDto) {
    return this.socialPostsService.generate(dto.productId);
  }

  @Post(":id/regenerate")
  regenerate(@Param("id") id: string) {
    return this.socialPostsService.regenerate(id);
  }

  @Post(":id/proceed")
  proceed(@Param("id") id: string) {
    return this.socialPostsService.proceed(id);
  }
}
