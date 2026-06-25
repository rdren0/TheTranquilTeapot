import { useEffect, useReducer } from "react";
import {
  reducer,
  initialState,
  loadSave,
  writeSave,
  clearSave,
  CONFIG,
} from "./game/state.js";
import TopBar from "./components/TopBar.jsx";
import Prep from "./components/Prep.jsx";
import PhaserShop from "./components/PhaserShop.jsx";
import Summary from "./components/Summary.jsx";
import { money } from "./format.js";

export default function App() {
  // Resume a saved game if one exists, otherwise start fresh.
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    return loadSave() || initialState();
  });

  // Autosave after every change.
  useEffect(() => {
    writeSave(state);
  }, [state]);

  function handleReset() {
    if (window.confirm("Close up shop and start a brand new teahouse? This erases your save.")) {
      clearSave();
      dispatch({ type: "RESET" });
    }
  }

  return (
    <div className="app">
      <TopBar state={state} onReset={handleReset} />

      <main className="stage">
        {state.phase === "prep" && <Prep state={state} dispatch={dispatch} />}
        {state.phase === "service" && <PhaserShop state={state} dispatch={dispatch} />}
        {state.phase === "summary" && <Summary state={state} dispatch={dispatch} />}
      </main>

      <footer className="footer">
        <span>The Tranquil Teapot</span>
        <span className="footer-dot">·</span>
        <span>Rent is {money(CONFIG.dailyRent)}/day — brew wisely.</span>
      </footer>
    </div>
  );
}
