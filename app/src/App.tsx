import { useState, useEffect, useRef } from "react";
import { 
  Dumbbell, 
  Utensils, 
  Scale, 
  Settings, 
  Flame, 
  Save, 
  Key, 
  LogOut, 
  RefreshCw,
  Droplet,
  Moon,
  Zap,
  Camera,
  Heart,
  TrendingUp,
  Brain,
  Info
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
  appendMealToLog,
  appendHealthMetrics
} from "./lib/github";
import type { ExerciseHistory } from "./lib/github";

import { EXERCISES } from "./lib/exercises";
import { FAVORITE_FOODS } from "./lib/favoriteFoods";
import { 
  getGeminiKey, 
  setGeminiKey, 
  clearGeminiKey, 
  fileToBase64, 
  identifyGymMachine, 
  analyzeMeal 
} from "./lib/gemini";

export default function App() {
  const [token, setToken] = useState<string | null>(getGithubToken());
  const [tokenInput, setTokenInput] = useState("");
  
  // Gemini API Key state
  const [geminiKey, setGeminiKeyLocal] = useState<string | null>(getGeminiKey());
  const [geminiKeyInput, setGeminiKeyInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // App state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [trackerSha, setTrackerSha] = useState<string | null>(null);
  const [trackerContent, setTrackerContent] = useState("");

  // Input states - Body weight
  const [weight, setWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");

  // Input states - Health Metrics
  const [water, setWater] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<number>(0);
  const [sleepQuality, setSleepQuality] = useState<string>("Good");
  const [energy, setEnergy] = useState<number>(7);

  // Workout state
  const [workoutCategory, setWorkoutCategory] = useState("Chest");
  const [exerciseName, setExerciseName] = useState("");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [liftWeight, setLiftWeight] = useState("");
  const [liftSetsReps, setLiftSetsReps] = useState("");
  const [liftNotes, setLiftNotes] = useState("");
  const [aiTip, setAiTip] = useState("");
  
  // Meal state
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snacks">("Breakfast");
  const [mealDesc, setMealDesc] = useState("");
  const [mealCals, setMealCals] = useState("");
  const [mealProtein, setMealProtein] = useState("");

  // Today's log state
  const [todayLog, setTodayLog] = useState("");
  const [todaySha, setTodaySha] = useState<string | null>(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0 });

  // Refs for camera uploads
  const machineFileRef = useRef<HTMLInputElement>(null);
  const foodFileRef = useRef<HTMLInputElement>(null);

  const getTodayDateString = () => {
    const today = new Date();
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
      
      // Parse calories, protein and health metrics from today's log if it exists
      if (todayFile.content) {
        const calMatch = todayFile.content.match(/- \*\*Calories Eaten:\*\* \*\*~(\d+)\s*kcal\*\*/);
        const protMatch = todayFile.content.match(/- \*\*Protein Eaten:\*\* \*\*~(\d+)g\*\*/);
        
        setTotals({
          calories: calMatch ? parseInt(calMatch[1]) : 0,
          protein: protMatch ? parseInt(protMatch[1]) : 0
        });

        // Parse health metrics
        const waterMatch = todayFile.content.match(/- \*\*Water Intake:\*\* \*\*([\d.]+)\s*Liters\*\*/);
        const sleepMatch = todayFile.content.match(/- \*\*Sleep:\*\* \*\*([\d.]+)\s*hours\*\* \(Quality: \*\*([^\*]+)\*\*\)/);
        const energyMatch = todayFile.content.match(/- \*\*Energy Level:\*\* \*\*(\d+)\/10\*\*/);

        if (waterMatch) setWater(parseFloat(waterMatch[1]));
        if (sleepMatch) {
          setSleepHours(parseFloat(sleepMatch[1]));
          setSleepQuality(sleepMatch[2]);
        }
        if (energyMatch) setEnergy(parseInt(energyMatch[1]));
      } else {
        setTotals({ calories: 0, protein: 0 });
        setWater(0);
        setSleepHours(0);
        setSleepQuality("Good");
        setEnergy(7);
      }
    } catch (error: any) {
      toast.error("Failed to load repo data. Verify your connection.");
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

  const handleSaveGeminiKey = () => {
    if (!geminiKeyInput.trim()) {
      toast.error("Please enter a Gemini API Key");
      return;
    }
    setGeminiKey(geminiKeyInput.trim());
    setGeminiKeyLocal(geminiKeyInput.trim());
    toast.success("Gemini API Key Saved!");
    setGeminiKeyInput("");
  };

  const handleLogout = () => {
    clearGithubToken();
    clearGeminiKey();
    setToken(null);
    setGeminiKeyLocal(null);
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
      const updatedTracker = appendBodyWeight(trackerContent, todayDate, weightNum, weightNotes);
      await updateFile("workout_tracker.md", updatedTracker, trackerSha, `Log body weight: ${weightNum} kg`);
      
      setTrackerContent(updatedTracker);
      toast.success(`Logged weight: ${weightNum} kg!`);
      setWeight("");
      setWeightNotes("");
      await loadData();
    } catch (error: any) {
      toast.error("Error saving weight log: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Health Metrics
  const handleLogHealthMetrics = async () => {
    setLoading(true);
    try {
      const logPath = `logs/${todayDate}.md`;
      const updatedLog = appendHealthMetrics(todayLog, todayDate, water, sleepHours, sleepQuality, energy);
      await updateFile(logPath, updatedLog, todaySha, `Update health metrics: Water: ${water}L, Sleep: ${sleepHours}h`);
      
      toast.success("Health metrics synced successfully!");
      await loadData();
    } catch (error: any) {
      toast.error("Error saving health metrics: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Workout Exercise
  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalExerciseName = exerciseName === "custom-input" ? customExerciseName : exerciseName;
    
    if (!finalExerciseName) {
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
        finalExerciseName,
        liftWeight,
        liftSetsReps || "*Unrecorded*",
        liftNotes
      );

      await updateFile(
        "workout_tracker.md",
        updatedTracker,
        trackerSha,
        `Log exercise: ${finalExerciseName} (${liftWeight} kg)`
      );

      toast.success(`Logged ${finalExerciseName}!`);
      setLiftWeight("");
      setLiftSetsReps("");
      setLiftNotes("");
      setAiTip("");
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
      setMealDesc("");
      setMealCals("");
      setMealProtein("");
      await loadData();
    } catch (error: any) {
      toast.error("Error saving meal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick select a favorite food
  const handleQuickLogFood = (food: typeof FAVORITE_FOODS[0]) => {
    setMealType(food.category);
    setMealDesc(`${food.name} (${food.unit})`);
    setMealCals(food.calories.toString());
    setMealProtein(food.protein.toString());
    toast.success(`Selected ${food.name}! Click Save Meal below to log it.`);
  };

  // Gemini Vision - Scan Gym Machine
  const handleScanMachine = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!geminiKey) {
      toast.error("Please add your Google Gemini API Key in the Settings tab first.");
      return;
    }

    setAiLoading(true);
    toast.info("AI is analyzing gym machine...");
    try {
      const base64 = await fileToBase64(file);
      const result = await identifyGymMachine(base64, file.type);
      
      setWorkoutCategory(result.category);
      setExerciseName(result.exercise);
      setAiTip(result.tip);
      
      toast.success(`AI identified: ${result.exercise}!`);
    } catch (err: any) {
      toast.error("AI equipment recognition failed: " + err.message);
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Gemini AI - Analyze Desi Food or Scan Plate
  const handleScanFood = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!geminiKey) {
      toast.error("Please add your Google Gemini API Key in the Settings tab first.");
      return;
    }

    setAiLoading(true);
    toast.info("AI is analyzing food plate...");
    try {
      const base64 = await fileToBase64(file);
      const result = await analyzeMeal(mealDesc, base64, file.type);
      
      setMealDesc(result.description);
      setMealCals(result.estimated_calories.toString());
      setMealProtein(result.estimated_protein.toString());
      
      toast.success("AI calculated macros successfully!");
    } catch (err: any) {
      toast.error("AI food plate scanning failed: " + err.message);
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Text-only food analyzer
  const handleAnalyzeFoodText = async () => {
    if (!mealDesc.trim()) {
      toast.error("Please describe your food first (e.g. 2 slices of Schäfer glutenfree bread)");
      return;
    }

    if (!geminiKey) {
      toast.error("Please add your Google Gemini API Key in the Settings tab first.");
      return;
    }

    setAiLoading(true);
    toast.info("AI is calculating Desi food macros...");
    try {
      const result = await analyzeMeal(mealDesc);
      
      setMealDesc(result.description);
      setMealCals(result.estimated_calories.toString());
      setMealProtein(result.estimated_protein.toString());
      
      toast.success("AI calculated macros successfully!");
    } catch (err: any) {
      toast.error("AI macro calculation failed: " + err.message);
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Retrieve past 3-5 sessions of history for a specific exercise to track progressive overload
  const getExerciseTrend = (name: string, limit: number = 3): ExerciseHistory[] => {
    const finalName = name === "custom-input" ? customExerciseName : name;
    if (!finalName) return [];

    return history
      .filter((h) => h.exercise.toLowerCase() === finalName.toLowerCase())
      .slice(0, limit); // Returns the first N items which are newest since we append at the top
  };

  const currentExerciseTrend = exerciseName ? getExerciseTrend(exerciseName, 4) : [];

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

            {/* Holistic Health & Wellness Trackers */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Heart className="size-4 text-rose-500" /> Daily Wellness Tracker
                </CardTitle>
                <CardDescription className="text-neutral-400">Keep track of hydration, sleep and physical energy</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                
                {/* Hydration */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-neutral-300 flex items-center gap-1"><Droplet className="size-3.5 text-blue-400" /> Water Intake</span>
                    <span className="text-neutral-200">{water.toFixed(1)} L / 3.0 L</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setWater(Math.max(0, water - 0.25))}
                      className="bg-neutral-950 border-neutral-800 text-xs h-7 px-2.5"
                    >
                      -250ml
                    </Button>
                    <div className="flex-1 h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (water / 3.0) * 100)}%` }}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setWater(water + 0.25)}
                      className="bg-neutral-950 border-neutral-800 text-xs h-7 px-2.5"
                    >
                      +250ml
                    </Button>
                  </div>
                </div>

                {/* Sleep tracker */}
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <Label className="text-xs text-neutral-400 flex items-center gap-1"><Moon className="size-3.5 text-purple-400" /> Sleep Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="8.0"
                      value={sleepHours || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSleepHours(parseFloat(e.target.value) || 0)}
                      className="bg-neutral-950 border-neutral-800 text-xs h-9"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <Label className="text-xs text-neutral-400">Sleep Quality</Label>
                    <Select value={sleepQuality} onValueChange={(val: any) => setSleepQuality(val)}>
                      <SelectTrigger className="bg-neutral-950 border-neutral-800 text-xs h-9">
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800 text-neutral-100 text-xs">
                        <SelectItem value="Excellent">🔋 Excellent</SelectItem>
                        <SelectItem value="Good">⚡ Good</SelectItem>
                        <SelectItem value="Restless">⚠️ Restless</SelectItem>
                        <SelectItem value="Poor">🪫 Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Energy slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-neutral-400 flex items-center gap-1"><Zap className="size-3.5 text-yellow-400" /> Daily Energy</span>
                    <span className="text-neutral-200 font-bold">{energy}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energy}
                    onChange={(e) => setEnergy(parseInt(e.target.value))}
                    className="w-full accent-primary bg-neutral-950 border border-neutral-800 rounded-lg h-2"
                  />
                </div>

              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  onClick={handleLogHealthMetrics} 
                  disabled={loading}
                  className="w-full bg-neutral-800 text-white hover:bg-neutral-700 font-semibold gap-2 border border-neutral-700 text-xs"
                >
                  <Save className="size-3.5" /> Sync Health Stats to Git
                </Button>
              </CardFooter>
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
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === "workout" && (
          <form onSubmit={handleLogWorkout} className="flex flex-col gap-4">
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                    <Dumbbell className="size-5 text-primary" /> Log Exercise
                  </CardTitle>
                  
                  {/* AI Vision Scanner Button */}
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      ref={machineFileRef} 
                      onChange={handleScanMachine} 
                      className="hidden" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      disabled={aiLoading}
                      onClick={() => machineFileRef.current?.click()}
                      className="bg-primary/10 border-primary/20 hover:bg-primary/20 hover:text-primary text-primary font-semibold text-xs h-8 gap-1.5"
                    >
                      <Camera className="size-3.5" /> AI Scan Machine
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-neutral-400">Select exercise or scan gym equipment with AI</CardDescription>
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
                      {EXERCISES[workoutCategory]?.map((ex, i) => (
                        <SelectItem key={i} value={ex}>{ex}</SelectItem>
                      ))}
                      <SelectItem value="custom-input">+ Add Custom Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Exercise Input */}
                {exerciseName === "custom-input" && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-neutral-300">Custom Exercise Name</Label>
                    <Input
                      placeholder="e.g. Incline Dumbbell Fly"
                      value={customExerciseName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomExerciseName(e.target.value)}
                      className="bg-neutral-950 border-neutral-800"
                    />
                  </div>
                )}

                {/* AI Machine Safety Tip Banner */}
                {aiTip && (
                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs p-3 rounded-lg flex items-start gap-2">
                    <Info className="size-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-orange-400">AI Form Coach:</span> {aiTip}
                    </div>
                  </div>
                )}

                {/* PROGRESSIVE OVERLOAD / TREND SECTION */}
                {exerciseName && (
                  <div className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                      <TrendingUp className="size-4 text-yellow-500" /> 
                      <span>Progressive Overload Trend (Last 3 Sessions)</span>
                    </div>
                    {currentExerciseTrend.length > 0 ? (
                      <div className="divide-y divide-neutral-800/40 mt-1">
                        {currentExerciseTrend.map((h, i) => (
                          <div key={i} className="flex justify-between py-1.5 text-[11px] text-neutral-400">
                            <span>{h.date}</span>
                            <span className="font-bold text-neutral-200">{h.weight}</span>
                            <span>{h.setsReps}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500 italic mt-0.5">
                        No previous logs found for this lift. Time to establish a baseline! 🎯
                      </p>
                    )}
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
                  disabled={loading || aiLoading}
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
          <div className="flex flex-col gap-4">
            
            {/* Quick Favorites Log */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-white">
                  <Heart className="size-4 text-rose-500 fill-rose-500" /> Favorites & Desi Staples
                </CardTitle>
                <CardDescription className="text-neutral-400">One-tap select to populate macros instantly</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {FAVORITE_FOODS.map((food, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleQuickLogFood(food)}
                      className="text-[11px] font-semibold px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-md transition"
                    >
                      {food.name} <span className="text-neutral-500 text-[10px] font-normal">({food.calories}kcal)</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unified AI-Powered Meal Logger */}
            <form onSubmit={handleLogMeal}>
              <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 border-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                    <Utensils className="size-5 text-emerald-500" /> Log Meal Details
                  </CardTitle>
                  <CardDescription className="text-neutral-400">Manual entry with AI auto-fill capability</CardDescription>
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

                  {/* Meal Description and AI Trigger */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="meal-desc" className="text-xs text-neutral-300">What did you eat?</Label>
                    <div className="flex gap-2">
                      <Input
                        id="meal-desc"
                        placeholder="e.g. 2 slices glutenfree Schäfer bread with butter"
                        value={mealDesc}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMealDesc(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 flex-1"
                      />
                    </div>

                    {/* Integrated AI Assistant Actions */}
                    <div className="flex gap-2 mt-1">
                      {/* Text Macro calculation trigger */}
                      <Button
                        type="button"
                        disabled={aiLoading}
                        onClick={handleAnalyzeFoodText}
                        className="flex-1 bg-primary/10 hover:bg-primary/20 hover:text-primary text-primary border border-primary/20 text-xs h-8 font-semibold gap-1"
                      >
                        <Brain className="size-3.5" /> 🪄 AI Auto-Fill Macros
                      </Button>

                      {/* Photo scanner trigger */}
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          ref={foodFileRef} 
                          onChange={handleScanFood} 
                          className="hidden" 
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={aiLoading}
                          onClick={() => foodFileRef.current?.click()}
                          className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 hover:text-white text-xs h-8 gap-1 font-semibold text-neutral-400"
                        >
                          <Camera className="size-3.5" /> 📷 AI Scan Plate
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Calculated/Manual calories & protein parameters */}
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
                    disabled={loading || aiLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                  >
                    <Save className="size-4" /> Save Meal Entry
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-5">
            {/* Connection settings */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Settings className="size-5 text-neutral-400" /> Git Sync Settings
                </CardTitle>
                <CardDescription className="text-neutral-400">Connected private Git storage</CardDescription>
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

            {/* Google Gemini settings */}
            <Card className="bg-neutral-900 border-neutral-800 text-neutral-100 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <Brain className="size-5 text-primary" /> Google Gemini API Settings
                </CardTitle>
                <CardDescription className="text-neutral-400">Required for AI camera plate scan & gym machine scanner</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-2 border-b border-neutral-800/80 text-sm">
                  <span className="text-neutral-400 font-medium">Gemini API Status</span>
                  <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${geminiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {geminiKey ? 'CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="gemini-key" className="text-xs text-neutral-300">Set/Change API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gemini-key"
                      type="password"
                      placeholder="AIzaSy******************"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 focus-visible:ring-primary text-xs"
                    />
                    <Button 
                      onClick={handleSaveGeminiKey}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-3"
                    >
                      Save Key
                    </Button>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 leading-normal bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg flex flex-col gap-1">
                  <p className="font-semibold text-neutral-300">How to get a free API Key:</p>
                  <ol className="list-decimal list-inside flex flex-col gap-0.5">
                    <li>Go to <b>Google AI Studio</b> (ai.google.dev).</li>
                    <li>Click <b>"Get API Key"</b> &rarr; Create Key.</li>
                    <li>Paste your key above. It is stored 100% locally on your phone.</li>
                  </ol>
                </div>
              </CardContent>
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
