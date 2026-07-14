'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- MOCK DATA ---
const MOCK_PEOPLE = [
  { name: 'sushil', firstName: 'Sushil', fullName: 'Sushil Athithiyaa', roleKey: 'leadership', designation: 'CEO', email: 'sushilathithiyaa@invictusglobaltech.com' },
  { name: 'anitha', firstName: 'Anitha', fullName: 'Anitha Yogan', roleKey: 'leadership', designation: 'COO', email: 'contact@invictusglobaltech.com' },
  { name: 'abhilash', firstName: 'Abhilash', fullName: 'Abhilash B Nair', roleKey: 'leadership', designation: 'Head of Ops', email: 'connect@invictusglobaltech.com' },
  { name: 'karan', firstName: 'Karan', fullName: 'Karan K', roleKey: 'design', designation: 'Designer', email: 'karankumar.igt@gmail.com' },
  { name: 'naveen', firstName: 'NaveenRaj', fullName: 'NaveenRaj R', roleKey: 'dev', designation: 'Developer', email: 'naveenraj.igt@gmail.com' },
  { name: 'iyyappan', firstName: 'Iyyappan', fullName: 'Iyyappan', roleKey: 'dev', designation: 'CTO / Dev', email: 'iyyappan.igt@gmail.com' },
  { name: 'veeravel', firstName: 'Veeravel', fullName: 'Veeravel S', roleKey: 'dev', designation: 'Developer', email: 'veeravel.igt@gmail.com' },
  { name: 'jashwanth', firstName: 'Jashwanth', fullName: 'Jashwanth Boddupally', roleKey: 'dev', designation: 'Developer', email: 'jashwanth.boddupally.igt@gmail.com' },
  { name: 'thariq', firstName: 'Thariq', fullName: 'Mohammad Thariq', roleKey: 'dev', designation: 'Developer', email: 'thariq.dev@gmail.com' },
  { name: 'basheer', firstName: 'Basheer', fullName: 'Basheer', roleKey: 'video', designation: 'Video Editor', email: 'basheerinvictus@gmail.com' },
  { name: 'pranesh', firstName: 'Pranesh', fullName: 'Pranesh Krishnan', roleKey: 'video', designation: 'Editor', email: 'praneshkrishnan.igt@gmail.com' },
  { name: 'aiswarya', firstName: 'Aiswarya', fullName: 'Aiswarya Saiju', roleKey: 'marketing', designation: 'Sales / Mktg', email: 'aiswarya.saiju.igt@gmail.com' },
  { name: 'anju', firstName: 'Anju', fullName: 'Anju S', roleKey: 'marketing', designation: 'Marketing', email: 'abhilash.igt@gmail.com' },
  { name: 'rutuja', firstName: 'Rutuja', fullName: 'Rutuja Rajbhar', roleKey: 'marketing', designation: 'Marketing', email: 'rutuja.rajbhar.igt@gmail.com' },
  { name: 'dikshita', firstName: 'Dikshita', fullName: 'Dikshita Rajpurohit', roleKey: 'marketing', designation: 'Marketing', email: 'dikshitarajpurohit.igt@gmail.com' },
  { name: 'tania', firstName: 'Tania', fullName: 'Tania Viquar', roleKey: 'sales', designation: 'Sales', email: 'tania.viquar.igt@gmail.com' },
  { name: 'hari', firstName: 'Hari', fullName: 'Hariharan', roleKey: 'sales', designation: 'BDE', email: 'hari@invictusglobaltech.com' },
];

