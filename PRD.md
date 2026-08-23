# Product Requirements Document (PRD) & Architecture: FIT Mobile PWA

## 1. Background & Motivation
The FIT Sync App is a premium, mobile-first Progressive Web App (PWA) designed to instantly log body weight, meals, health metrics, and exercises directly from a mobile device to a GitHub repository. It serves as a personal, serverless fitness tracker utilizing Markdown files as its database.

## 2. Scope & Core Features

### A. Extended Daily Log Schema
The daily log (`logs/YYYY-MM-DD.md`) will be expanded beyond just meals and calories to capture holistic health metrics.
- **New Metrics:** Water Intake (Liters/Glasses), Sleep Quality & Duration, and daily Energy Levels.
- **Implementation:** The `appendMealToLog` parser will be upgraded to also initialize and update a `## Health & Wellness Metrics` section in the daily markdown file.

### B. Massive Static Exercise Database
- **Implementation:** A comprehensive, hardcoded JSON array/object of exercises will be embedded directly in the app's source code (e.g., `src/lib/exercises.json`).
- **Feature:** It will categorize hundreds of exercises (Chest, Back, Legs, Shoulders, Arms, Core) for quick dropdown selection without needing to manage a remote database.

### C. Advanced Progressive Overload Tracker (Trend View)
- **Feature:** When an exercise is selected, the app will not just show the last session, but the **trend of the last 3 to 5 sessions**.
- **Implementation:** The `parseWorkoutTracker` function will be updated to return an array of historical records for a specific exercise, sorted by date. The UI will display a mini-history list or chart for the selected exercise, allowing the user to see their progression in weight and reps over the last month.

### D. Food Favorites "Quick Log"
- **Feature:** A "Quick Select" or "Favorites" dropdown in the Meal Logger.
- **Implementation:** Hardcoded favorite meals (e.g., "Skyr 200g - 125kcal/22g", "4 Boiled Eggs - 280kcal/24g", "City Chicken - 600kcal/60g") will be selectable. When tapped, it auto-fills the description, calories, and protein input fields, saving typing time.

## 3. Architecture & Tech Stack
*   **Tech Stack:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons.
*   **Hosting:** GitHub Pages via GitHub Actions.
*   **Data Layer:** GitHub REST API utilizing a Personal Access Token stored in `localStorage`.
*   **Database:** Markdown files (`workout_tracker.md` for lifts/weight, `logs/YYYY-MM-DD.md` for daily entries).

## 4. Phased Implementation Plan

### Phase 1: Data Layer & Parsers Update
- Update `lib/github.ts` to parse and append the new Health Metrics (Water/Sleep/Energy).
- Update the exercise history parser to group and return the last 5 records per exercise instead of just the latest one.

### Phase 2: Embedded Databases
- Create `src/lib/exercises.ts` containing the massive categorized list of exercises.
- Create `src/lib/favoriteFoods.ts` containing the user's preferred quick-log meals and their macros.

### Phase 3: UI Enhancement
- **Dashboard:** Add input cards for Water, Sleep, and Energy.
- **Workout Logger:** Update the Overload History UI to render a list of the last 3-5 sessions. Implement the massive static exercise list in the select dropdown.
- **Meal Logger:** Add the "Favorites Quick-Log" button group above the manual entry form.

### Phase 4: Verification & Deployment
- Test markdown string generation to ensure tables and sections don't break.
- Verify the PWA deployment on GitHub Pages.
