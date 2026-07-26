'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

import { HERO_CONTENT } from '@/lib/heroContent';

export default function LoginPreviewPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [typedName, setTypedName] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedPerson, setIdentifiedPerson] = useState<any>(null);
  const [nameError, setNameError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot password (steps 4-5)
  const [forgotEmail, setForgotEmail] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  const handleIdentify = async () => {
    const trimmed = typedName.trim();
    if (!trimmed) return;
    
    setIsIdentifying(true);
    setNameError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setIdentifiedPerson(data.data);
        setEmail(data.data.email);
        setStep(3);
      } else {
        setNameError('We couldn’t prepare that workspace. Check your name or sign in with your email.');
        setIdentifiedPerson(null);
        setEmail('');
      }
    } catch (err) {
      setNameError('Could not connect to the server.');
      setIdentifiedPerson(null);
      setEmail('');
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleSkipIdentify = () => {
    setIdentifiedPerson(null);
    setEmail('');
    setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        login(data.user);
      } else {
        setLoginError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setLoginError('Could not connect to the server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsCheckingEmail(true);
    setForgotError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();

      if (data.ok) {
        setStep(5);
      } else {
        setForgotError(data.error || 'No account found with that email.');
      }
    } catch (err) {
      setForgotError('Could not connect to the server.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword }),
      });
      const data = await res.json();

      if (data.ok) {
        setResetSuccess(true);
        setEmail(forgotEmail);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setResetSuccess(false);
          setStep(3);
        }, 1800);
      } else {
        setResetError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setResetError('Could not connect to the server.');
    } finally {
      setIsResetting(false);
    }
  };

  const Logo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => (
    <div className={`flex items-center ${size === 'large' ? 'gap-4' : 'gap-3'}`}>
      <div className={`${size === 'large' ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl'} flex items-center justify-center`}
        style={{ background: 'linear-gradient(135deg, #2AB182, #1A8F68)' }}>
        <span className="material-symbols-outlined text-white" style={{ fontSize: size === 'large' ? 32 : 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
      </div>
      <div>
        <p className={`font-bold ${size === 'large' ? 'text-[28px]' : 'text-[20px]'} text-white leading-[1.1]`} style={{ fontFamily: 'var(--font-syne-var)' }}>INVICTUS OS</p>
        <p className={`${size === 'large' ? 'text-[12px]' : 'text-[10px]'} tracking-[0.25em] text-white/40 font-medium`}>AGENCY OPERATIONS</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#0A0A18] text-white overflow-hidden transition-colors duration-500">
      
      {/* SCREEN 1: WELCOME */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${step === 1 ? 'opacity-100 z-10 scale-100' : 'opacity-0 -z-10 scale-105 pointer-events-none'}`}
           style={{ background: 'linear-gradient(135deg, #0A0A18 0%, #111128 50%, #0D1A14 100%)' }}>
        
        <div className="text-center max-w-lg px-6 flex flex-col items-center">
          <div className="mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
            <Logo size="large" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 opacity-0 animate-[fadeInUp_1s_ease-out_0.4s_forwards]" style={{ fontFamily: 'var(--font-syne-var)' }}>
            Welcome to Invictus OS
          </h1>
          
          <p className="text-lg text-white/60 mb-12 opacity-0 animate-[fadeInUp_1s_ease-out_0.6s_forwards]">
            Build with purpose. Execute with clarity.
          </p>
          
          <button 
            onClick={() => setStep(2)}
            className="group relative px-8 py-4 bg-[#2AB182] hover:bg-[#1A8F68] text-white rounded-xl font-bold text-lg transition-all active:scale-95 opacity-0 animate-[fadeInUp_1s_ease-out_0.8s_forwards] flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(42,177,130,0.3)] hover:shadow-[0_0_30px_rgba(42,177,130,0.5)]"
          >
            <span>Enter Invictus OS</span>
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* SCREEN 2: NAME ENTRY */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${step === 2 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 -z-10 translate-y-8 pointer-events-none'}`}
           style={{ background: 'linear-gradient(135deg, #0A0A18 0%, #0D1A14 100%)' }}>
        
        <button 
          onClick={() => setStep(1)}
          className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-md px-6 flex flex-col">
          <div className="mb-10 self-center">
            <Logo />
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>Before we begin...</h2>
          <p className="text-white/60 mb-8">Enter your name so we can prepare the right workspace for you.</p>

          <input
            ref={nameInputRef}
            type="text"
            placeholder="e.g. Karan"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-xl text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
            disabled={isIdentifying}
          />
          
          {nameError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5">error</span>
              <p className="text-sm text-red-200 leading-tight">{nameError}</p>
            </div>
          )}

          <div className="flex items-center gap-4 mt-8">
            <button 
              onClick={handleIdentify}
              disabled={!typedName.trim() || isIdentifying}
              className="flex-1 py-4 bg-[#2AB182] hover:bg-[#1A8F68] disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isIdentifying ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>Continue <span className="material-symbols-outlined">arrow_forward</span></>
              )}
            </button>
          </div>
          
          {nameError && (
            <button 
              onClick={handleSkipIdentify}
              className="mt-6 text-sm text-white/40 hover:text-white transition-colors"
            >
              Skip and sign in with email
            </button>
          )}
        </div>
      </div>

      {/* SCREEN 3: PERSONALIZED LOGIN */}
      <div className={`absolute inset-0 flex flex-col lg:flex-row transition-all duration-700 ${step === 3 ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 -z-10 translate-x-8 pointer-events-none'}`}>
        
        {/* Left Panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 flex-[0.65]"
             style={{ background: 'linear-gradient(135deg, #0A0A18 0%, #111128 50%, #0D1A14 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          
          <Logo />

          <div className="animate-[fadeInUp_0.8s_ease-out]">
            <p className="text-[#2AB182] font-semibold tracking-wide text-sm mb-4 uppercase">
              {identifiedPerson ? `Welcome, ${identifiedPerson.firstName}` : 'Invictus OS'}
              {identifiedPerson?.designation && <span className="text-white/30 ml-2">| {identifiedPerson.designation}</span>}
            </p>
            
            {(() => {
              const content = identifiedPerson ? HERO_CONTENT[identifiedPerson.roleKey] || HERO_CONTENT.leadership : HERO_CONTENT.leadership;
              return (
                <>
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
                </>
              );
            })()}
          </div>

          <p className="text-[12px] text-white/20">
            © 2026 Invictus Global Tech Pvt. Ltd. · Chennai, India
          </p>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#05050A] lg:bg-transparent relative">
          
          {/* Mobile Header */}
          <div className="absolute top-8 left-8 lg:hidden">
            <Logo />
          </div>

          <div className="w-full max-w-[380px]">
            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>
                {identifiedPerson ? `Welcome back, ${identifiedPerson.firstName}` : 'Welcome back'}
              </h2>
              <p className="text-white/50">Sign in to continue to your workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
                  placeholder="name@invictusglobaltech.com"
                  disabled={isLoggingIn}
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotError(''); setStep(4); }}
                    className="text-xs text-[#2AB182] hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
                    placeholder="Enter your password (mock: 'password')"
                    disabled={isLoggingIn}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                  <p className="text-sm text-red-200">{loginError}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-[#2AB182] hover:bg-[#1A8F68] disabled:bg-[#2AB182]/50 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(42,177,130,0.2)] hover:shadow-[0_0_25px_rgba(42,177,130,0.4)]"
              >
                {isLoggingIn ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setStep(2);
                  setPassword('');
                }}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Not you? Go back
              </button>
            </div>
            
            <p className="text-center text-[11px] text-white/20 mt-12">
              By signing in you agree to the <a href="#" className="text-[#2AB182] hover:underline">Terms of Service</a> and <a href="#" className="text-[#2AB182] hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* SCREEN 4: FORGOT PASSWORD — EMAIL */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${step === 4 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 -z-10 translate-y-8 pointer-events-none'}`}
           style={{ background: 'linear-gradient(135deg, #0A0A18 0%, #0D1A14 100%)' }}>

        <button
          onClick={() => setStep(3)}
          className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-md px-6 flex flex-col">
          <div className="mb-10 self-center">
            <Logo />
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>Reset your password</h2>
          <p className="text-white/60 mb-8">Enter your account email and we'll let you set a new password.</p>

          <form onSubmit={handleCheckEmail} className="flex flex-col">
            <input
              type="email"
              placeholder="name@invictusglobaltech.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-lg text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
              disabled={isCheckingEmail}
              required
            />

            {forgotError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5">error</span>
                <p className="text-sm text-red-200 leading-tight">{forgotError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!forgotEmail || isCheckingEmail}
              className="mt-8 w-full py-4 bg-[#2AB182] hover:bg-[#1A8F68] disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isCheckingEmail ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>Continue <span className="material-symbols-outlined">arrow_forward</span></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* SCREEN 5: FORGOT PASSWORD — SET NEW PASSWORD */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${step === 5 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 -z-10 translate-y-8 pointer-events-none'}`}
           style={{ background: 'linear-gradient(135deg, #0A0A18 0%, #0D1A14 100%)' }}>

        <button
          onClick={() => setStep(4)}
          className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-md px-6 flex flex-col">
          <div className="mb-10 self-center">
            <Logo />
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-[#2AB182] text-[48px] mb-4">check_circle</span>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>Password updated</h2>
              <p className="text-white/60">Taking you back to sign in...</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-syne-var)' }}>Set a new password</h2>
              <p className="text-white/60 mb-8">Choose a new password for {forgotEmail}.</p>

              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
                  disabled={isResetting}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-[#2AB182] focus:bg-white/10 transition-all placeholder:text-white/20"
                  disabled={isResetting}
                  required
                />

                {resetError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5">error</span>
                    <p className="text-sm text-red-200 leading-tight">{resetError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newPassword || !confirmPassword || isResetting}
                  className="mt-4 w-full py-4 bg-[#2AB182] hover:bg-[#1A8F68] disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
