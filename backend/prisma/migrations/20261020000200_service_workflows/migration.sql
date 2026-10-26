ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
ALTER TABLE "User" ADD COLUMN "operationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Car" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN "category" TEXT, ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "pickupLocation" TEXT, ADD COLUMN "notes" TEXT;
CREATE TYPE "RequestKind" AS ENUM ('TRIP', 'HOTEL', 'INQUIRY');
CREATE TABLE "ServiceRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
  "kind" "RequestKind" NOT NULL, "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "city" TEXT, "pickupLocation" TEXT, "destination" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3),
  "passengers" INTEGER, "rooms" INTEGER, "preference" TEXT, "notes" TEXT, "reply" TEXT, "quotedPrice" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceRequest_userId_createdAt_idx" ON "ServiceRequest"("userId", "createdAt");
CREATE INDEX "ServiceRequest_kind_status_idx" ON "ServiceRequest"("kind", "status");
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY, "bookingId" TEXT, "requestId" TEXT, "amount" INTEGER NOT NULL,
  "reference" TEXT NOT NULL, "recordedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Payment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Payment_one_target" CHECK (("bookingId" IS NOT NULL)::integer + ("requestId" IS NOT NULL)::integer = 1),
  CONSTRAINT "Payment_positive_amount" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
