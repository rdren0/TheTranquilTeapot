import { money } from "../format.js";
import { CONFIG } from "../game/state.js";

export default function Summary({ state, dispatch }) {
  const { revenue, tips, supplyCost, served, lost } = state.ledger;
  const gross = revenue + tips;
  const net = gross - supplyCost - CONFIG.dailyRent;

  return (
    <div className="summary">
      <div className="receipt">
        <h2>🌙 Day {state.day} — Closing Time</h2>
        <p className="muted">
          You served {served} {served === 1 ? "cup" : "cups"} of tea
          {lost > 0 ? ` and lost ${lost} ${lost === 1 ? "customer" : "customers"}.` : "."}
        </p>

        <dl className="receipt-lines">
          <Line label="☕ Tea sales" value={revenue} />
          <Line label="💝 Tips" value={tips} />
          <Line label="📦 Supplies bought" value={-supplyCost} />
          <Line label="🏠 Rent" value={-CONFIG.dailyRent} />
          <div className="receipt-rule" />
          <Line label="Net for the day" value={net} strong />
        </dl>

        <div className="receipt-foot">
          <span>Cash after rent:</span>
          <strong>{money(state.money - CONFIG.dailyRent)}</strong>
        </div>

        {state.money - CONFIG.dailyRent < 0 && (
          <p className="warn">
            Careful — you can't cover rent. Sell more tomorrow or you'll be in the red.
          </p>
        )}

        <button className="primary-btn big" onClick={() => dispatch({ type: "NEXT_DAY" })}>
          ☀️ Start Day {state.day + 1}
        </button>
      </div>
    </div>
  );
}

function Line({ label, value, strong }) {
  const neg = value < 0;
  return (
    <div className={`receipt-line ${strong ? "strong" : ""}`}>
      <dt>{label}</dt>
      <dd className={neg ? "neg" : "pos"}>
        {neg ? "−" : "+"}
        {money(Math.abs(value))}
      </dd>
    </div>
  );
}
