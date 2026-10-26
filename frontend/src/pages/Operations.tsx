import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import type { Booking, ServiceRequest, User, Car, Page } from '../types';
import { Feedback, LoadState, PageTitle, StatusBadge } from '../components/ui';
import { useState } from 'react';
import {
  filterRequests,
  filterBookings,
  matchesSearch,
} from '../utils/operations';
export function Operations() {
  const { t } = useLanguage();
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const requests = useQuery({
    queryKey: ['operations', 'requests'],
    queryFn: async () =>
      (await api.get<ServiceRequest[]>('/operations/requests')).data,
  });
  const bookings = useQuery({
    queryKey: ['operations', 'bookings'],
    queryFn: async () =>
      (await api.get<Booking[]>('/operations/bookings')).data,
  });
  const customers = useQuery({
    queryKey: ['operations', 'customers'],
    queryFn: async () => (await api.get<User[]>('/operations/customers')).data,
  });
  const cars = useQuery({
    queryKey: ['operations', 'cars'],
    queryFn: async () =>
      (await api.get<Page<Car>>('/cars', { params: { limit: 100 } })).data,
  });
  const change = useMutation({
    mutationFn: ({
      path,
      data,
      method = 'patch',
    }: {
      path: string;
      data?: unknown;
      method?: 'patch' | 'post';
    }) => api[method](path, data),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['operations'] });
      void cache.invalidateQueries({ queryKey: ['owner'] });
      void cache.invalidateQueries({ queryKey: ['requests'] });
      void cache.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
  const visibleRequests = filterRequests(
    requests.data || [],
    search,
    kind,
    status,
  );
  const visibleBookings = filterBookings(bookings.data || [], search, status);
  const visibleCustomers = (customers.data || []).filter((c) =>
    matchesSearch(search, [c.fullName, c.email, c.phone]),
  );
  return (
    <div className="section">
      <PageTitle
        eyebrow={t('ELDOB OPERATIONS', 'عمليات الدب')}
        title={t('Every detail, taken care of.', 'كل التفاصيل تحت السيطرة.')}
        text={t(
          'Manage requests, communicate with customers and keep journeys moving.',
          'إدارة الطلبات والتواصل مع العملاء ومتابعة الرحلات.',
        )}
      />
      <div className="account-links">
        <a href="#op-requests">{t('Requests', 'الطلبات')}</a>
        <a href="#op-bookings">{t('Rentals', 'الإيجارات')}</a>
        <a href="#op-customers">{t('Customers', 'العملاء')}</a>
        <a href="#op-create">{t('Create rental', 'إنشاء إيجار')}</a>
      </div>
      <div
        className="stats-grid"
        aria-label={t('Operational overview', 'نظرة عامة على العمليات')}
      >
        {[
          [
            t('Pending rentals', 'إيجارات قيد المراجعة'),
            bookings.data?.filter((b) => b.status === 'PENDING').length,
          ],
          [
            t('Transportation requests', 'طلبات التنقل'),
            requests.data?.filter(
              (r) => r.kind === 'TRIP' && r.status === 'PENDING',
            ).length,
          ],
          [
            t('Hotel requests', 'طلبات الفنادق'),
            requests.data?.filter(
              (r) => r.kind === 'HOTEL' && r.status === 'PENDING',
            ).length,
          ],
          [
            t('Open inquiries', 'استفسارات مفتوحة'),
            requests.data?.filter(
              (r) =>
                r.kind === 'INQUIRY' &&
                !['CANCELLED', 'COMPLETED'].includes(r.status),
            ).length,
          ],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value ?? '—'}</strong>
          </div>
        ))}
      </div>
      <div className="panel grid three">
        <label>
          {t(
            'Find a customer, reference or destination',
            'ابحث عن عميل أو مرجع أو وجهة',
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
          />
        </label>
        <label>
          {t('Request service', 'نوع الطلب')}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('All services', 'كل الخدمات')}</option>
            <option value="TRIP">
              {t('Trips & airport transfers', 'الرحلات وتوصيلات المطار')}
            </option>
            <option value="HOTEL">{t('Hotels', 'الفنادق')}</option>
            <option value="INQUIRY">{t('Inquiries', 'الاستفسارات')}</option>
          </select>
        </label>
        <label>
          {t('Reservation status', 'حالة الحجز')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('All statuses', 'كل الحالات')}</option>
            <option value="PENDING">{t('Pending', 'قيد المراجعة')}</option>
            <option value="CONFIRMED">{t('Confirmed', 'مؤكد')}</option>
            <option value="COMPLETED">{t('Completed', 'مكتمل')}</option>
            <option value="CANCELLED">{t('Cancelled', 'ملغي')}</option>
          </select>
        </label>
      </div>
      <Feedback
        error={change.error}
        success={change.isSuccess ? t('Changes saved', 'تم الحفظ') : undefined}
      />
      <section id="op-requests" className="account-section">
        <h2>
          {t('Trips, hotels & inquiries', 'الرحلات والفنادق والاستفسارات')}
        </h2>
        <LoadState
          loading={requests.isPending}
          error={requests.error}
          empty={!visibleRequests.length}
        >
          <div className="grid two">
            {visibleRequests.map((r) => (
              <form
                className="panel"
                key={r.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  change.mutate({
                    path: `/operations/requests/${r.id}`,
                    data: {
                      reply: d.get('reply'),
                      status: d.get('status'),
                      ...(d.get('quote') !== null && d.get('quote') !== ''
                        ? { quotedPrice: Number(d.get('quote')) }
                        : {}),
                    },
                  });
                }}
              >
                <div className="row">
                  <h3>
                    {r.kind === 'TRIP'
                      ? t('Private trip', 'رحلة خاصة')
                      : r.kind === 'HOTEL'
                        ? t('Hotel request', 'طلب فندق')
                        : t('Inquiry', 'استفسار')}
                  </h3>
                  <StatusBadge status={r.status} />
                </div>
                <p>
                  {r.user?.fullName} · {r.user?.email}
                </p>
                <p>
                  {r.city ||
                    `${r.pickupLocation || ''} → ${r.destination || ''}`}
                </p>
                <p>
                  {r.startDate} {r.endDate && `→ ${r.endDate}`}
                </p>
                <p>
                  {r.passengers && `${t('Guests', 'الركاب')}: ${r.passengers}`}{' '}
                  {r.rooms && `${t('Rooms', 'الغرف')}: ${r.rooms}`}
                </p>
                <p>{r.preference}</p>
                <p className="request-notes">{r.notes}</p>
                <small className="reference">{r.id}</small>
                <fieldset
                  disabled={
                    change.isPending ||
                    ['CANCELLED', 'COMPLETED'].includes(r.status)
                  }
                >
                  <label>
                    {t('Reply to customer', 'الرد على العميل')}
                    <textarea
                      name="reply"
                      maxLength={3000}
                      defaultValue={r.reply}
                    />
                  </label>
                  {r.kind !== 'INQUIRY' && (
                    <label>
                      {t('Quotation (EGP)', 'عرض السعر (جنيه)')}
                      <input
                        name="quote"
                        type="number"
                        min={0}
                        max={100000000}
                        defaultValue={r.quotedPrice ?? ''}
                      />
                    </label>
                  )}
                  <label>
                    {t('Status', 'الحالة')}
                    <select name="status" defaultValue={r.status}>
                      {[
                        r.status,
                        ...(r.status === 'PENDING'
                          ? ['CONFIRMED', 'CANCELLED']
                          : r.status === 'CONFIRMED'
                            ? ['COMPLETED', 'CANCELLED']
                            : []),
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button>{t('Save & reply', 'حفظ وإرسال الرد')}</button>
                </fieldset>
              </form>
            ))}
          </div>
        </LoadState>
      </section>
      <section id="op-bookings" className="account-section">
        <h2>{t('Daily rentals', 'الإيجارات اليومية')}</h2>
        <LoadState
          loading={bookings.isPending}
          error={bookings.error}
          empty={!visibleBookings.length}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    t('Customer', 'العميل'),
                    t('Vehicle', 'السيارة'),
                    t('Dates', 'المواعيد'),
                    t('Status', 'الحالة'),
                    t('Action', 'الإجراء'),
                  ].map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.user?.fullName}
                      <small className="reference">{b.pickupLocation}</small>
                    </td>
                    <td>{b.car.name}</td>
                    <td>
                      {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>
                      {['PENDING', 'CONFIRMED'].includes(b.status) && (
                        <button
                          disabled={change.isPending}
                          onClick={() =>
                            change.mutate({
                              path: `/operations/bookings/${b.id}/${b.status === 'PENDING' ? 'confirm' : 'complete'}`,
                            })
                          }
                        >
                          {b.status === 'PENDING'
                            ? t('Confirm', 'تأكيد')
                            : t('Complete', 'إكمال')}
                        </button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(b.status) && (
                        <>
                          <button
                            className="secondary"
                            disabled={change.isPending}
                            onClick={() =>
                              change.mutate({
                                path: `/operations/bookings/${b.id}/cancel`,
                              })
                            }
                          >
                            {t('Cancel', 'إلغاء')}
                          </button>
                          <details>
                            <summary>
                              {t(
                                'Edit pickup & notes',
                                'تعديل الانطلاق والملاحظات',
                              )}
                            </summary>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                change.mutate({
                                  path: `/operations/bookings/${b.id}`,
                                  data: Object.fromEntries(
                                    new FormData(e.currentTarget),
                                  ),
                                });
                              }}
                            >
                              <label>
                                {t('Pickup location', 'مكان الانطلاق')}
                                <input
                                  name="pickupLocation"
                                  defaultValue={b.pickupLocation}
                                  required
                                  maxLength={300}
                                />
                              </label>
                              <label>
                                {t('Notes', 'الملاحظات')}
                                <textarea
                                  name="notes"
                                  defaultValue={b.notes}
                                  maxLength={2000}
                                />
                              </label>
                              <button disabled={change.isPending}>
                                {t('Save', 'حفظ')}
                              </button>
                            </form>
                          </details>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadState>
      </section>
      <section id="op-customers" className="account-section">
        <h2>{t('Customer details', 'بيانات العملاء')}</h2>
        <LoadState loading={customers.isPending} error={customers.error}>
          <div className="grid three">
            {visibleCustomers.map((c) => (
              <form
                className="panel"
                key={c.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  change.mutate({
                    path: `/operations/customers/${c.id}`,
                    data: Object.fromEntries(d),
                  });
                }}
              >
                <p>{c.email}</p>
                <label>
                  {t('Full name', 'الاسم الكامل')}
                  <input name="fullName" required defaultValue={c.fullName} />
                </label>
                <label>
                  {t('Phone', 'الهاتف')}
                  <input name="phone" defaultValue={c.phone} />
                </label>
                <button disabled={change.isPending}>
                  {t('Save customer', 'حفظ العميل')}
                </button>
              </form>
            ))}
          </div>
        </LoadState>
        <details className="panel">
          <summary>
            {t('Add a customer contact', 'إضافة جهة اتصال لعميل')}
          </summary>
          <p>
            {t(
              'This creates an operational contact. It does not issue login credentials.',
              'ينشئ هذا جهة اتصال للعمليات ولا يصدر بيانات تسجيل دخول.',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change.mutate({
                path: '/operations/customers',
                method: 'post',
                data: Object.fromEntries(new FormData(e.currentTarget)),
              });
            }}
          >
            <label>
              {t('Name', 'الاسم')}
              <input name="fullName" required />
            </label>
            <label>
              {t('Email', 'البريد الإلكتروني')}
              <input name="email" type="email" required />
            </label>
            <label>
              {t('Phone', 'الهاتف')}
              <input name="phone" />
            </label>
            <button disabled={change.isPending}>
              {t('Add customer', 'إضافة عميل')}
            </button>
          </form>
        </details>
      </section>
      <section id="op-create" className="panel narrow">
        <h2>{t('Create a customer rental', 'إنشاء إيجار لعميل')}</h2>
        <Feedback error={cars.error} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate({
              path: '/operations/bookings',
              method: 'post',
              data: Object.fromEntries(new FormData(e.currentTarget)),
            });
          }}
        >
          <label>
            {t('Customer', 'العميل')}
            <select name="userId" required>
              <option value="">{t('Select customer', 'اختر العميل')}</option>
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · {c.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Vehicle', 'السيارة')}
            <select name="carId" required>
              <option value="">{t('Select vehicle', 'اختر السيارة')}</option>
              {cars.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid two">
            <label>
              {t('Start', 'البداية')}
              <input name="startDate" type="date" required />
            </label>
            <label>
              {t('End', 'النهاية')}
              <input name="endDate" type="date" required />
            </label>
          </div>
          <label>
            {t('Pickup', 'الانطلاق')}
            <input name="pickupLocation" required />
          </label>
          <button disabled={change.isPending}>
            {t('Create rental request', 'إنشاء طلب إيجار')}
          </button>
        </form>
      </section>
    </div>
  );
}
