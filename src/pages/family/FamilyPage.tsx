import { Link } from 'react-router-dom'
import { FamilySection } from './FamilySection'

export function FamilyPage() {
  return (
    <div className="family-page">
      <Link className="family-back-link" to="/care">&larr; Back to My Care</Link>
      <header className="family-page-heading">
        <h1>Family &amp; connected care</h1>
        <p>The people you care for, with clear control over who can see and update each record.</p>
      </header>
      <FamilySection />
    </div>
  )
}
