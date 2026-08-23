import { useState, useEffect } from "react";
import { 
  Dumbbell, 
  Utensils, 
  Scale, 
  Settings, 
  Flame, 
  Trophy, 
  Save, 
  Key, 
  LogOut, 
  RefreshCw,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import { 
  getGithubToken, 
  setGithubToken, 
  clearGithubToken, 
  getFile, 
  updateFile, 
  parseWorkoutTracker, 
  appendExerciseLift, 
  appendBodyWeight, 
  appendMealToLog
} from "./lib/github";
import type { ExerciseHistory } from "./lib/github";

export default function App() {
  const [token, setToken] = useState<string | null>(getGithubToken());
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // App state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [trackerSha, setTrackerSha] = useState<string | null>(null);
  const [trackerContent, setTrackerContent] = useState("");

  // Input states
  const [weight, setWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");

  // Workout state
  const [workoutCategory, setWorkoutCategory] = useState("Chest");
  const [exerciseName, setExerciseName] = useState("");
  const [liftWeight, setLiftWeight] = useState("");
  const [liftSetsReps, setLiftSetsReps] = useState("");
  const [liftNotes, setLiftNotes] = useState("");
  
  // Meal state
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snacks">("Breakfast");
  const [mealDesc, setMealDesc] = useState("");
  const [mealCals, setMealCals] = useState("");
  const [mealProtein, setMealProtein] = useState("");

  // Today's log state
  const [todayLog, setTodayLog] = useState("");
  const [todaySha, setTodaySha] = useState<string | null>(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0 });

  // List of common exercises based on category
  const commonExercises: Record<string, string[]> = {
    Chest: ["Dumbbell Chest Press", "Incline Barbell Bench Press", "Flat Barbell Bench Press", "Cable Crossover", "Push-ups"],
    Back: ["Lat Pulldown", "Seated Cable Row", "Barbell Row", "Dumbbell Row", "Pull-ups", "Deadlift"],
    Legs: ["Squats", "Leg Press", "Leg Extension", "Hamstring Curl", "Calf Raise", "Lunges"],
    "Shoulders & Arms": ["Overhead Barbell Press", "Dumbbell Shoulder Press", "Lateral Raise", "Bicep Curl", "Tricep Pushdown", "Hammer Curl"]
  };

  const getTodayDateString = () => {
    const today = new Date();
    // Return YYYY-MM-DD formatted date in local timezone
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayDate = getTodayDateString();

  // Load configuration and data
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch workout tracker
      const tracker = await getFile("workout_tracker.md");
      setTrackerContent(tracker.content);
      setTrackerSha(tracker.sha);
      const parsedHistory = parseWorkoutTracker(tracker.content);
      setHistory(parsedHistory);

      // 2. Fetch today's log
      const logPath = `logs/${todayDate}.md`;
      const todayFile = await getFile(logPath);
      setTodayLog(todayFile.content);
      setTodaySha(todayFile.sha);
      
      // Parse calories and protein totals from today's log if it exists
      if (todayFile.content) {
        const calMatch = todayFile.content.match(/- \*\*Calories Eaten:\*\* \*\*~(\d+)\s*kcal\*\*/);
        const protMatch = todayFile.content.match(/- \*\*Protein Eaten:\*\* \*\*~(\d+)g\*\*/);
        
        setTotals({
          calories: calMatch ? parseInt(calMatch[1]) : 0,
          protein: protMatch ? parseInt(protMatch[1]) : 0
        });
      } else {
        setTotals({ calories: 0, protein: 0 });
      }
    } catch (error: any) {
      toast.error("Failed to load repo data. Verify your token or connection.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      toast.error("Please enter a valid GitHub token");
      return;
    }
    setGithubToken(tokenInput.trim());
    setToken(tokenInput.trim());
    toast.success("GitHub Token Saved!");
  };

  const handleLogout = () => {
    clearGithubToken();
    setToken(null);
    setHistory([]);
    setTrackerSha(null);
    setTrackerContent("");
    setTodayLog("");
    setTodaySha(null);
    setTotals({ calories: 0, protein: 0 });
    toast.success("Logged out successfully");
  };

  // Submit Body Weight
  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      toast.error("Please enter a weight");
      return;
    }

    setLoading(true);
    try {
      const weightNum = parseFloat(weight);
      
      // Update workout_tracker.md
      const updatedTracker = appendBodyWeight(trackerContent, todayDate, weightNum, weightNotes);
      await updateFile("workout_tracker.md", updatedTracker, trackerSha, `Log body weight: ${weightNum} kg`);
      
      // Update local state
      setTrackerContent(updatedTracker);
      toast.success(`Logged weight: ${weightNum} kg!`);
      setWeight("");
      setWeightNotes("");
      
      // Reload history/data
      await loadData();
    } catch (error: any) {
      toast.error("Error saving weight log: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Workout Exercise
  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName) {
      toast.error("Please select or enter an exercise");
      return;
    }
    if (!liftWeight) {
      toast.error("Please enter the weight");
      return;
    }

    setLoading(true);
    try {
      const updatedTracker = appendExerciseLift(
        trackerContent,
        workoutCategory,
        todayDate,
        exerciseName,
        liftWeight,
        liftSetsReps || "*Unrecorded*",
        liftNotes
      );

      await updateFile(
        "workout_tracker.md",
        updatedTracker,
        trackerSha,
        `Log exercise: ${exerciseName} (${liftWeight} kg)`
      );

      toast.success(`Logged ${exerciseName}!`);
      
      // Reset inputs
      setLiftWeight("");
      setLiftSetsReps("");
      setLiftNotes("");
      
      // Reload history
      await loadData();
    } catch (error: any) {
      toast.error("Error saving workout: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Meal log
  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealDesc.trim()) {
      toast.error("Please enter a meal description");
      return;
    }

    setLoading(true);
    try {
      const logPath = `logs/${todayDate}.md`;
      const cals = mealCals ? parseInt(mealCals) : 0;
      const prot = mealProtein ? parseInt(mealProtein) : 0;

      const updatedLog = appendMealToLog(
        todayLog,
        todayDate,
        mealType,
        mealDesc.trim(),
        cals,
        prot
      );

      await updateFile(logPath, updatedLog, todaySha, `Log meal: ${mealType} - ${mealDesc.trim()}`);
      
      toast.success("Meal logged successfully!");
      
      // Reset inputs
      setMealDesc("");
      setMealCals("");
      setMealProtein("");
      
      // Reload data
      await loadData();
    } catch (error: any) {
      toast.error("Error saving meal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Find latest PR / history for a specific exercise
  const getExerciseHistory = (name: string): ExerciseHistory | null => {
    const matches = history.filter((h) => h.exercise.toLowerCase() === name.toLowerCase());
    if (matches.length === 0) return null;
    
    // Sort by date descending, or since we append at the top, the first item in parsed history is the newest!
    return matches[0];
  };

  // Render Auth page if no token exists
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-100 p-6">
        <Toaster position="top-center" theme="dark" />
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 text-neutral-100">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
              <Key className="size-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">FIT Sync Setup</CardTitle>
            <CardDescription className="text-neutral-400">
              Set up your private GitHub Access Token to instantly read/write your logs from your mobile screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="token" className="text-neutral-200">GitHub Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_****************"
                className="bg-neutral-950 border-neutral-800 text-neutral-100 focus-visible:ring-primary"
                value={tokenInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenInput(e.target.value)}
              />
            </div>
            <div className="text-xs text-neutral-400 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <p className="font-semibold text-neutral-300 mb-1">How to create a token:</p>
              <ol className="list-decimal list-inside flex flex-col gap-1">
                <li>Go to GitHub settings &rarr; Developer settings.</li>
                <li>Select <b>Personal Access Tokens</b> (Tokens classic).</li>
                <li>Generate a token with the <b>repo</b> scope.</li>
                <li>Paste it above. It stays strictly stored on your phone!</li>
              </ol>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-white text-black hover:bg-neutral-200" onClick={handleSaveToken}>
              Authorize & Connect
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const selectedExercisePR = exerciseName ? getExerciseHistory(exerciseName) : null;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 pb-20 max-w-md mx-auto relative shadow-2xl border-x border-neutral-900">
      <Toaster position="top-center" theme="dark" />

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Flame className="size-6 text-orange-500 fill-orange-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-white m-0">FIT mobile</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={loadData} 
            disabled={loading}
            className="size-9 rounded-full text-neutral-400 hover:text-white"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="text-xs font-semibold px-2.5 py-1 bg-neutral-900 rounded-full text-neutral-400 border border-neutral-800">
            {todayDate}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 overflow-y-auto">
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-5">
            {/* Daily Nutrition Summary */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Utensils className="size-4 text-primary" /> Today's Energy & Protein
                </CardTitle>
                <CardDescription className="text-neutral-400">Progress against your targets</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Calories Progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">Calories Intake</span>
                    <span className="text-neutral-200">{totals.calories} / 2,000 kcal</span>
                  </div>
                  <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (totals.calories / 2000) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 text-right font-medium">
                    {Math.max(0, 2000 - totals.calories)} kcal remaining
                  </p>
                </div>

                {/* Protein Progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">Protein Intake</span>
                    <span className="text-neutral-200">{totals.protein} / 120g target</span>
                  </div>
                  <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (totals.protein / 120) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 text-right font-medium">
                    {Math.max(0, 120 - totals.protein)}g remaining (to reach 120g baseline)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Weight Logger */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Scale className="size-4 text-orange-500" /> Log Morning Weight
                </CardTitle>
                <CardDescription className="text-neutral-400">Record morning weight on empty stomach</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogWeight}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <Label htmlFor="weight" className="text-xs text-neutral-400">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="94.0"
                        value={weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 focus-visible:ring-orange-500"
                      />
                    </div>
                    <div className="flex-[2] flex flex-col gap-1">
                      <Label htmlFor="weight-notes" className="text-xs text-neutral-400">Notes (optional)</Label>
                      <Input
                        id="weight-notes"
                        placeholder="Empty stomach, morning"
                        value={weightNotes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeightNotes(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 font-semibold"
                  >
                    <Save className="size-4" /> Save Body Weight
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Recent PR Activity */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Trophy className="size-4 text-yellow-500 fill-yellow-500" /> Recent Personal Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-800/50 max-h-48 overflow-y-auto">
                  {history.slice(0, 4).map((h, idx) => (
                    <div key={idx} className="flex justify-between items-center px-5 py-3 text-xs">
                      <div>
                        <p className="font-semibold text-neutral-200">{h.exercise}</p>
                        <p className="text-[10px] text-neutral-400">{h.date} | {h.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-yellow-500">{h.weight}</span>
                        <p className="text-[10px] text-neutral-400">{h.setsReps}</p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-neutral-500 text-center py-6">No lifts logged yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === "workout" && (
          <form onSubmit={handleLogWorkout} className="flex flex-col gap-4">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Dumbbell className="size-5 text-primary" /> Log Exercise
                </CardTitle>
                <CardDescription className="text-neutral-400">Ensure Progressive Overload tracking</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                
                {/* Category Selection */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-neutral-300">Muscle Group Category</Label>
                  <Select 
                    value={workoutCategory} 
                    onValueChange={(val: string | null) => {
                      if (val) {
                        setWorkoutCategory(val);
                        setExerciseName(""); // reset exercise name selection
                      }
                    }}
                  >
                    <SelectTrigger className="bg-neutral-950 border-neutral-800">
                      <SelectValue placeholder="Select Muscle Group" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                      <SelectItem value="Chest">🏋️ Chest</SelectItem>
                      <SelectItem value="Back">🪵 Back</SelectItem>
                      <SelectItem value="Legs">🦵 Legs</SelectItem>
                      <SelectItem value="Shoulders & Arms">🪨 Shoulders & Arms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exercise Selection */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-neutral-300">Exercise Name</Label>
                  <Select value={exerciseName} onValueChange={(val: string | null) => { if (val) setExerciseName(val); }}>
                    <SelectTrigger className="bg-neutral-950 border-neutral-800">
                      <SelectValue placeholder="Select or type exercise" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                      {commonExercises[workoutCategory]?.map((ex, i) => (
                        <SelectItem key={i} value={ex}>{ex}</SelectItem>
                      ))}
                      <SelectItem value="custom-input">+ Add Custom Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Exercise Input (if needed) */}
                {exerciseName === "custom-input" && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-neutral-300">Custom Exercise Name</Label>
                    <Input
                      placeholder="e.g. Incline Dumbbell Fly"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExerciseName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                )}

                {/* PROGRESSIVE OVERLOAD / HISTORY SECTION */}
                {exerciseName && exerciseName !== "custom-input" && (
                  <div className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-lg flex items-start gap-2.5">
                    <Sparkles className="size-4.5 text-yellow-500 fill-yellow-500/20 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-neutral-300">Overload History Tracker</p>
                      {selectedExercisePR ? (
                        <div className="mt-1 text-neutral-400 flex flex-col gap-0.5">
                          <p>Last Lifted: <span className="font-bold text-yellow-500">{selectedExercisePR.weight}</span></p>
                          <p>Rep Range: <span className="font-semibold text-neutral-300">{selectedExercisePR.setsReps}</span></p>
                          <p className="text-[10px] italic text-neutral-500">Date: {selectedExercisePR.date}</p>
                        </div>
                      ) : (
                        <p className="mt-1 text-neutral-500 italic">No history found. Time to establish your baseline weight! 🎯</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Weight and Reps Inputs */}
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label htmlFor="lift-weight" className="text-xs text-neutral-300">Weight (kg or per side)</Label>
                    <Input
                      id="lift-weight"
                      placeholder="e.g. 25kg or 25"
                      value={liftWeight}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiftWeight(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label htmlFor="lift-reps" className="text-xs text-neutral-300">Sets x Reps</Label>
                    <Input
                      id="lift-reps"
                      placeholder="e.g. 3 x 8"
                      value={liftSetsReps}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiftSetsReps(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

                {/* Workout Notes */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lift-notes" className="text-xs text-neutral-300">Lifting Notes</Label>
                  <Input
                    id="lift-notes"
                    placeholder="e.g. Felt heavy but stable, last rep close to RPE 9"
                    value={liftNotes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiftNotes(e.target.value)}
                    className="bg-neutral-950 border-neutral-800"
                  />
                </div>

              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 font-semibold gap-2"
                >
                  <Save className="size-4" /> Save Lift & Record
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {/* Meals Tab */}
        {activeTab === "meals" && (
          <form onSubmit={handleLogMeal} className="flex flex-col gap-4">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Utensils className="size-5 text-emerald-500" /> Log Meal Eaten
                </CardTitle>
                <CardDescription className="text-neutral-400">Record ingredients for streak tracking</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                
                {/* Meal category */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-neutral-300">Meal Category</Label>
                  <Select 
                    value={mealType} 
                    onValueChange={(val: string | null) => { if (val) setMealType(val as any); }}
                  >
                    <SelectTrigger className="bg-neutral-950 border-neutral-800">
                      <SelectValue placeholder="Meal Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
                      <SelectItem value="Breakfast">🍳 Breakfast / Meal 1</SelectItem>
                      <SelectItem value="Lunch">🥙 Lunch</SelectItem>
                      <SelectItem value="Dinner">🍲 Dinner</SelectItem>
                      <SelectItem value="Snacks">🥤 Snacks & Shakes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Meal Description */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="meal-desc" className="text-xs text-neutral-300">What did you eat?</Label>
                  <Input
                    id="meal-desc"
                    placeholder="e.g. 200g Skyr, muesli, 4 boiled eggs"
                    value={mealDesc}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMealDesc(e.target.value)}
                    className="bg-neutral-950 border-neutral-800"
                  />
                </div>

                {/* Optional nutrition parameters */}
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label htmlFor="meal-cals" className="text-xs text-neutral-300">Calories (kcal) - approx</Label>
                    <Input
                      id="meal-cals"
                      type="number"
                      placeholder="e.g. 390"
                      value={mealCals}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMealCals(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label htmlFor="meal-protein" className="text-xs text-neutral-300">Protein (g) - approx</Label>
                    <Input
                      id="meal-protein"
                      type="number"
                      placeholder="e.g. 31"
                      value={mealProtein}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMealProtein(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                >
                  <Save className="size-4" /> Save Meal Entry
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-5">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Settings className="size-5 text-neutral-400" /> App Settings
                </CardTitle>
                <CardDescription className="text-neutral-400">Manage your sync settings and token</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-medium">Syncing Target</span>
                  <span className="font-semibold text-neutral-200">dan-haid/FIT (GitHub)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-medium">Lifting Records</span>
                  <span className="font-semibold text-neutral-200">{history.length} unique lifts</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-neutral-400 font-medium">Active Branch</span>
                  <span className="font-mono text-xs px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-md">main</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="destructive" className="w-full font-semibold gap-2" onClick={handleLogout}>
                  <LogOut className="size-4" /> Clear Token & Disconnect
                </Button>
              </CardFooter>
            </Card>

            <div className="text-center text-[10px] text-neutral-500 leading-normal">
              <p>FIT Sync App &bull; Version 1.0.0 (PWA)</p>
              <p className="mt-1">All data is pushed directly to your private GitHub repository in real time.</p>
            </div>
          </div>
        )}
      </main>

      {/* Responsive Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-neutral-950 border-t border-neutral-900 flex justify-around items-center px-4 z-50">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-xs font-semibold transition-colors ${
            activeTab === "dashboard" ? "text-white" : "text-neutral-500 hover:text-neutral-400"
          }`}
        >
          <Scale className="size-5" />
          <span>Dashboard</span>
        </button>
        
        <button
          onClick={() => setActiveTab("workout")}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-xs font-semibold transition-colors ${
            activeTab === "workout" ? "text-primary" : "text-neutral-500 hover:text-neutral-400"
          }`}
        >
          <Dumbbell className="size-5" />
          <span>Workout</span>
        </button>

        <button
          onClick={() => setActiveTab("meals")}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-xs font-semibold transition-colors ${
            activeTab === "meals" ? "text-emerald-500" : "text-neutral-500 hover:text-neutral-400"
          }`}
        >
          <Utensils className="size-5" />
          <span>Meals</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-xs font-semibold transition-colors ${
            activeTab === "settings" ? "text-neutral-300" : "text-neutral-500 hover:text-neutral-400"
          }`}
        >
          <Settings className="size-5" />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
