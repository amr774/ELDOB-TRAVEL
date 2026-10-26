import { cairoDateTime } from '../../utils/dates';

// Names/codes checked against https://zasair.com/locations.php on 2026-10-21.
// A selection is a quotation request, not a guarantee of airport service availability.
export const airports = [
  ['CAI', 'Cairo International', 'القاهرة الدولي'],
  ['SPX', 'Sphinx International — Giza', 'سفنكس الدولي — الجيزة'],
  ['HBE', 'Borg El Arab — Alexandria', 'برج العرب — الإسكندرية'],
  ['HRG', 'Hurghada International', 'الغردقة الدولي'],
  ['SSH', 'Sharm El Sheikh International', 'شرم الشيخ الدولي'],
  ['RMF', 'Marsa Alam International', 'مرسى علم الدولي'],
  ['LXR', 'Luxor International', 'الأقصر الدولي'],
  ['ASW', 'Aswan International', 'أسوان الدولي'],
  ['ATZ', 'Assiut', 'أسيوط'],
  ['HMB', 'Sohag International', 'سوهاج الدولي'],
  ['MUH', 'Marsa Matruh', 'مرسى مطروح'],
  ['DBB', 'El Alamein International', 'العلمين الدولي'],
  ['TCP', 'Taba International', 'طابا الدولي'],
  ['ABS', 'Abu Simbel', 'أبو سمبل'],
] as const;
export const cities = [
  ['Cairo', 'القاهرة'],
  ['Giza', 'الجيزة'],
  ['Alexandria', 'الإسكندرية'],
  ['Hurghada', 'الغردقة'],
  ['El Gouna', 'الجونة'],
  ['Sharm El Sheikh', 'شرم الشيخ'],
  ['Dahab', 'دهب'],
  ['Marsa Alam', 'مرسى علم'],
  ['Luxor', 'الأقصر'],
  ['Aswan', 'أسوان'],
  ['North Coast', 'الساحل الشمالي'],
  ['Marsa Matruh', 'مرسى مطروح'],
] as const;
export type Service = 'airport' | 'trip' | 'hotel' | 'inquiry';
export type JourneyFields = {
  airport: string;
  direction: string;
  address: string;
  flight: string;
  terminal: string;
  flightDate: string;
  flightTime: string;
  luggage: number;
  purpose: string;
  pickupLocation: string;
  destination: string;
  city: string;
  date: string;
  time: string;
  endDate: string;
  passengers: number;
  rooms: number;
  preference: string;
  notes: string;
  returnTrip: boolean;
  returnDate: string;
  returnTime: string;
  children: number;
  childAges: string;
  meal: string;
  budget: string;
  contactPhone: string;
  contactName: string;
  contactEmail: string;
};
export const defaults: JourneyFields = {
  airport: '',
  direction: 'arrival',
  address: '',
  flight: '',
  terminal: '',
  flightDate: '',
  flightTime: '',
  luggage: 1,
  purpose: 'Private journey / رحلة خاصة',
  pickupLocation: '',
  destination: '',
  city: '',
  date: '',
  time: '',
  endDate: '',
  passengers: 1,
  rooms: 1,
  preference: '',
  notes: '',
  returnTrip: false,
  returnDate: '',
  returnTime: '',
  children: 0,
  childAges: '',
  meal: '',
  budget: '',
  contactPhone: '',
  contactName: '',
  contactEmail: '',
};
export function egyptToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join('-');
}
function requireValue(value: string, message: string) {
  if (!value?.trim()) throw new Error(message);
}
export type RequestPayload = {
  kind: 'TRIP' | 'HOTEL' | 'INQUIRY';
  notes: string;
  pickupLocation?: string;
  destination?: string;
  city?: string;
  rooms?: number;
  startDate?: string;
  endDate?: string;
  passengers?: number;
  preference?: string;
};
export function buildRequest(
  service: Service,
  v: JourneyFields,
  now = new Date(),
): RequestPayload {
  if (service === 'inquiry') {
    requireValue(v.notes, 'Please enter your message / اكتب رسالتك');
    requireValue(v.contactName, 'Enter your name / أدخل اسمك');
    if (!v.contactEmail.trim() && !v.contactPhone.trim())
      throw new Error('Enter an email or phone / أدخل بريداً إلكترونياً أو رقم هاتف');
    if (v.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail.trim()))
      throw new Error('Enter a valid email / أدخل بريداً إلكترونياً صحيحاً');
    if (v.contactPhone.trim() && !/^\+?[\d ()-]{7,40}$/.test(v.contactPhone.trim()))
      throw new Error('Enter a valid phone / أدخل رقم هاتف صحيح');
    const notes = [
      `Name / الاسم: ${v.contactName.trim()}`,
      ...(v.contactEmail.trim() ? [`Email / البريد الإلكتروني: ${v.contactEmail.trim()}`] : []),
      ...(v.contactPhone.trim() ? [`Phone / الهاتف: ${v.contactPhone.trim()}`] : []),
      '',
      v.notes.trim(),
    ].join('\n');
    if (notes.length > 3000)
      throw new Error('Please shorten your message / يرجى اختصار الرسالة');
    return { kind: 'INQUIRY', notes };
  }
  const hotel = service === 'hotel';
  const startDate = hotel ? v.date : cairoDateTime(v.date, v.time);
  if (
    !startDate ||
    !Number.isFinite(Date.parse(startDate)) ||
    new Date(startDate) <= now
  )
    throw new Error('Choose a future date and time / اختر موعداً في المستقبل');
  if (
    hotel &&
    (!v.endDate ||
      !Number.isFinite(Date.parse(v.endDate)) ||
      v.endDate <= v.date)
  )
    throw new Error('Check-out must follow check-in / المغادرة بعد الوصول');
  const passengers = Number(v.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 100)
    throw new Error('Choose 1–100 guests / اختر من ١ إلى ١٠٠ ضيف');
  requireValue(
    v.contactPhone,
    'Enter a contact phone number / أدخل رقم هاتف للتواصل',
  );
  if (!/^\+?[\d ()-]{7,40}$/.test(v.contactPhone.trim()))
    throw new Error('Enter a valid contact phone / أدخل رقم هاتف صحيح');
  const count = Number(hotel ? v.children : v.luggage);
  if (!Number.isInteger(count) || count < 0 || count > (hotel ? 99 : 100))
    throw new Error(
      'Check the children or luggage count / راجع عدد الأطفال أو الحقائب',
    );
  const details = [
    `Service / الخدمة: ${service === 'airport' ? 'Airport transfer / توصيل مطار' : hotel ? 'Hotel stay / إقامة فندقية' : v.purpose}`,
    `Contact phone / هاتف التواصل: ${v.contactPhone.trim()}`,
  ];
  let pickupLocation = v.pickupLocation?.trim(),
    destination = v.destination?.trim();
  if (service === 'airport') {
    if (!['arrival', 'departure'].includes(v.direction))
      throw new Error('Select arrival or departure / اختر وصول أو مغادرة');
    const airport = airports.find((a) => a[0] === v.airport);
    if (!airport) throw new Error('Select an airport / اختر المطار');
    requireValue(
      v.address,
      'Enter the hotel or street address / أدخل اسم الفندق أو العنوان',
    );
    const airportName = `${airport[1]} (${airport[0]}) / ${airport[2]}`;
    const arrival = v.direction === 'arrival';
    pickupLocation = arrival ? airportName : v.address.trim();
    destination = arrival ? v.address.trim() : airportName;
    const flightDate = cairoDateTime(v.flightDate, v.flightTime);
    if (
      (arrival && flightDate > startDate) ||
      (!arrival && flightDate <= startDate)
    )
      throw new Error(
        'Pickup must be after landing or before departure / الاستقبال بعد الوصول أو التوصيل قبل الإقلاع',
      );
    details.push(
      `Transfer / الاتجاه: ${arrival ? 'Arrival / وصول' : 'Departure / مغادرة'}`,
      `Flight / الرحلة: ${v.flight.trim() || 'Not known yet / غير معروف بعد'}`,
      `Flight local time / موعد الطيران بتوقيت مصر: ${v.flightDate} ${v.flightTime}`,
      `Terminal / الصالة: ${v.terminal.trim() || 'To be confirmed / يتم التأكيد'}`,
    );
  }
  if (!hotel) {
    requireValue(
      pickupLocation,
      'Enter a pickup address / أدخل عنوان الانطلاق',
    );
    requireValue(destination, 'Enter a destination / أدخل الوجهة');
    if (pickupLocation.toLowerCase() === destination.toLowerCase())
      throw new Error(
        'Pickup and destination must differ / اختر وجهتين مختلفتين',
      );
    details.push(
      `Pickup local time / الانطلاق بتوقيت مصر: ${v.date} ${v.time}`,
      `Large suitcases / الحقائب الكبيرة: ${Number(v.luggage)}`,
    );
    if (v.returnTrip) {
      const returnDate = cairoDateTime(v.returnDate, v.returnTime);
      if (returnDate <= startDate)
        throw new Error(
          'Return pickup must be later / موعد العودة يجب أن يكون لاحقاً',
        );
      details.push(
        `Return requested / مطلوب عودة: ${v.returnDate} ${v.returnTime} (Egypt / مصر)`,
        'Return route / مسار العودة: reverse of outward journey / عكس رحلة الذهاب',
      );
    }
  } else {
    requireValue(v.city, 'Enter a city in Egypt / أدخل مدينة في مصر');
    if (
      !Number.isInteger(Number(v.rooms)) ||
      Number(v.rooms) < 1 ||
      Number(v.rooms) > 50
    )
      throw new Error('Choose 1–50 rooms / اختر من ١ إلى ٥٠ غرفة');
    if (Number(v.children) >= passengers)
      throw new Error('Include at least one adult / يجب وجود شخص بالغ');
    if (Number(v.children) > 0) {
      const ages = v.childAges.split(/[,،]/).map((s) => s.trim());
      if (
        ages.length !== Number(v.children) ||
        ages.some((a) => !/^\d{1,2}$/.test(a) || Number(a) > 17)
      )
        throw new Error(
          'Enter one age (0–17) per child, separated by commas / أدخل عمر كل طفل من ٠ إلى ١٧ مفصولاً بفاصلة',
        );
    }
    details.push(
      `Children / الأطفال: ${Number(v.children)}`,
      `Child ages / أعمار الأطفال: ${Number(v.children) ? v.childAges : '—'}`,
      `Meal preference / الوجبات: ${v.meal || 'Flexible / مرن'}`,
      `Budget per room per night (EGP) / ميزانية الغرفة لليلة بالجنيه: ${v.budget || 'Flexible / مرنة'}`,
    );
  }
  if (v.notes.trim())
    details.push(`Special requests / طلبات خاصة:\n${v.notes.trim()}`);
  const notes = details.join('\n');
  if (notes.length > 3000)
    throw new Error('Please shorten your notes / يرجى اختصار الملاحظات');
  return {
    kind: hotel ? 'HOTEL' : 'TRIP',
    ...(hotel
      ? { city: v.city.trim(), rooms: Number(v.rooms), endDate: v.endDate }
      : { pickupLocation, destination }),
    startDate,
    passengers,
    preference: v.preference.trim(),
    notes,
  };
}
