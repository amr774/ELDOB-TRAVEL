import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/request-with-user.type';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':carId')
  add(@Param('carId') carId: string, @Req() req: RequestWithUser) {
    return this.favoritesService.add(req.user.id, carId);
  }

  @Get('me')
  findMine(@Req() req: RequestWithUser) {
    return this.favoritesService.findMine(req.user.id);
  }

  @Delete(':carId')
  remove(@Param('carId') carId: string, @Req() req: RequestWithUser) {
    return this.favoritesService.remove(req.user.id, carId);
  }
}
