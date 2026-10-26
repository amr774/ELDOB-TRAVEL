-- Separate migration so PostgreSQL commits the enum value before using it.
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';
