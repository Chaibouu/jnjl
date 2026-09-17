export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none overflow-hidden ${className}`} aria-hidden="true">
      <svg width="100%" height="80" viewBox="0 0 800 80" preserveAspectRatio="none" fill="none">
        <path d="M0 40C100 10 150 70 250 40C350 10 400 70 500 40C600 10 650 70 750 40C775 30 790 25 800 22" stroke="#E7E7EA" strokeWidth="1.5" fill="none" />
        <path d="M0 55C100 25 150 85 250 55C350 25 400 85 500 55C600 25 650 85 750 55C775 45 790 40 800 37" stroke="#E7E7EA" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}
