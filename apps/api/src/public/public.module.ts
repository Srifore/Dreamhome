import { Module } from "@nestjs/common";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [SiteSettingsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
