import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button, Input, StatusBanner } from '@/components/ui'
import { ApiError } from '@/lib/api'

const pwRequirements = [
  { test: (p: string) => p.length >= 8,   text: 'At least 8 characters'   },
  { test: (p: string) => /[A-Z]/.test(p), text: 'One uppercase letter'     },
  { test: (p: string) => /[0-9]/.test(p), text: 'One number'               },
]

const GENDER_OPTIONS = [
  { value: '',                    label: 'Prefer not to say' },
  { value: 'FEMALE',              label: 'Female'            },
  { value: 'MALE',                label: 'Male'              },
  { value: 'NON_BINARY',          label: 'Non-binary'        },
  { value: 'PREFER_NOT_TO_SAY',   label: 'Prefer not to say' },
]

// A compact but representative country list; extend as needed
const COUNTRIES = [
  'Nigeria','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda',
  'United Kingdom','United States','Canada','Australia','India','Germany','France',
  'Netherlands','Sweden','United Arab Emirates','Saudi Arabia','Other',
]

export function SignupPage() {
  const { signup, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep]             = useState<1 | 2>(1)
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [gender, setGender]         = useState('')
  const [country, setCountry]       = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [error, setError]           = useState('')

  const strength      = pwRequirements.filter(r => r.test(password)).length
  const strengthColor = ['var(--error)', 'var(--tertiary)', 'var(--tertiary)', '#16a34a'][strength]

  // Step 1 validation
  const step1Valid = firstName.trim() && lastName.trim() && email.trim()

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!step1Valid) return
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (strength < 3) { setError('Please meet all password requirements.'); return }

    try {
      await signup({
        firstName:  firstName.trim(),
        lastName:   lastName.trim(),
        email:      email.trim(),
        password,
        gender:     gender || undefined,
        country:    country || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', display: 'flex', alignItems: 'stretch' }}>

      {/* ── Left decorative panel (desktop) ──────────── */}
      <div className="auth-hero" style={{
        flex: '0 0 48%',
        background: 'linear-gradient(135deg, #1a73e8 0%, #005bbf 60%, #004493 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem',
      }}>
        <div style={{ position:'absolute', top:'-5%', right:'-5%', width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', bottom:'5%', left:'-8%', width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />

        {/* Logo */}
        <div style={{ position:'absolute', top:'2.5rem', left:'2.5rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>

          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
            }}>
            <img
              src="/icons/icon-192x192.png"
              alt="Vitals logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          <span style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:'1.25rem', color:'white' }}>Vitals</span>
        </div>

        <div style={{ color:'white', position:'relative', zIndex:1 }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontSize:'clamp(1.75rem,2.5vw,2.25rem)', fontWeight:800, lineHeight:1.2, marginBottom:'1.25rem' }}>
            Start your health<br />journey today
          </h2>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.9375rem', lineHeight:1.7, maxWidth:340 }}>
            Join thousands of people who use Vitals to stay on top of medications, track pregnancy milestones, and build healthier habits.
          </p>
          <div style={{ marginTop:'2.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[
              { icon:'check_circle', text:'Free to start — no credit card required'   },
              { icon:'check_circle', text:'Medication reminders with fallback email'   },
              { icon:'check_circle', text:'Pregnancy timeline & ANC scheduling'        },
              { icon:'check_circle', text:'AI-powered symptom insights'                },
            ].map(f => (
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ color:'rgba(255,255,255,0.85)', fontSize:18 }}>{f.icon}</span>
                <span style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.85)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1.5rem', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:420 }} className="animate-fade-up">

          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'2rem', justifyContent:'center' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: 'hidden'
            }}>
              <img
                src="/icons/icon-192x192.png"
                alt="Vitals logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <span style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:'1.25rem', color:'var(--primary)' }}>Vitals</span>
          </div>

          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:'1.75rem', color:'var(--on-surface)', marginBottom:'0.375rem' }}>
            Create your account
          </h1>
          <p style={{ color:'var(--on-surface-variant)', fontSize:'0.9375rem', marginBottom:'1.75rem' }}>
            {step === 1 ? 'Tell us a bit about yourself.' : 'Set up your login credentials.'}
          </p>

          {/* Step indicator */}
          <div style={{ display:'flex', gap:'0.375rem', marginBottom:'1.75rem' }}>
            {[1,2].map(n => (
              <div key={n} style={{ flex:1, height:3, borderRadius:99, background: n <= step ? 'var(--primary)' : 'var(--surface-container-high)', transition:'background 0.3s' }} />
            ))}
          </div>

          {error && <div style={{ marginBottom:'1.25rem' }}><StatusBanner type="error" message={error} /></div>}

          {/* ── Step 1: personal details ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <Input
                  label="First name"
                  placeholder="Ada"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  autoFocus
                />
                <Input
                  label="Last name"
                  placeholder="Okonkwo"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>

              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                icon="mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                <label style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--on-surface-variant)', fontFamily:'var(--font-headline)' }}>
                  Gender <span style={{ fontWeight:400, color:'var(--outline)' }}>(optional)</span>
                </label>
                <select
                  className="input-base"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="NON_BINARY">Non-binary</option>
                </select>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                <label style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--on-surface-variant)', fontFamily:'var(--font-headline)' }}>
                  Country <span style={{ fontWeight:400, color:'var(--outline)' }}>(optional)</span>
                </label>
                <select className="input-base" value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <Button type="submit" size="lg" style={{ width:'100%', marginTop:'0.25rem' }} disabled={!step1Valid}>
                Continue
              </Button>
            </form>
          )}

          {/* ── Step 2: credentials ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Show who this is for */}
              <div style={{ padding:'0.75rem 1rem', background:'var(--surface-container-low)', borderRadius:'var(--radius-lg)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontFamily:'var(--font-headline)', fontWeight:700, fontSize:'0.875rem', color:'var(--on-surface)' }}>
                    {firstName} {lastName}
                  </p>
                  <p style={{ fontSize:'0.8125rem', color:'var(--on-surface-variant)' }}>{email}</p>
                </div>
                <button type="button" onClick={() => setStep(1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', fontSize:'0.8125rem', fontWeight:700 }}>
                  Edit
                </button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  icon="lock"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  autoFocus
                  rightElement={
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--outline)', display:'flex' }}>
                      <span className="material-symbols-outlined icon-sm">{showPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  }
                />

                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop:'0.25rem' }}>
                    <div style={{ height:3, borderRadius:99, background:'var(--surface-container-high)', overflow:'hidden', marginBottom:'0.5rem' }}>
                      <div style={{ height:'100%', width:`${(strength/3)*100}%`, background:strengthColor, borderRadius:99, transition:'width 0.3s, background 0.3s' }} />
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {pwRequirements.map(r => (
                        <span key={r.text} style={{ fontSize:'0.75rem', color:r.test(password) ? '#16a34a' : 'var(--outline)', display:'flex', alignItems:'center', gap:'0.2rem' }}>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize:12 }}>
                            {r.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {r.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p style={{ fontSize:'0.8125rem', color:'var(--on-surface-variant)', lineHeight:1.55 }}>
                By creating an account you agree to our{' '}
                <span style={{ color:'var(--primary)', cursor:'pointer', fontWeight:600 }}>Terms</span>
                {' '}and{' '}
                <span style={{ color:'var(--primary)', cursor:'pointer', fontWeight:600 }}>Privacy Policy</span>.
              </p>

              <Button type="submit" size="lg" loading={isLoading} style={{ width:'100%', marginTop:'0.25rem' }}>
                Create account
              </Button>
            </form>
          )}

          <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.9rem', color:'var(--on-surface-variant)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .auth-hero { display: none !important; } .auth-mobile-logo { display: flex !important; } }
        @media (min-width: 769px) { .auth-mobile-logo { display: none !important; } }
      `}</style>
    </div>
  )
}
