import { useEffect, useState } from 'react'
import { Button, Card, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import type { MoodLog, MoodOption } from './mother-baby.types'

const MOOD_EMOJIS: Record<string, string> = {
  HAPPY: '😊', CALM: '😌', ANXIOUS: '😟', TIRED: '😴', SAD: '😢',
  EMOTIONAL: '😭', IRRITABLE: '😤', STRESSED: '😰', ENERGETIC: '⚡', OVERWHELMED: '🌊',
}

const CRAVING_EMOJIS: Record<string, string> = {
  SWEET: '🍬', SALTY: '🧂', SPICY: '🌶️', SOUR: '🍋', COLD_DRINKS: '🥃',
  WARM_FOOD: '🍲', NO_APPETITE: '😶', VERY_HUNGRY: '🍽️', NAUSEOUS: '🤢',
}

function optionLabel(option: string) {
  const words = option.replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function MoodLogger() {
  const [options, setOptions] = useState<MoodOption | null>(null)
  const [history, setHistory] = useState<MoodLog[]>([])
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [selectedCraving, setSelectedCraving] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void api.get<MoodOption>('/api/v1/mood/options').then(setOptions).catch(() => undefined)
    void api.get<{ entries: MoodLog[] }>('/api/v1/mood/history?limit=5')
      .then(response => setHistory(response.entries))
      .catch(() => undefined)
  }, [])

  const handleLog = async () => {
    if (!selectedMood && !selectedCraving) {
      setError('Please select at least a mood or craving.')
      return
    }

    setLogging(true)
    setError('')
    try {
      const response = await api.post<{ insight: string }>('/api/v1/mood/log', {
        mood: selectedMood ?? undefined,
        craving: selectedCraving ?? undefined,
      })
      setInsight(response.insight)
      setSelectedMood(null)
      setSelectedCraving(null)
      const updatedHistory = await api.get<{ entries: MoodLog[] }>('/api/v1/mood/history?limit=5')
      setHistory(updatedHistory.entries)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Failed to log mood')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Card style={{ padding: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>How are you feeling?</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>Log your mood and cravings — instant guidance follows.</p>

        {error ? <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div> : null}

        {insight ? (
          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-xl)', borderLeft: '3px solid var(--primary)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>✨ Your insight</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{insight}</p>
            <button type="button" onClick={() => setInsight(null)} style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Dismiss</button>
          </div>
        ) : null}

        {options ? (
          <>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Mood</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {options.moods.map(mood => (
                <button key={mood} type="button" aria-pressed={selectedMood === mood} onClick={() => setSelectedMood(current => current === mood ? null : mood)} style={{
                  padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${selectedMood === mood ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  background: selectedMood === mood ? 'var(--primary-fixed)' : 'transparent',
                  color: selectedMood === mood ? 'var(--primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s',
                }}>
                  <span aria-hidden="true">{MOOD_EMOJIS[mood] ?? '•'}</span>
                  <span>{optionLabel(mood)}</span>
                </button>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Cravings</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {options.cravings.map(craving => (
                <button key={craving} type="button" aria-pressed={selectedCraving === craving} onClick={() => setSelectedCraving(current => current === craving ? null : craving)} style={{
                  padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${selectedCraving === craving ? 'var(--tertiary)' : 'var(--outline-variant)'}`,
                  background: selectedCraving === craving ? 'var(--tertiary-fixed)' : 'transparent',
                  color: selectedCraving === craving ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s',
                }}>
                  <span aria-hidden="true">{CRAVING_EMOJIS[craving] ?? '•'}</span>
                  <span>{optionLabel(craving)}</span>
                </button>
              ))}
            </div>

            <Button onClick={handleLog} loading={logging} style={{ width: '100%' }} disabled={!selectedMood && !selectedCraving}>Log now</Button>
          </>
        ) : null}
      </Card>

      {history.length > 0 ? (
        <Card style={{ padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem' }}>Recent entries</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {history.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ flexShrink: 0, fontSize: '1.25rem' }} aria-hidden="true">
                  {MOOD_EMOJIS[log.mood ?? ''] ?? CRAVING_EMOJIS[log.craving ?? ''] ?? '💭'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    {log.mood ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-fixed)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)' }}>{log.mood}</span> : null}
                    {log.craving ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tertiary)', background: 'var(--tertiary-fixed)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)' }}>{log.craving}</span> : null}
                  </div>
                  {log.insight ? <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{log.insight.slice(0, 80)}…</p> : null}
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.25rem' }}>
                    {new Date(log.loggedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' at '}
                    {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
