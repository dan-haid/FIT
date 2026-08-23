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

### E. AI Vision "Scan Machine" (Gemini Integration)
- **Feature:** A "Scan Machine" button in the Workout Logger that uses the device camera to identify gym equipment.
- **Implementation:** 
  - An `<input type="file" accept="image/*" capture="environment" />` triggers the native camera or photo library.
  - The image is compressed, converted to Base64, and sent to the **Google Gemini API (`gemini-1.5-flash`)**.
  - A strict System Prompt instructs Gemini to return a structured JSON response containing the **Muscle Category**, **Exercise Name**, and a **Form Tip**.
  - The app automatically parses this JSON and populates the Workout Logger dropdowns, saving the user from manually searching for the exercise.

### F. AI Nutrition & Desi Food Scanner (Gemini Integration)
- **Feature:** An AI-powered "Analyze Meal" button in the Meal Logger to automatically calculate calories and macros for complex meals, particularly Desi food.
- **Implementation:**
  - The user can upload a photo of their plate or type a natural description (e.g., "3 plates Lahori Murgh Chanay with half a Turkish bread").
  - The request is sent to the Gemini API, injected with a strict System Prompt that includes the user's baseline context (Male, 40yo, 94kg) to provide accurate portion context.
  - Gemini analyzes the Desi cuisine, estimates the portion sizes, and returns a JSON payload with `description`, `estimated_calories`, and `estimated_protein`.
  - The app instantly populates the manual entry fields with these calculated macros, allowing the user to review and save them to the daily log.

## 3. Architecture & Tech Stack
*   **Tech Stack:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons.
*   **Hosting:** GitHub Pages via GitHub Actions.
*   **Data Layer:** GitHub REST API utilizing a Personal Access Token stored in `localStorage`.
*   **AI Integration:** Google Gemini API (`gemini-1.5-flash`) via direct REST call, utilizing an API key stored in `localStorage`.
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
- **Meal Logger:** Unify the manual entry form with the AI Auto-Fill feature. Add the "Favorites Quick-Log" button group above the single, unified meal input form.

### Phase 4: AI Vision Integration (Gemini)
- Update the **Settings Tab** to include an input for the Google Gemini API Key.
- Create `src/lib/gemini.ts` to handle base64 image compression and the REST call to `generativelanguage.googleapis.com`.
- Add the `<input type="file" capture="environment" />` button to the Workout Logger and link it to the API response parser.
- **Unified AI Meal Scanner:** Embed a "🪄 Auto-Fill Macros" button directly next to the "What did you eat?" input field. When tapped, it passes the description (or uploaded image) to Gemini, which calculates the macros and instantly populates the standard Calories and Protein input fields within the same form before saving.

### Phase 5: Verification & Deployment
- Test markdown string generation to ensure tables and sections don't break.
- Verify the PWA deployment on GitHub Pages.

## 5. Migration & Rollback
- Since the database consists of Git-tracked markdown files, any parsing errors or accidental overwrites can be instantly rolled back using standard `git revert` commands in the repository history. No data can be permanently lost.
