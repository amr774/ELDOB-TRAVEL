import { Module } from '@nestjs/common';
import { HotelsModule } from './hotels/hotels.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FavoritesModule } from './favorites/favorites.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { OperationsModule } from './operations/operations.module';
import { PaymentsController } from './payments/payments.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [
    HotelsModule,
    OperationsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    CarsModule,
    BookingsModule,
    ReviewsModule,
    FavoritesModule,
    DashboardModule,
    UploadsModule,
  ],
  controllers: [AppController, PaymentsController, HealthController],
  providers: [AppService],
})
export class AppModule {}
