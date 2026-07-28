import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { B2BAccountsService } from "./b2b-accounts.service";
import { CreateB2BAccountDto } from "./dto/create-b2b-account.dto";
import { UpdateB2BAccountDto } from "./dto/update-b2b-account.dto";
import { CreateB2BContactDto } from "./dto/create-b2b-contact.dto";

@Controller("crm/b2b-accounts")
export class B2BAccountsController {
  constructor(private b2bAccountsService: B2BAccountsService) {}

  @Get()
  findAll() {
    return this.b2bAccountsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.b2bAccountsService.findOne(id);
  }

  @Post()
  @RequirePermissions("crm:write")
  create(@Body() dto: CreateB2BAccountDto) {
    return this.b2bAccountsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("crm:write")
  update(@Param("id") id: string, @Body() dto: UpdateB2BAccountDto) {
    return this.b2bAccountsService.update(id, dto);
  }

  @Post(":id/contacts")
  @RequirePermissions("crm:write")
  addContact(@Param("id") id: string, @Body() dto: CreateB2BContactDto) {
    return this.b2bAccountsService.addContact(id, dto);
  }
}
