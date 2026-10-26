import { useState } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plane,
  Route,
  Building2,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import { Feedback, PageTitle } from '../components/ui';
import type { ServiceRequest } from '../types';
import {
  airports,
  cities,
  defaults,
  egyptToday,
  buildRequest,
  type Service,
  type JourneyFields,
} from '../features/requests/journeys';

export function RequestForm({ inquiry = false }: { inquiry?: boolean }) {
  const { kind } = useParams();
  const [params] = useSearchParams();
  if (!inquiry && !['airport', 'trip', 'hotel'].includes(kind || ''))
    return (
      <section className="section">
        <h1>404</h1>
        <Link to="/services">Services / الخدمات</Link>
      </section>
    );
  const service: Service = inquiry
    ? 'inquiry'
    : kind === 'hotel'
      ? 'hotel'
      : kind === 'airport'
        ? 'airport'
        : 'trip';
  // Remount on service changes: hotel and airport fields must never leak into other requests.
  return (
    <JourneyForm
      key={`${service}-${params.get('purpose') || params.get('stay') || ''}`}
      service={service}
      purpose={params.get('purpose') || params.get('stay')}
    />
  );
}
function JourneyForm({
  service,
  purpose,
}: {
  service: Service;
  purpose: string | null;
}) {
  const hotel = service === 'hotel',
    airport = service === 'airport',
    inquiry = service === 'inquiry';
  const { t } = useLanguage();
  const { user } = useAuth();
  const cache = useQueryClient();
  const draftKey = `eldob-request-${service}`;
  const [initial] = useState(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (raw && Date.now() - raw.savedAt < 30 * 60 * 1000)
        return { ...defaults, ...raw.fields } as JourneyFields;
      sessionStorage.removeItem(draftKey);
    } catch {
      /* Storage is optional; the form also works without it. */
    }
    return {
      ...defaults,
      contactPhone: user?.phone || '',
      contactName: user?.fullName || '',
      contactEmail: user?.email || '',
      notes:
        inquiry && purpose === 'apartment'
          ? 'Luxury apartment inquiry / استفسار عن شقة فاخرة\n'
          : '',
      purpose:
        purpose === 'business'
          ? 'Business / أعمال'
          : purpose === 'group'
            ? 'Family or group / عائلة أو مجموعة'
            : defaults.purpose,
    };
  });
  const { register, handleSubmit, watch, getValues } = useForm<JourneyFields>({
    defaultValues: initial,
  });
  const [review, setReview] = useState<ReturnType<typeof buildRequest> | null>(
    null,
  );
  const [validation, setValidation] = useState('');
  const [draftError, setDraftError] = useState('');
  const values = watch();
  const submit = useMutation({
    mutationFn: (payload: ReturnType<typeof buildRequest>) =>
      api.post<ServiceRequest>('/requests', payload),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['requests'] });
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* No persistent draft. */
      }
    },
  });
  const titles = {
    airport: t(
      'A smooth arrival. An effortless departure.',
      'وصول مريح. ومغادرة بلا عناء.',
    ),
    trip: t('Your journey, thoughtfully arranged.', 'رحلتك، بترتيبات تناسبك.'),
    hotel: t('Find your place to unwind.', 'إقامة على راحتك.'),
    inquiry: t('How can we help?', 'كيف نساعدك؟'),
  };
  const today = egyptToday();
  const field = (
    name: keyof JourneyFields,
    label: string,
    type = 'text',
    required = true,
    maxLength = 300,
  ) => (
    <label key={name}>
      {label}
      <input
        {...register(name)}
        type={type}
        required={required}
        maxLength={maxLength}
        min={type === 'date' ? today : undefined}
      />
    </label>
  );
  const count = (
    name: keyof JourneyFields,
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        {...register(name)}
        type="number"
        required
        min={min}
        max={max}
        step="1"
      />
    </label>
  );
  const options = (
    name: keyof JourneyFields,
    label: string,
    items: string[][],
    required = false,
  ) => (
    <label>
      {label}
      <select {...register(name)} required={required}>
        {items.map(([value, en, ar]) => (
          <option key={value} value={value}>
            {t(en, ar)}
          </option>
        ))}
      </select>
    </label>
  );
  const next = (v: JourneyFields) => {
    setValidation('');
    try {
      setReview(buildRequest(service, v));
      submit.reset();
    } catch (e) {
      setValidation(
        e instanceof Error
          ? e.message
          : t('Check your details.', 'راجع التفاصيل.'),
      );
    }
  };
  const saveDraft = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ savedAt: Date.now(), fields: getValues() }),
      );
    } catch {
      e.preventDefault();
      setDraftError(
        t(
          'Your browser cannot save this draft. Open sign-in in a new tab, then return here.',
          'المتصفح لا يستطيع حفظ الطلب. افتح تسجيل الدخول في تبويب جديد ثم عد هنا.',
        ),
      );
    }
  };
  const loginUrl = `/login?next=${encodeURIComponent(inquiry ? '/contact' : `/requests/${service}`)}`;
  if (submit.isSuccess)
    return (
      <section className="section request-success" role="status">
        <CheckCircle2 size={44} />
        <h1>{t('Your plans are in good hands.', 'استلمنا طلبك.')}</h1>
        <p>
          {t(
            'Your request is pending review. Our team will confirm availability and send a quotation through your account.',
            'طلبك قيد المراجعة. سيؤكد فريقنا التوافر ويرسل عرض السعر من خلال حسابك.',
          )}
        </p>
        <p>
          {t('Reference', 'رقم الطلب')}: <strong>{submit.data.data.id}</strong>
        </p>
        <Link to="/account" className="button gold">
          {t('Track my request', 'متابعة طلبي')} <ArrowUpRight size={18} />
        </Link>
      </section>
    );
  return (
    <div className={inquiry ? '' : 'section journey-request'}>
      {!inquiry && (
        <>
          <nav
            className="service-switcher"
            aria-label={t('Choose a service', 'اختر الخدمة')}
          >
            <NavLink to="/requests/airport">
              <Plane size={18} />
              {t('Airport transfer', 'توصيل مطار')}
            </NavLink>
            <NavLink to="/requests/trip">
              <Route size={18} />
              {t('Private journey', 'رحلة خاصة')}
            </NavLink>
            <NavLink to="/hotels">
              <Building2 size={18} />
              {t('Hotel stay', 'إقامة فندقية')}
            </NavLink>
          </nav>
          <PageTitle
            eyebrow={t('MADE AROUND YOUR PLANS', 'ترتيبات حسب خططك')}
            title={titles[service]}
            text={t(
              'Tell us what you need, review your details, then request a quotation. Availability and prices are confirmed by our team.',
              'حدد احتياجاتك وراجع التفاصيل ثم اطلب عرض سعر. يؤكد فريقنا التوافر والأسعار.',
            )}
          />
        </>
      )}
      <div className={inquiry ? '' : 'request-composition'}>
        {!inquiry && (
          <aside className="journey-concierge">
            <p className="eyebrow">
              {t('A LITTLE HELP PLANNING', 'نساعدك في التخطيط')}
            </p>
            <h2>
              {airport
                ? t('From runway to your destination.', 'من المطار إلى وجهتك.')
                : hotel
                  ? t('The stay that suits you.', 'الإقامة اللي تناسبك.')
                  : t('The road, on your terms.', 'الطريق على راحتك.')}
            </h2>
            <p>
              {airport
                ? t(
                    'Choose arrival for pickup at the airport, or departure for a ride to your flight. Use the flight date and time shown on your ticket in Egypt local time.',
                    'اختر وصول للاستقبال من المطار، أو مغادرة للتوصيل إلى رحلتك. أدخل تاريخ ووقت الطيران بتوقيت مصر كما في التذكرة.',
                  )
                : hotel
                  ? t(
                      'Include children in the guest total. Their ages help our team request accurate room and meal options.',
                      'احسب الأطفال ضمن إجمالي النزلاء. الأعمار تساعد فريقنا في تحديد الغرف والوجبات المناسبة.',
                    )
                  : t(
                      'Give us exact pickup and drop-off addresses. For groups, tell us about luggage and extra stops.',
                      'اكتب عنوان الانطلاق والوصول بدقة. للمجموعات، وضّح الحقائب والتوقفات الإضافية.',
                    )}{' '}
            </p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>{t('Your details', 'تفاصيلك')}</h3>
                  <p>
                    {t(
                      'Dates, places and preferences.',
                      'المواعيد والأماكن والتفضيلات.',
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>{t('Review before sending', 'راجع قبل الإرسال')}</h3>
                  <p>
                    {t(
                      'Check your itinerary in one place.',
                      'راجع برنامجك في مكان واحد.',
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>{t('A personal quotation', 'عرض سعر خاص بك')}</h3>
                  <p>
                    {t(
                      'Follow replies in your account.',
                      'تابع الردود من حسابك.',
                    )}
                  </p>
                </div>
              </li>
            </ol>
            <small>
              {t(
                'No deposit required. Special arrangements are subject to confirmation.',
                'بدون مقدم. الترتيبات الخاصة تخضع للتأكيد.',
              )}
            </small>
          </aside>
        )}
        <div>
          {review ? (
            <section
              className="panel request-review"
              aria-label={t('Review your request', 'مراجعة طلبك')}
            >
              <p className="eyebrow">
                {t('REVIEW & SEND', 'المراجعة والإرسال')}
              </p>
              <h2>{t('Everything look right?', 'كل التفاصيل صحيحة؟')}</h2>
              <dl>
                <dt>{t('Service', 'الخدمة')}</dt>
                <dd>{titles[service]}</dd>
                {'city' in review && (
                  <>
                    <dt>{t('City', 'المدينة')}</dt>
                    <dd>{review.city}</dd>
                  </>
                )}
                {'pickupLocation' in review && (
                  <>
                    <dt>{t('From', 'من')}</dt>
                    <dd>{review.pickupLocation}</dd>
                    <dt>{t('To', 'إلى')}</dt>
                    <dd>{review.destination}</dd>
                  </>
                )}
                {!inquiry && (
                  <>
                    <dt>
                      {hotel
                        ? t('Check-in / check-out', 'الوصول / المغادرة')
                        : t('Pickup (Egypt local time)', 'الانطلاق بتوقيت مصر')}
                    </dt>
                    <dd>
                      {values.date}{' '}
                      {hotel ? `→ ${values.endDate}` : values.time}
                    </dd>
                    <dt>{t('Guests', 'الضيوف')}</dt>
                    <dd>
                      {values.passengers}
                      {hotel ? ` · ${values.rooms} ${t('rooms', 'غرف')}` : ''}
                    </dd>
                    <dt>{t('Preference', 'التفضيل')}</dt>
                    <dd>{values.preference || t('Flexible', 'مرن')}</dd>
                  </>
                )}
              </dl>
              <p className="request-notes">{review.notes}</p>
              <p className="notice">
                {t(
                  'This is a request for a quotation, not a confirmed booking. Our team will contact you with availability and pricing.',
                  'هذا طلب عرض سعر وليس حجزاً مؤكداً. سيتواصل فريقنا لتأكيد التوافر والسعر.',
                )}
              </p>
              <Feedback error={submit.error} />
              <div className="review-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={submit.isPending}
                  onClick={() => {
                    setReview(null);
                    submit.reset();
                  }}
                >
                  {t('Edit details', 'تعديل التفاصيل')}
                </button>
                {user ? (
                  <button
                    disabled={submit.isPending}
                    onClick={() => {
                      try {
                        const payload = buildRequest(service, getValues());
                        setValidation('');
                        submit.mutate(payload);
                      } catch (e) {
                        setValidation(
                          e instanceof Error ? e.message : 'Check details',
                        );
                      }
                    }}
                  >
                    {submit.isPending
                      ? t('Sending…', 'جارٍ الإرسال…')
                      : t('Send quotation request', 'إرسال طلب عرض السعر')}
                  </button>
                ) : (
                  <Link to={loginUrl} className="button" onClick={saveDraft}>
                    {t('Save draft & sign in', 'حفظ الطلب وتسجيل الدخول')}
                  </Link>
                )}
              </div>
              {!user && (
                <small>
                  {t(
                    'Your draft stays in this browser tab for 30 minutes so you can return after sign-in. It is cleared after sending.',
                    'يُحفظ الطلب في هذا التبويب لمدة ٣٠ دقيقة للعودة بعد تسجيل الدخول ويُمسح بعد الإرسال.',
                  )}
                </small>
              )}
              {draftError && <p role="alert">{draftError}</p>}
            </section>
          ) : (
            <form className="panel request-form" onSubmit={handleSubmit(next)}>
              {inquiry && (
                <>
                  <div className="request-form-heading">
                    <p className="eyebrow">{t('CONTACT OUR TEAM', 'تواصل مع فريقنا')}</p>
                    <h2>{t('Tell us about your plans.', 'احكي لنا عن خططك.')}</h2>
                  </div>
                  <div className="grid two">
                    {field('contactName', t('Your name', 'اسمك'), 'text', true, 120)}
                    {field('contactEmail', t('Email address', 'البريد الإلكتروني'), 'email', false, 254)}
                    {field('contactPhone', t('Phone number', 'رقم الهاتف'), 'tel', false, 40)}
                  </div>
                  <small>{t('Add an email, phone number, or both so we can reply.', 'أضف البريد الإلكتروني أو رقم الهاتف أو الاثنين لنتمكن من الرد.')}</small>
                </>
              )}
              {!inquiry && (
                <>
                  <div className="request-form-heading">
                    <p className="eyebrow">
                      {t('01 / YOUR DETAILS', '٠١ / تفاصيلك')}
                    </p>
                    <h2>{t('Let’s plan the details.', 'نخطط للتفاصيل.')}</h2>
                  </div>
                  <fieldset>
                    <legend>
                      {hotel
                        ? t('Your stay', 'إقامتك')
                        : t('Your route', 'مسارك')}
                    </legend>
                    <div className="grid two">
                      {airport ? (
                        <>
                          {options(
                            'direction',
                            t('Transfer direction', 'اتجاه التوصيل'),
                            [
                              [
                                'arrival',
                                'Arrival — pick me up at the airport',
                                'وصول — استقبال من المطار',
                              ],
                              [
                                'departure',
                                'Departure — take me to the airport',
                                'مغادرة — توصيل إلى المطار',
                              ],
                            ],
                            true,
                          )}
                          {options(
                            'airport',
                            t('Airport in Egypt', 'المطار في مصر'),
                            [
                              ['', 'Select an airport', 'اختر المطار'],
                              ...airports.map(([code, en, ar]) => [
                                code,
                                `${en} (${code})`,
                                `${ar} (${code})`,
                              ]),
                            ],
                            true,
                          )}
                          {field(
                            'address',
                            values.direction === 'arrival'
                              ? t(
                                  'Drop-off hotel / exact address',
                                  'فندق الوصول / العنوان بالتفصيل',
                                )
                              : t(
                                  'Pickup hotel / exact address',
                                  'فندق الانطلاق / العنوان بالتفصيل',
                                ),
                          )}
                          {field(
                            'terminal',
                            t('Terminal, if known', 'صالة المطار، إن عُرفت'),
                            'text',
                            false,
                            50,
                          )}
                          {field(
                            'flight',
                            t(
                              'Flight number, if known (e.g. MS777)',
                              'رقم الرحلة إن عُرف (مثل MS777)',
                            ),
                            'text',
                            false,
                            30,
                          )}
                          {field(
                            'flightDate',
                            values.direction === 'arrival'
                              ? t('Flight landing date', 'تاريخ وصول الطائرة')
                              : t(
                                  'Flight departure date',
                                  'تاريخ إقلاع الطائرة',
                                ),
                            'date',
                          )}
                          {field(
                            'flightTime',
                            values.direction === 'arrival'
                              ? t('Landing time (Egypt)', 'وقت الوصول (مصر)')
                              : t(
                                  'Departure time (Egypt)',
                                  'وقت الإقلاع (مصر)',
                                ),
                            'time',
                          )}
                        </>
                      ) : hotel ? (
                        <label>
                          {t(
                            'Destination city in Egypt',
                            'مدينة الوجهة في مصر',
                          )}
                          <input
                            list="egypt-cities"
                            required
                            maxLength={100}
                            {...register('city')}
                          />
                          <datalist id="egypt-cities">
                            {cities.map(([en, ar]) => (
                              <option value={t(en, ar)} key={en} />
                            ))}
                          </datalist>
                        </label>
                      ) : (
                        <>
                          {options(
                            'purpose',
                            t('Journey purpose', 'نوع الرحلة'),
                            [
                              [
                                'Private journey / رحلة خاصة',
                                'Private / intercity journey',
                                'رحلة خاصة / بين المدن',
                              ],
                              [
                                'Business / أعمال',
                                'Business transportation',
                                'تنقلات أعمال',
                              ],
                              [
                                'Family or group / عائلة أو مجموعة',
                                'Family / group journey',
                                'رحلة عائلية / مجموعة',
                              ],
                            ],
                          )}
                          {field(
                            'pickupLocation',
                            t(
                              'Pickup city & exact address',
                              'مدينة وعنوان الانطلاق بالتفصيل',
                            ),
                          )}
                          {field(
                            'destination',
                            t(
                              'Destination city & exact address',
                              'مدينة وعنوان الوصول بالتفصيل',
                            ),
                          )}
                        </>
                      )}
                      {field(
                        'date',
                        hotel
                          ? t('Check-in date', 'تاريخ الوصول')
                          : t(
                              'Requested pickup date',
                              'تاريخ الانطلاق المطلوب',
                            ),
                        'date',
                      )}
                      {hotel ? (
                        <label>
                          {t('Check-out date', 'تاريخ المغادرة')}
                          <input
                            type="date"
                            required
                            min={values.date || today}
                            {...register('endDate')}
                          />
                        </label>
                      ) : (
                        field(
                          'time',
                          t(
                            'Requested pickup time (Egypt)',
                            'وقت الانطلاق المطلوب (مصر)',
                          ),
                          'time',
                        )
                      )}
                    </div>
                    {airport && (
                      <small>
                        {t(
                          'Allow time for luggage after landing, or airport check-in before departure. Our team will confirm the pickup time. If your airport is not listed, contact us.',
                          'اترك وقتاً للحقائب بعد الوصول أو لإجراءات السفر قبل الإقلاع. يؤكد فريقنا موعد الانطلاق. إذا لم تجد المطار، تواصل معنا.',
                        )}{' '}
                        <Link to="/contact" className="text-link">
                          {t('Contact us', 'تواصل معنا')}
                        </Link>
                      </small>
                    )}
                  </fieldset>
                  {!hotel && (
                    <fieldset>
                      <legend>{t('Return journey', 'رحلة العودة')}</legend>
                      <label className="check-control">
                        <input type="checkbox" {...register('returnTrip')} />
                        {t(
                          'Include a return quotation on the reverse route',
                          'أضف عرض سعر للعودة على المسار العكسي',
                        )}
                      </label>
                      {values.returnTrip && (
                        <div className="grid two">
                          {field(
                            'returnDate',
                            t('Return pickup date', 'تاريخ انطلاق العودة'),
                            'date',
                          )}
                          {field(
                            'returnTime',
                            t(
                              'Return pickup time (Egypt)',
                              'وقت انطلاق العودة (مصر)',
                            ),
                            'time',
                          )}
                        </div>
                      )}
                    </fieldset>
                  )}
                  <fieldset>
                    <legend>
                      {t('Guests & preferences', 'الضيوف والتفضيلات')}
                    </legend>
                    <div className="grid two">
                      {count(
                        'passengers',
                        t(
                          'Total guests, including children',
                          'إجمالي الضيوف شامل الأطفال',
                        ),
                        1,
                        100,
                      )}
                      {hotel ? (
                        <>
                          {count('rooms', t('Rooms', 'الغرف'), 1, 50)}
                          {count(
                            'children',
                            t('Children under 18', 'أطفال أقل من ١٨ سنة'),
                            0,
                            99,
                          )}
                          {Number(values.children) > 0 &&
                            field(
                              'childAges',
                              t(
                                'Child ages, separated by commas (e.g. 4, 8)',
                                'أعمار الأطفال بفواصل (مثل 4, 8)',
                              ),
                              'text',
                              true,
                              200,
                            )}
                          {options(
                            'meal',
                            t('Meal preference', 'الوجبات المفضلة'),
                            [
                              ['', 'Flexible', 'مرن'],
                              ['Breakfast / إفطار', 'Breakfast', 'إفطار'],
                              [
                                'Half board / نصف إقامة',
                                'Breakfast & dinner',
                                'إفطار وعشاء',
                              ],
                              [
                                'Full board / إقامة كاملة',
                                'Full board',
                                'إقامة كاملة',
                              ],
                              ['All inclusive / شامل', 'All inclusive', 'شامل'],
                            ],
                          )}
                          <label>
                            {t(
                              'Budget per room / night (EGP), optional',
                              'ميزانية الغرفة / الليلة بالجنيه، اختياري',
                            )}
                            <input
                              type="number"
                              min="1"
                              max="1000000"
                              step="1"
                              {...register('budget')}
                            />
                          </label>
                        </>
                      ) : (
                        count(
                          'luggage',
                          t('Large suitcases', 'الحقائب الكبيرة'),
                          0,
                          100,
                        )
                      )}
                      {hotel
                        ? field(
                            'preference',
                            t(
                              'Preferred hotel or category, optional',
                              'الفندق أو الفئة المفضلة، اختياري',
                            ),
                            'text',
                            false,
                          )
                        : options(
                            'preference',
                            t('Vehicle preference', 'السيارة المفضلة'),
                            [
                              [
                                '',
                                'Recommend a suitable vehicle',
                                'اقترح سيارة مناسبة',
                              ],
                              ['Sedan / سيدان', 'Sedan', 'سيدان'],
                              ['SUV', 'SUV', 'دفع رباعي'],
                              ['Van / فان', 'Van', 'فان'],
                              ['Minibus / ميني باص', 'Minibus', 'ميني باص'],
                              [
                                'Luxury / فاخرة',
                                'Luxury vehicle',
                                'سيارة فاخرة',
                              ],
                            ],
                          )}
                      {field(
                        'contactPhone',
                        t(
                          'Contact phone with country code',
                          'هاتف التواصل مع رمز الدولة',
                        ),
                        'tel',
                        true,
                        40,
                      )}
                    </div>
                    <small>
                      {t(
                        'Preferences help us prepare your quotation and remain subject to availability.',
                        'التفضيلات تساعدنا في إعداد عرض السعر وتخضع للتوافر.',
                      )}
                    </small>
                  </fieldset>
                </>
              )}
              <label>
                {inquiry
                  ? t('How can we help?', 'كيف يمكننا مساعدتك؟')
                  : t(
                      'Additional needs / stops / accessibility requests',
                      'احتياجات إضافية / توقفات / متطلبات سهولة الحركة',
                    )}
                <textarea
                  rows={4}
                  required={inquiry}
                  maxLength={inquiry ? 2500 : 1500}
                  {...register('notes')}
                />
              </label>
              <button type="submit">
                {t('Review request', 'مراجعة الطلب')} <ArrowUpRight size={18} />
              </button>
              <small>
                {t(
                  'No payment is collected here. Your request is reviewed before confirmation.',
                  'لا يتم تحصيل أي مبلغ هنا. تتم مراجعة الطلب قبل التأكيد.',
                )}
              </small>
            </form>
          )}
          {validation && (
            <p role="alert" className="notice error">
              {validation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
