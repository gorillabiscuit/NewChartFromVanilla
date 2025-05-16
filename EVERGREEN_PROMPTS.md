# Evergreen Prompts for Modularizing and Hardening Your Charting Application

---

## Project Context (include in every prompt)

> **Project Context:**  
> You are working on a complex, advanced charting application in JavaScript that visualizes blockchain data. The data is immutable and trusted (no need for normalization), and the app has evolved iteratively, mostly in a single file, with some recent modularization (state, events). The goal is to make the codebase extensible, maintainable, and robust against both user and Cursor-driven changes. You want to modularize the code, introduce best-practice state/event patterns, and enforce architectural guardrails.  
> **Directory Structure Rules:**
> - The project root is `/Users/wouterschreuders/Code/NewChartFromVanilla/`.
> - The main working directory is `/Users/wouterschreuders/Code/NewChartFromVanilla/dry-field-064a/`.
> - All source code, modularization, and new folders/files should be created **inside `dry-field-064a`** (preferably in `dry-field-064a/public/` or `dry-field-064a/src/` as appropriate).
> - **Never create or move files/folders in `/Users/wouterschreuders/Code/`** (the parent directory).
> - The `public/` folder is the current main code location; `src/` is for new modular code.
> - The `src/` folder inside `dry-field-064a` is the correct place for new modules, state, and event code.
> **After each action, thoroughly test the application and make a clear git commit describing the change.**

--- 