import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useLanguage } from '../hooks/useLanguage';
import { api } from '../services/api';
import { Feedback } from '../components/ui';
import { workspacePath } from '../utils/workspaces';
const schema = z.object({
  email: z.email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  phone: z.string().optional(),
});
export function Auth({
  register: registration = false,
}: {
  register?: boolean;
}) {
  const { t } = useLanguage();
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const returnTo =
    next &&
    ([
      '/requests/airport',
      '/requests/trip',
      '/requests/hotel',
      '/contact',
    ].includes(next) ||
      /^\/hotels\/[a-zA-Z0-9_-]+$/.test(next))
      ? next
      : null;
  const nextQuery = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      if (registration) await api.post('/auth/register', values);
      return auth.login(values.email, values.password);
    },
    onSuccess: (user) => navigate(returnTo || workspacePath(user)),
  });
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">ELDOB TRAVEL</p>
        <h1>
          {t('Good journeys', 'الرحلات الجميلة')}
          <br />
          <em>{t('start here.', 'تبدأ هنا.')}</em>
        </h1>
        <p>
          {t(
            'One account for your rentals, private trips and hotel requests across Egypt.',
            'حساب واحد للإيجار والرحلات الخاصة وطلبات الفنادق في مصر.',
          )}
        </p>
        <ShieldCheck size={42} />
      </div>
      <div className="auth-form">
        <p className="eyebrow">{t('WELCOME ABOARD', 'أهلاً بك')}</p>
        <h2>
          {registration
            ? t('Create your account', 'أنشئ حسابك')
            : t('Welcome back', 'مرحباً بعودتك')}
        </h2>
        <form onSubmit={handleSubmit((v) => submit.mutate(v))}>
          {registration && (
            <>
              <label>
                {t('Full name', 'الاسم الكامل')}
                <input autoComplete="name" required {...register('fullName')} />
              </label>
              <label>
                {t('Phone', 'رقم الهاتف')}
                <input autoComplete="tel" {...register('phone')} />
              </label>
            </>
          )}
          <label>
            {t('Email address', 'البريد الإلكتروني')}
            <input type="email" autoComplete="email" {...register('email')} />
            {errors.email && (
              <small role="alert">
                {t(
                  'Enter a valid email address',
                  'أدخل بريداً إلكترونياً صحيحاً',
                )}
              </small>
            )}
          </label>
          <label>
            {t('Password', 'كلمة المرور')}
            <input
              type="password"
              autoComplete={registration ? 'new-password' : 'current-password'}
              {...register('password')}
            />
            {errors.password && (
              <small role="alert">
                {t('Use at least 6 characters', 'استخدم ٦ أحرف على الأقل')}
              </small>
            )}
          </label>
          <Feedback error={submit.error} />
          <button disabled={submit.isPending} type="submit">
            {submit.isPending
              ? t('Please wait…', 'انتظر…')
              : registration
                ? t('Create account', 'إنشاء حساب')
                : t('Sign in', 'تسجيل الدخول')}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p>
          {registration
            ? t('Already have an account?', 'لديك حساب؟')
            : t('New to ELDOB TRAVEL?', 'ليس لديك حساب؟')}{' '}
          <Link
            className="text-link"
            to={`${registration ? '/login' : '/register'}${nextQuery}`}
          >
            {registration
              ? t('Sign in', 'تسجيل الدخول')
              : t('Create an account', 'إنشاء حساب')}
          </Link>
        </p>
      </div>
    </section>
  );
}
