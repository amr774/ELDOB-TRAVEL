import { Module } from '@nestjs/common';
import { RequestsController } from '../requests/requests.controller';
import { RequestsService } from '../requests/requests.service';
import { OperationsController } from './operations.controller';
import { BookingsService } from '../bookings/bookings.service';
@Module({
  controllers: [RequestsController, OperationsController],
  providers: [RequestsService, BookingsService],
})
export class OperationsModule {}
