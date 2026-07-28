import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get("health")
  health(): Promise<{ status: string }> {
    return this.appService.checkHealth();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
