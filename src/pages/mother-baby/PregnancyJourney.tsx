import { Card } from '@/components/ui'
import type { PregnancyTimeline } from './mother-baby.types'

export function PregnancyJourney({ milestones, currentWeek }: {
  milestones: PregnancyTimeline['allMilestones']; currentWeek: number
}) {
  const ordered = [...milestones].sort((a, b) => a.weekNumber - b.weekNumber)
  const earlier = ordered.filter(item => item.weekNumber <= currentWeek)
  const latestWeek = earlier[earlier.length - 1]?.weekNumber
  return (
    <Card style={{ padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Your pregnancy journey</h2>
      <p style={{ fontSize: '.8125rem', color: 'var(--on-surface-variant)', marginTop: '.375rem', lineHeight: 1.6 }}>
        Milestones along your timeline. Week markers do not confirm that a care visit or task is complete.
      </p>
      <ol className="pregnancy-journey">
        {ordered.map(item => {
          const current = item.weekNumber === latestWeek
          const label = item.weekNumber === currentWeek ? 'This week' : current ? 'Latest milestone' : item.weekNumber < currentWeek ? 'Earlier' : 'Ahead'
          return (
            <li key={`${item.weekNumber}-${item.title}`} data-current={current}>
              <div className="pregnancy-journey__content">
                <div className="pregnancy-journey__meta"><span>Week {item.weekNumber}</span><span>{label}</span></div>
                <h3>{item.title}</h3><p>{item.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
