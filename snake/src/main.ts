import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Snake app root was not found.");
}

app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Snake</p>
      <h1>Playable scaffold ready for engine and UI work.</h1>
      <p class="intro">
        This app uses vanilla TypeScript with Vite so gameplay and rendering can stay
        simple, local, and framework-free.
      </p>
    </header>

    <section class="layout" aria-label="Snake workspace">
      <section class="panel">
        <h2>Board Mount</h2>
        <div id="snake-board-root" class="mount">
          Engine and UI workers will render the board here.
        </div>
      </section>

      <aside class="panel sidebar">
        <section>
          <h2>HUD Mount</h2>
          <div id="snake-hud-root" class="mount compact">
            Score and state messaging land here.
          </div>
        </section>

        <section>
          <h2>Controls Mount</h2>
          <div id="snake-controls-root" class="mount compact">
            Keyboard help and restart affordances land here.
          </div>
        </section>
      </aside>
    </section>
  </main>
`;

