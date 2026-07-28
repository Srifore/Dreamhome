import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import * as Joi from "joi";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { EncryptionModule } from "./common/crypto/encryption.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { BranchesModule } from "./branches/branches.module";
import { InventoryModule } from "./inventory/inventory.module";
import { CrmModule } from "./crm/crm.module";
import { SalesModule } from "./sales/sales.module";
import { PublicModule } from "./public/public.module";
import { SettingsModule } from "./settings/settings.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { SocialModule } from "./social/social.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SiteSettingsModule } from "./site-settings/site-settings.module";
import { CompanySettingsModule } from "./company-settings/company-settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fails fast at boot on missing/malformed config instead of an opaque runtime
      // crash the first time the affected code path runs.
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRES_IN_SECONDS: Joi.number().default(900),
        JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(604800),
        // AES-256 key: 32 bytes, hex-encoded = 64 hex characters.
        INTEGRATIONS_ENCRYPTION_KEY: Joi.string().hex().length(64).required(),
        PORT: Joi.number().default(3001),
        CORS_ALLOWED_ORIGINS: Joi.string().allow("").optional(),
      }),
      validationOptions: { abortEarly: false },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // Serves uploaded product images/manuals as plain public files — these need to be visible
    // on the public website, so (like the social-post images) they intentionally sit outside
    // the auth/permission guard system entirely.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
    }),
    PrismaModule,
    EncryptionModule,
    AuthModule,
    UsersModule,
    RolesModule,
    BranchesModule,
    InventoryModule,
    CrmModule,
    SalesModule,
    PublicModule,
    SettingsModule,
    WhatsAppModule,
    SocialModule,
    DashboardModule,
    SiteSettingsModule,
    CompanySettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: cheapest/broadest rejection first, then auth, then fine-grained
    // permission checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
