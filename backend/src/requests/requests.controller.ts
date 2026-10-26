import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/request-with-user.type';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './request.dto';
@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}
  @Post() create(@Body() dto: CreateRequestDto, @Req() req: RequestWithUser) {
    return this.requests.create(dto, req.user.id);
  }
  @Get('me') mine(@Req() req: RequestWithUser) {
    return this.requests.mine(req.user.id);
  }
  @Patch(':id/cancel') cancel(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.requests.cancel(id, req.user.id);
  }
}
