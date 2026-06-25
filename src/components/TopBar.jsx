import { money } from "../format.js";
import { CONFIG } from "../game/state.js";

// Renders the reputation as five teacup "stars" (full / half / empty).
function RepStars({ reputation }) {
  const score = (reputation / CONFIG.reputationMax) * 5; // 0..5
  return (
    <span className="rep-stars" title={`Reputation: ${Math.round(reputation)}/100`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = score - i;
        return (
          <span key={i} className="rep-star">
            {filled >= 0.75 ? "🫖" : filled >= 0.25 ? "🍵" : "🤍"}
          </span>
        );
      })}
    </span>
  );
}

export default function TopBar({ state, onReset }) {
  const phaseLabel = { prep: "Morning Prep", service: "Open for Service", summary: "Closing Time" }[
    state.phase
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">🫖</span>
        <div className="brand-text">
          <h1>The Tranquil Teapot</h1>
          <p>Day {state.day} · {phaseLabel}</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat" title="Cash on hand">
          <span className="stat-label">Cash</span>
          <span className="stat-value">{money(state.money)}</span>
        </div>
        <div className="stat" title="Customer reputation">
          <span className="stat-label">Reputation</span>
          <RepStars reputation={state.reputation} />
        </div>
        <button className="ghost-btn" onClick={onReset} title="Start over">
          ↺ New Shop
        </button>
      </div>
    </header>
  );
}
