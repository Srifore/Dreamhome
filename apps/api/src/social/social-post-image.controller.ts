import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { SocialPostsService } from "./social-posts.service";

@Public()
@Controller("social-posts")
export class SocialPostImageController {
  constructor(private socialPostsService: SocialPostsService) {}

  /**
   * Public so Meta's servers (and plain <img>/download links) can fetch the image directly.
   * The API runs on a different origin than the CRM, so a plain <a download> link is silently
   * ignored by the browser (that attribute only forces a save prompt for same-origin resources) —
   * it just navigates to the image instead. `?download=1` opts into a Content-Disposition header,
   * which does force the save prompt regardless of origin, without changing plain <img> rendering
   * or Meta's fetch-and-post behavior (both ignore Content-Disposition).
   */
  @Get(":id/image")
  async getImage(@Param("id") id: string, @Query("download") download: string | undefined, @Res() res: Response) {
    const buffer = await this.socialPostsService.getImageBuffer(id);
    res.setHeader("Content-Type", "image/jpeg");
    if (download) {
      res.setHeader("Content-Disposition", `attachment; filename="dreamhome-post-${id}.jpg"`);
    }
    res.send(buffer);
  }
}
