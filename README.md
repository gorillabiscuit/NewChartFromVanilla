# Loan Bubble Chart Visualizer

An interactive bubble chart visualizing loan data using physics-based clustering, canvas rendering, and an event-driven architecture.

## ✨ Features

- Canvas-based bubble visualization
- Physics-driven clustering interactions
- D3-inspired axis and scale rendering
- Toggleable views (image vs. color)
- Filtering by protocol and collection
- Responsive layout and custom tooltips

## 📁 Key Files

- `index.html` — Main app structure, UI elements, and bootstrapping logic
- `visualization.js` — Core logic including:
  - `EventEmitter` – Lightweight custom event system
  - `Logger` – Debugging utility
  - `VisualizationManager` – Central controller for canvas rendering and state
- `chart-styles.css` — Styling for themes, layout, and responsiveness

## 🚀 Local Development

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd NewChartFromVanilla
   ```

2. Start a local dev server:
   ```bash
   python3 -m http.server 8000
   ```

3. Visit in your browser:
   ```
   http://localhost:8000/dry-field-064a/public/index.html
   ```

## 🧰 Tech Stack

- **Frontend**
  - Vanilla JavaScript (ES6+)
  - HTML5 Canvas
  - CSS3
- **Architecture**
  - Event-driven logic
  - Class-based modular structure
  - D3-style axis/tick patterns
  - Custom physics engine
- **Dev Tools**
  - Git + GitHub
  - Python HTTP server for local testing

## 🗒️ Future Improvements / TODO

- Refactor for modularity and composability
- Break up large classes for better separation of concerns
- Add unit tests for critical modules
- Improve state handling for UI components
- Convert to a component-based framework (optional)
