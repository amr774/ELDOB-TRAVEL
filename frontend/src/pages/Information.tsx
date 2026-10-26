import { Link } from 'react-router-dom';
import { ArrowUpRight, Phone, Mail, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { PageTitle } from '../components/ui';
import { RequestForm } from './RequestForm';
export function Services() {
  const { t } = useLanguage();
  return (
    <div className="section">
      <PageTitle
        eyebrow={t('TRAVEL, BEAUTIFULLY ARRANGED', 'سفر مرتب بعناية')}
        title={t('Wherever Egypt takes you.', 'أينما تأخذك مصر.')}
        text={t(
          'A collection of services built around the way you travel. Always within Egypt. Always with care.',
          'خدمات مصممة حول طريقة سفرك. دائماً داخل مصر وباهتمام.',
        )}
      />
      <div className="grid two">
        {[
          [
            'Daily chauffeur-driven rental',
            'إيجار يومي مع سائق',
            'A vehicle and professional driver for your daily plans. Choose dates and request your preferred car.',
            'سيارة وسائق محترف لخططك اليومية. اختر المواعيد واطلب سيارتك.',
            '/cars',
          ],
          [
            'Airport transfers',
            'توصيلات المطار',
            'Choose your Egyptian airport, arrival or departure, flight details and luggage.',
            'اختر المطار والوصول أو المغادرة وتفاصيل الطيران والحقائب.',
            '/requests/airport',
          ],
          [
            'Intercity & private trips',
            'الرحلات الخاصة وبين المدن',
            'Travel between Egyptian cities with a company-provided quotation for your route.',
            'تنقل بين المدن المصرية بعرض سعر تحدده الشركة لمسارك.',
            '/requests/trip',
          ],
          [
            'Business transportation',
            'تنقلات الأعمال',
            'Transportation for meetings, visiting colleagues and business itineraries.',
            'تنقلات للاجتماعات وزيارات الزملاء وبرامج العمل.',
            '/requests/trip?purpose=business',
          ],
          [
            'Family & group journeys',
            'رحلات العائلات والمجموعات',
            'Tell us your passenger count and preferences so our team can arrange a suitable vehicle.',
            'حدد عدد الركاب وتفضيلاتك ليختار فريقنا السيارة المناسبة.',
            '/requests/trip?purpose=group',
          ],
          [
            'Hotel reservation requests',
            'طلبات حجز الفنادق',
            'Share your destination, dates and preferences. Availability and price are confirmed by our team.',
            'شارك وجهتك ومواعيدك وتفضيلاتك. يؤكد فريقنا التوافر والسعر.',
            '/hotels',
          ],
        ].map(([en, ar, desc, descAr, to], i) => (
          <article className="panel service-detail" key={en}>
            <span className="step-number">0{i + 1}</span>
            <h2>{t(en, ar)}</h2>
            <p>{t(desc, descAr)}</p>
            <Link className="text-link" to={to}>
              {t('Start planning', 'ابدأ التخطيط')}
              <ArrowUpRight size={18} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
export function About() {
  const { t } = useLanguage();
  return (
    <div className="section narrow">
      <PageTitle
        eyebrow="ELDOB TRAVEL · شركة الدب للسياحة"
        title={t('The journey matters.', 'الرحلة تستحق الاهتمام.')}
        text={t(
          'Premium chauffeur-driven transportation and travel arrangements, exclusively in Egypt.',
          'تنقلات راقية مع سائق وترتيبات سفر داخل مصر.',
        )}
      />
      <div className="prose">
        <p>
          {t(
            'ELDOB TRAVEL brings together daily car rentals with drivers, private transportation, airport transfers and hotel reservation requests. We help individuals, families, groups and businesses arrange travel around their own plans.',
            'تجمع شركة الدب للسياحة بين تأجير السيارات اليومي مع سائق والتنقلات الخاصة وتوصيلات المطار وطلبات حجز الفنادق. نساعد الأفراد والعائلات والمجموعات والشركات في ترتيب السفر وفق خططهم.',
          )}
        </p>
        <h2>
          {t(
            'Personal service. Clear arrangements.',
            'خدمة شخصية. ترتيبات واضحة.',
          )}
        </h2>
        <p>
          {t(
            'Our company manages a fleet of approximately 50 vehicles. Every rental includes a professional driver. Our team reviews requests, sets prices and confirms the details with you.',
            'تدير الشركة نحو ٥٠ سيارة. يشمل كل إيجار سائقاً محترفاً. يراجع فريقنا الطلبات ويحدد الأسعار ويؤكد التفاصيل معك.',
          )}
        </p>
        <p>
          {t(
            'There is no mandatory deposit or online payment. Hotel requests are handled by our team and remain subject to availability and confirmation.',
            'لا يوجد مقدم أو دفع إلكتروني إلزامي. يتولى فريقنا طلبات الفنادق وتظل خاضعة للتوافر والتأكيد.',
          )}
        </p>
        <Link className="button" to="/contact">
          {t('Talk to our team', 'تواصل مع فريقنا')}
        </Link>
      </div>
    </div>
  );
}
export function Contact() {
  const { t } = useLanguage();
  const phone = import.meta.env.VITE_CONTACT_PHONE,
    email = import.meta.env.VITE_CONTACT_EMAIL,
    whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER,
    address = import.meta.env.VITE_CONTACT_ADDRESS;
  return (
    <div className="section">
      <PageTitle
        eyebrow={t('LET’S MAKE A PLAN', 'لنخطط معاً')}
        title={t('A conversation away.', 'رحلتك تبدأ بالتواصل.')}
        text={t(
          'For personal journeys, group arrangements or business inquiries, tell us what you have in mind.',
          'للرحلات الشخصية أو ترتيبات المجموعات أو استفسارات الأعمال، شاركنا ما تفكر فيه.',
        )}
      />
      <div className="split">
        <div className="contact-details">
          <h2>{t('How can we help you travel?', 'كيف نساعدك في رحلتك؟')}</h2>
          <p>
            {t(
              'Send a message and follow our team’s reply in your account.',
              'أرسل رسالة وتابع رد فريقنا من حسابك.',
            )}
          </p>
          {phone && (
            <a href={`tel:${phone}`}>
              <Phone />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`}>
              <Mail />
              {email}
            </a>
          )}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle />
              WhatsApp
            </a>
          )}
          {address && (
            <p>
              <MapPin />
              {address}
            </p>
          )}
        </div>
        <RequestForm inquiry />
      </div>
    </div>
  );
}