const HERO_CONTENT: Record<string, any> = {
  leadership: {
    headline_white: 'Drive growth,',
    headline_green: 'inspire the team.',
    subtitle: 'Strategic overview and agency performance metrics.',
    pills: [
      { icon: 'trending_up', label: 'Revenue', color: '#10B981' },
      { icon: 'health_and_safety', label: 'Team Health', color: '#3B82F6' },
      { icon: 'group_add', label: 'Client Retention', color: '#8B5CF6' },
      { icon: 'leaderboard', label: 'Pipeline', color: '#F59E0B' },
      { icon: 'gavel', label: 'Decisions', color: '#EC4899' },
    ]
  },
  design: {
    headline_white: 'Your design',
    headline_green: 'fills waiting rooms.',
    subtitle: 'Creative queue, brand systems, and asset delivery.',
    pills: [
      { icon: 'palette', label: 'Creative Queue', color: '#8B5CF6' },
      { icon: 'design_services', label: 'Brand Systems', color: '#EC4899' },
      { icon: 'rate_review', label: 'Review Cycles', color: '#F59E0B' },
      { icon: 'cloud_upload', label: 'Asset Delivery', color: '#3B82F6' },
      { icon: 'psychology', label: 'Client Impact', color: '#10B981' },
    ]
  },
  dev: {
    headline_white: 'Build robust,',
    headline_green: 'scale limitlessly.',
    subtitle: 'Development queue, deployments, and technical health.',
    pills: [
      { icon: 'terminal', label: 'Build Queue', color: '#3B82F6' },
      { icon: 'rocket_launch', label: 'Deployments', color: '#8B5CF6' },
      { icon: 'hub', label: 'WhatsNexus', color: '#10B981' },
      { icon: 'language', label: 'Client Websites', color: '#F59E0B' },
      { icon: 'code', label: 'Git Activity', color: '#EC4899' },
    ]
  },
  marketing: {
    headline_white: 'Turn attention',
    headline_green: 'into serious action.',
    subtitle: 'Campaign management, ROAS, and lead generation.',
    pills: [
      { icon: 'campaign', label: 'Campaigns', color: '#F97316' },
      { icon: 'show_chart', label: 'ROAS', color: '#10B981' },
      { icon: 'attach_money', label: 'Cost per Lead', color: '#3B82F6' },
      { icon: 'account_balance', label: 'Ad Budgets', color: '#8B5CF6' },
      { icon: 'fact_check', label: 'Qualified Leads', color: '#EC4899' },
    ]
  },
  video: {
    headline_white: 'Craft stories',
    headline_green: 'that captivate.',
    subtitle: 'Edit queue, review cycles, and final delivery.',
    pills: [
      { icon: 'movie', label: 'Edit Queue', color: '#EF4444' },
      { icon: 'rate_review', label: 'Review Cycles', color: '#F59E0B' },
      { icon: 'video_library', label: 'Reels', color: '#8B5CF6' },
      { icon: 'theaters', label: 'Brand Films', color: '#3B82F6' },
      { icon: 'send', label: 'Delivery', color: '#10B981' },
    ]
  },
  sales: {
    headline_white: 'Close deals,',
    headline_green: 'expand the empire.',
    subtitle: 'Sales pipeline, proposals, and follow-ups.',
    pills: [
      { icon: 'monetization_on', label: 'Pipeline', color: '#F59E0B' },
      { icon: 'support_agent', label: 'Follow-ups', color: '#3B82F6' },
      { icon: 'description', label: 'Proposals', color: '#8B5CF6' },
      { icon: 'handshake', label: 'Closures', color: '#10B981' },
      { icon: 'workspace_premium', label: 'Retainers', color: '#EC4899' },
    ]
  }
};


export default function LoginPreviewPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typedName, setTypedName] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedPerson, setIdentifiedPerson] = useState<any>(null);
  const [nameError, setNameError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  const handleIdentify = () => {
    const trimmed = typedName.trim().toLowerCase();
    if (!trimmed) return;
    
    setIsIdentifying(true);
    setNameError('');
    
    // Simulate network delay
    setTimeout(() => {
      const match = MOCK_PEOPLE.find(p => trimmed.includes(p.name) || p.fullName.toLowerCase().includes(trimmed));
      if (match) {
        setIdentifiedPerson(match);
        setEmail(match.email); // Safe prefill for preview
        setStep(3);
      } else {
        setNameError('We couldn’t prepare that workspace. Check your name or sign in with your email.');
        setIdentifiedPerson(null);
        setEmail('');
      }
      setIsIdentifying(false);
    }, 600);
  };

  const handleSkipIdentify = () => {
    setIdentifiedPerson(null);
    setEmail('');
    setStep(3);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoggingIn(true);
    setLoginError('');
    
    // Simulate auth check
    setTimeout(() => {
      if (password === 'password' || password === 'Invictus2026') {
        alert('Successful login simulated! In production, this redirects to the dashboard.');
      } else {
        setLoginError('Invalid email or password.');
      }
      setIsLoggingIn(false);
    }, 800);
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
                  <button type="button" className="text-xs text-[#2AB182] hover:text-white transition-colors">Forgot password?</button>
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
