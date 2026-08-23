// github.ts - Direct GitHub REST API integration for FIT tracking

const REPO_OWNER = "dan-haid";
const REPO_NAME = "FIT";

export interface ExerciseHistory {
  date: string;
  exercise: string;
  weight: string;
  setsReps: string;
  notes: string;
  category: string;
}

export interface DailyLogTotals {
  calories: number;
  protein: number;
}

// Get the GitHub token from local storage
export function getGithubToken(): string | null {
  return localStorage.getItem("github_token");
}

// Save the GitHub token
export function setGithubToken(token: string): void {
  localStorage.setItem("github_token", token);
}

// Clear the GitHub token
export function clearGithubToken(): void {
  localStorage.removeItem("github_token");
}

// Make an authorized request to GitHub API
async function githubRequest(path: string, options: RequestInit = {}): Promise<any> {
  const token = getGithubToken();
  if (!token) {
    throw new Error("GitHub token not set");
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub API error: ${response.statusText}`);
  }

  return response.json();
}

// Fetch file content and SHA
export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  try {
    const data = await githubRequest(`contents/${path}`);
    // Base64 decode content (handling utf-8 properly)
    const content = decodeURIComponent(
      atob(data.content.replace(/\s/g, ""))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return { content, sha: data.sha };
  } catch (error: any) {
    if (error.message && error.message.includes("Not Found")) {
      return { content: "", sha: "" };
    }
    throw error;
  }
}

// Create or update a file on GitHub
export async function updateFile(
  path: string,
  content: string,
  sha: string | null,
  message: string
): Promise<void> {
  // Base64 encode content handling unicode correctly
  const encodedContent = btoa(
    encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );

  const body: any = {
    message,
    content: encodedContent,
  };
  if (sha) {
    body.sha = sha;
  }

  await githubRequest(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// Parse the entire workout_tracker.md file for history
export function parseWorkoutTracker(markdown: string): ExerciseHistory[] {
  if (!markdown) return [];

  const history: ExerciseHistory[] = [];
  const lines = markdown.split("\n");

  let currentCategory = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Identify category
    if (line.startsWith("### 🏋️")) {
      currentCategory = "Chest";
    } else if (line.startsWith("### 🪵")) {
      currentCategory = "Back";
    } else if (line.startsWith("### 🦵")) {
      currentCategory = "Legs";
    } else if (line.startsWith("### 🪨")) {
      currentCategory = "Shoulders & Arms";
    }

    // Identify table rows
    if (line.startsWith("|") && currentCategory) {
      const parts = line.split("|").map((p) => p.trim());
      // Skip header and separator lines
      if (
        parts.length < 5 ||
        parts[1] === "" ||
        parts[1] === "Date" ||
        parts[1].includes("---") ||
        parts[1].includes(":")
      ) {
        continue;
      }

      // Format: | Date | Exercise | Weight (kg) | Sets x Reps | Notes / Variation |
      const date = parts[1];
      const exercise = parts[2];
      const weight = parts[3];
      const setsReps = parts[4];
      const notes = parts[5] || "";

      if (exercise && weight) {
        history.push({
          date,
          exercise,
          weight,
          setsReps,
          notes,
          category: currentCategory,
        });
      }
    }
  }

  return history;
}

// Appends a body weight log to the Body Weight table in workout_tracker.md
export function appendBodyWeight(markdown: string, date: string, weight: number, notes: string = ""): string {
  const lines = markdown.split("\n");
  const tableHeaderIndex = lines.findIndex((l) => l.includes("| Date | Weight (kg) | Weekly Avg / Notes |"));
  
  if (tableHeaderIndex === -1) {
    return markdown; // Table not found, return unmodified
  }

  const separatorIndex = tableHeaderIndex + 1;
  const newRow = `| **${date}** | **${weight.toFixed(1)} kg** | ${notes || "Logged via PWA"} |`;
  
  lines.splice(separatorIndex + 1, 0, newRow);
  return lines.join("\n");
}

// Appends a new lift to the exercise table in workout_tracker.md
export function appendExerciseLift(
  markdown: string,
  category: string,
  date: string,
  exerciseName: string,
  weight: string,
  setsReps: string,
  notes: string = ""
): string {
  const lines = markdown.split("\n");
  
  // Find where the category header is
  let headerKeyword = "";
  if (category === "Chest") headerKeyword = "### 🏋️ Chest Exercises";
  else if (category === "Back") headerKeyword = "### 🪵 Back Exercises";
  else if (category === "Legs") headerKeyword = "### 🦵 Leg Exercises";
  else if (category === "Shoulders & Arms") headerKeyword = "### 🪨 Shoulders & Arms";

  const headerIndex = lines.findIndex((l) => l.includes(headerKeyword));
  if (headerIndex === -1) return markdown;

  // Find the table header row below this category header
  let tableHeaderIndex = -1;
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].includes("| Date | Exercise | Weight (kg) |")) {
      tableHeaderIndex = i;
      break;
    }
    // If we hit another category header, break
    if (lines[i].startsWith("### ")) break;
  }

  if (tableHeaderIndex === -1) return markdown;

  const separatorIndex = tableHeaderIndex + 1;
  const newRow = `| **${date}** | **${exerciseName}** | **${weight}** | ${setsReps} | ${notes || "Logged via PWA"} |`;
  
  lines.splice(separatorIndex + 1, 0, newRow);
  return lines.join("\n");
}

// Appends a meal to logs/YYYY-MM-DD.md, creating it from template if missing
export function appendMealToLog(
  markdown: string,
  date: string,
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks",
  description: string,
  calories: number,
  protein: number
): string {
  let doc = markdown;
  
  // Create document if empty
  if (!doc) {
    doc = `# Daily Log: ${date}

- **Morning Weight:** [Pending] kg
- **Gym Today?** [Pending - Yes/No]
- **Apple Watch Active Burn:** [Pending] kcal

## Meals Eaten

### Breakfast / Meal 1 (~0 kcal | 0g protein)
- [Pending]

### Lunch (~0 kcal | 0g protein)
- [Pending]

### Dinner (~0 kcal | 0g protein)
- [Pending]

### Snacks / Supplements / Protein Shake (~0 kcal | 0g protein)
- [Pending]

---

## Daily Totals
- **Calories Eaten:** **~0 kcal** / 2,000 kcal max *(2,000 kcal remaining)*
- **Protein Eaten:** **~0g** / 120-150g target *(120-150g remaining)*

## Notes & Feeling
- Logged via PWA
`;
  }

  const lines = doc.split("\n");
  
  // Map mealType to markdown headers
  let sectionHeader = "";
  if (mealType === "Breakfast") sectionHeader = "### Breakfast";
  else if (mealType === "Lunch") sectionHeader = "### Lunch";
  else if (mealType === "Dinner") sectionHeader = "### Dinner";
  else if (mealType === "Snacks") sectionHeader = "### Snacks / Supplements / Protein Shake";

  const sectionIndex = lines.findIndex((l) => l.includes(sectionHeader));
  if (sectionIndex === -1) return doc;

  // Find where to insert the new item (before the next section or line)
  let insertIndex = -1;
  let isSectionEmpty = false;
  
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "- [Pending]" || line === "[Pending]") {
      insertIndex = i;
      isSectionEmpty = true;
      break;
    }
    if (line.startsWith("###") || line.startsWith("---") || line.startsWith("##")) {
      insertIndex = i - 1;
      break;
    }
  }

  if (insertIndex === -1) {
    insertIndex = lines.length;
  }

  // Create list item
  const suffix = (calories > 0 || protein > 0)
    ? ` (~${calories > 0 ? calories : 0} kcal | ${protein > 0 ? protein : 0}g protein)`
    : "";
  const newItem = `- **${description}**${suffix}`;

  if (isSectionEmpty) {
    // Replace "[Pending]" line
    lines[insertIndex] = newItem;
  } else {
    // Insert new item
    lines.splice(insertIndex + 1, 0, newItem);
  }

  // Recalculate section header calorie/protein numbers
  let newDoc = lines.join("\n");
  newDoc = recalculateTotals(newDoc);
  
  return newDoc;
}

// Updates the daily totals in logs/YYYY-MM-DD.md
function recalculateTotals(markdown: string): string {
  const lines = markdown.split("\n");
  
  let breakfastCalories = 0, breakfastProtein = 0;
  let lunchCalories = 0, lunchProtein = 0;
  let dinnerCalories = 0, dinnerProtein = 0;
  let snackCalories = 0, snackProtein = 0;

  let currentSection: "Breakfast" | "Lunch" | "Dinner" | "Snacks" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Identify current section
    if (line.startsWith("### Breakfast")) currentSection = "Breakfast";
    else if (line.startsWith("### Lunch")) currentSection = "Lunch";
    else if (line.startsWith("### Dinner")) currentSection = "Dinner";
    else if (line.startsWith("### Snacks")) currentSection = "Snacks";
    else if (line.startsWith("##") || line.startsWith("---")) currentSection = null;

    // Parse items for calorie and protein
    if (line.startsWith("-") && currentSection) {
      if (line.includes("[Pending]")) continue;
      
      const calMatch = line.match(/~(\d+)\s*kcal/);
      const protMatch = line.match(/(\d+)g\s*protein/);

      const cals = calMatch ? parseInt(calMatch[1]) : 0;
      const prot = protMatch ? parseInt(protMatch[1]) : 0;

      if (currentSection === "Breakfast") {
        breakfastCalories += cals;
        breakfastProtein += prot;
      } else if (currentSection === "Lunch") {
        lunchCalories += cals;
        lunchProtein += prot;
      } else if (currentSection === "Dinner") {
        dinnerCalories += cals;
        dinnerProtein += prot;
      } else if (currentSection === "Snacks") {
        snackCalories += cals;
        snackProtein += prot;
      }
    }
  }

  // Update Section Headers
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("### Breakfast")) {
      lines[i] = `### Breakfast / Meal 1 (~${breakfastCalories} kcal | ${breakfastProtein}g protein)`;
    } else if (lines[i].includes("### Lunch")) {
      lines[i] = `### Lunch (~${lunchCalories} kcal | ${lunchProtein}g protein)`;
    } else if (lines[i].includes("### Dinner")) {
      lines[i] = `### Dinner (~${dinnerCalories} kcal | ${dinnerProtein}g protein)`;
    } else if (lines[i].includes("### Snacks / Supplements")) {
      lines[i] = `### Snacks / Supplements / Protein Shake (~${snackCalories} kcal | ${snackProtein}g protein)`;
    }
  }

  // Calculate Daily Totals
  const totalCalories = breakfastCalories + lunchCalories + dinnerCalories + snackCalories;
  const totalProtein = breakfastProtein + lunchProtein + dinnerProtein + snackProtein;

  const calRemaining = Math.max(0, 2000 - totalCalories);
  
  // Find and update totals block
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("- **Calories Eaten:**")) {
      lines[i] = `- **Calories Eaten:** **~${totalCalories} kcal** / 2,000 kcal max *(${calRemaining} kcal remaining)*`;
    }
    if (lines[i].includes("- **Protein Eaten:**")) {
      lines[i] = `- **Protein Eaten:** **~${totalProtein}g** / 120-150g target *(${Math.max(0, 120 - totalProtein)}-${Math.max(0, 150 - totalProtein)}g remaining)*`;
    }
  }

  return lines.join("\n");
}
