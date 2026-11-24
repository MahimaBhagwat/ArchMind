import { Button } from '../components/Button.jsx'

export function WelcomeScreen({ onStart, onSignIn, signedIn }) {
  return (
    <section className="welcome-screen">
      <div className="welcome-screen-copy">
        <h1>ArchMind</h1>
        <p>
          Plan your project before you start coding. ArchMind helps you make
          the important technical decisions in clear, simple language.
        </p>
        <div className="welcome-screen-actions">
          <Button variant="primary" size="lg" onClick={onStart}>
            Start planning
          </Button>
          {!signedIn && (
            <button type="button" className="welcome-screen-signin" onClick={onSignIn}>
              Sign in to save projects
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
