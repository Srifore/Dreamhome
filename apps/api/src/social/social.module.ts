import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { SocialPostsController } from "./social-posts.controller";
import { SocialPostImageController } from "./social-post-image.controller";
import { SocialPostsService } from "./social-posts.service";
import { ImageComposerService } from "./image-composer.service";
import { CaptionComposerService } from "./caption-composer.service";
import { AiImageService } from "./ai-image.service";

@Module({
  imports: [SettingsModule],
  controllers: [SocialPostsController, SocialPostImageController],
  providers: [SocialPostsService, ImageComposerService, CaptionComposerService, AiImageService],
})
export class SocialModule {}
