import type { Booking, ServiceRequest } from '../types';
export function matchesSearch(search: string, values: (string | undefined)[]) {
  const query = search.trim().toLocaleLowerCase();
  return (
    !query || values.some((value) => value?.toLocaleLowerCase().includes(query))
  );
}
export function filterRequests(
  requests: ServiceRequest[],
  search: string,
  kind: string,
  status: string,
) {
  return requests.filter(
    (r) =>
      (!kind || r.kind === kind) &&
      (!status || r.status === status) &&
      matchesSearch(search, [
        r.id,
        r.user?.fullName,
        r.user?.email,
        r.city,
        r.pickupLocation,
        r.destination,
        r.notes,
      ]),
  );
}
export function filterBookings(
  bookings: Booking[],
  search: string,
  status: string,
) {
  return bookings.filter(
    (b) =>
      (!status || b.status === status) &&
      matchesSearch(search, [
        b.id,
        b.user?.fullName,
        b.user?.email,
        b.car.name,
        b.pickupLocation,
      ]),
  );
}
