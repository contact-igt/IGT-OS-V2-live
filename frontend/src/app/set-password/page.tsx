'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HERO_CONTENT } from '@/lib/heroContent';

const Logo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => (
  <div className="flex items-center gap-3">
    <div className={`rounded-xl flex items-center justify-center ${size === 'large' ? 'w-12 h-12' : 'w-10 h-10'}`}
      style={{ background: 'linear-gradient(135deg, #2AB182, #1A8F68)' }}>
      <span className="material-symbols-outlined text-white" style={{ fontSize: size === 'large' ? 26 : 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
    </div>
    <div>
      <p className={`font-bold text-white leading-[1.1] ${size === 'large' ? 'text-[24px]' : 'text-[20px]'}`} style={{ fontFamily: 'var(--font-syne-var)' }}>INVICTUS OS</p>
      <p className={`tracking-[0.25em] text-white/30 font-medium ${size === 'large' ? 'text-[11px]' : 'text-[10px]'}`}>AGENCY OPERATIONS</p>
    </div>
  </div>
);

function SetPasswordForm() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 10 characters and include a letter and a number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/set-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        if (user) {
          login({ ...user, mustChangePassword: false });
        }
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch (err: any) {
      if (user) {
        login({ ...user, mustChangePassword: false });
      } else {
        setError('Could not connect to the server');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full" style={{ maxWidth: 380 }}>
      {/* Mobile logo */}
      <div className="flex items-center gap-3 mb-10 lg:hidden">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #2AB182, #1A8F68)' }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>bolt</span>
        </div>
        <p className="font-bold text-[18px] text-white" style={{ fontFamily: 'var(--font-syne-var)' }}>INVICTUS OS</p>
      </div>

      <h2 className="font-bold text-[28px] mb-1" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>Set New Password</h2>
      <p className="text-[14px] mb-8" style={{ color: 'var(--c-text-2)', fontFamily: 'var(--font-grotesk-var)' }}>
        Welcome {user.name?.split(' ')[0]}! Please choose a new password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)', fontFamily: 'var(--font-grotesk-var)' }}>
            New Password
          </label>
          <input
            type="password"
            className="input-base"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-2)', fontFamily: 'var(--font-grotesk-var)' }}>
            Confirm Password
          </label>
          <input
            type="password"
            className="input-base"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg p-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontFamily: 'var(--font-grotesk-var)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-3 text-[13px] mt-2"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
              Updating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock_reset</span>
              Set Password & Login
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  const { user } = useAuth();
  
  // Determine roleKey just like we do in login page
  let roleKey = 'leadership'; // Default
  if (user) {
    const d = (user.department || '').toLowerCase();
    const r = user.role;
    if (r === 'admin' || r === 'ops') roleKey = 'leadership';
    else if (d.includes('design') || d.includes('creative')) roleKey = 'design';
    else if (d.includes('tech') || d.includes('dev') || d.includes('ai')) roleKey = 'dev';
    else if (d.includes('marketing') || d.includes('performance')) roleKey = 'marketing';
    else if (d.includes('video')) roleKey = 'video';
    else if (d.includes('sales') || d.includes('bde')) roleKey = 'sales';
  }

  const content = HERO_CONTENT[roleKey] || HERO_CONTENT.leadership;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Team Member';
  let designation = user?.department || user?.role || '';
  
  if (user?.email === 'sushilathithiyaa@invictusglobaltech.com') {
    designation = 'CEO';
  } else if (user?.email === 'contact@invictusglobaltech.com') {
    designation = 'COO';
  } else if (user?.email === 'connect@invictusglobaltech.com') {
    designation = 'Operations Manager';
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-bg)' }}>
      {/* Left: Branding Panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 flex-[0.65]"
        style={{
          background: 'linear-gradient(135deg, #0A0A18 0%, #111128 50%, #0D1A14 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Logo />

        {user && (
          <div className="animate-[fadeInUp_0.8s_ease-out]">
            <p className="text-[#2AB182] font-semibold tracking-wide text-sm mb-4 uppercase">
              Welcome, {firstName}
              {designation && <span className="text-white/30 ml-2">| {designation}</span>}
            </p>
            
            <h1 className="text-[52px] font-bold text-white leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-syne-var)' }}>
              {content.headline_white}<br /><span style={{ color: '#2AB182' }}>{content.headline_green}</span>
            </h1>
            <p className="text-[18px] leading-relaxed mb-12 text-white/50 max-w-[480px]">
              {content.subtitle}
            </p>

            <div className="flex flex-wrap gap-3">
              {content.pills.map((f: any) => (
                <div key={f.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                     style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: f.color, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-white/30 font-medium tracking-wide uppercase">
          © 2026 Invictus Global Tech Pvt. Ltd. - Chennai, India.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-[1] flex items-center justify-center p-8 lg:p-12" style={{ background: '#0D0D14' }}>
        <Suspense fallback={<div className="text-[13px] text-gray-500">Loading...</div>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
