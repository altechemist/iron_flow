export type ExerciseCategory = 'compound' | 'isolation';
export type DayType = 'A' | 'B' | 'C';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  targetReps: number;
  targetSets: number;
  intensityRange: [number, number]; // [min, max] percentage of 1RM
  equipment: Equipment[];
  instructions?: string[];
  muscleGroup?: string; // Added to help with bodyweight mapping
}

export interface SetLog {
  weight: number;
  reps: number;
  timestamp: number;
  isWarmup?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: number;
  dayType: DayType;
  exercises: ExerciseLog[];
  duration: number; // in minutes
}

export interface WeightEntry {
  date: number;
  weight: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  dayType: DayType;
  exerciseIds: string[];
}

export type Goal = 'strength' | 'hypertrophy' | 'fitness';

export interface UserProfile {
  name: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: Goal;
  units: 'kg' | 'lbs';
  currentDay: DayType;
  oneRMs: Record<string, number>; // exerciseId -> estimated 1RM
  desiredWorkoutTime: number; // in minutes
  onboarded: boolean;
  customExercises: Exercise[];
  availableEquipment: Equipment[];
  weightHistory: WeightEntry[];
  templates: WorkoutTemplate[];
  workoutMode: 'standard' | 'bodyweight';
  morningRoutineCompleted?: Record<string, boolean>; // date string -> boolean
}

export const DEFAULT_EXERCISES: Exercise[] = [
  { 
    id: 'squat', 
    name: 'Back Squat', 
    category: 'compound', 
    targetReps: 5, 
    targetSets: 3, 
    intensityRange: [0.8, 0.85], 
    equipment: ['barbell'],
    instructions: [
      'Place bar on upper traps',
      'Feet shoulder-width apart',
      'Descend until thighs are parallel to floor',
      'Drive through heels to return to start'
    ]
  },
  { 
    id: 'bench', 
    name: 'Bench Press', 
    category: 'compound', 
    targetReps: 5, 
    targetSets: 3, 
    intensityRange: [0.8, 0.85], 
    equipment: ['barbell', 'dumbbell'],
    instructions: [
      'Lie flat on bench',
      'Grip bar slightly wider than shoulders',
      'Lower bar to mid-chest',
      'Press bar back up until arms are locked'
    ]
  },
  { 
    id: 'deadlift', 
    name: 'Deadlift', 
    category: 'compound', 
    targetReps: 5, 
    targetSets: 1, 
    intensityRange: [0.8, 0.85], 
    equipment: ['barbell'],
    instructions: [
      'Stand with mid-foot under the bar',
      'Bend over and grab the bar with shoulder-width grip',
      'Bend knees until shins touch the bar',
      'Lift chest and pull bar up along shins'
    ]
  },
  { 
    id: 'ohp', 
    name: 'Overhead Press', 
    category: 'compound', 
    targetReps: 5, 
    targetSets: 3, 
    intensityRange: [0.8, 0.85], 
    equipment: ['barbell', 'dumbbell'],
    instructions: [
      'Hold bar at shoulder height',
      'Press bar straight up overhead',
      'Lock elbows at the top',
      'Lower bar back to shoulders'
    ]
  },
  { 
    id: 'row', 
    name: 'Barbell Row', 
    category: 'compound', 
    targetReps: 8, 
    targetSets: 3, 
    intensityRange: [0.7, 0.8], 
    equipment: ['barbell', 'dumbbell'],
    instructions: [
      'Bend over at 45 degrees',
      'Pull bar to lower chest',
      'Squeeze shoulder blades together',
      'Lower bar under control'
    ]
  },
  { 
    id: 'pullup', 
    name: 'Pull-ups', 
    category: 'compound', 
    targetReps: 10, 
    targetSets: 3, 
    intensityRange: [0.7, 0.8], 
    equipment: ['bodyweight'],
    instructions: [
      'Grip bar with palms facing away',
      'Pull chest to the bar',
      'Lower until arms are fully extended',
      'Avoid swinging or using momentum'
    ]
  },
  { 
    id: 'curl', 
    name: 'Bicep Curls', 
    category: 'isolation', 
    targetReps: 12, 
    targetSets: 3, 
    intensityRange: [0.6, 0.7], 
    equipment: ['dumbbell', 'cable', 'barbell'],
    instructions: [
      'Hold weights with palms facing forward',
      'Curl weights toward shoulders',
      'Keep elbows tucked at sides',
      'Lower weights slowly'
    ]
  },
  { 
    id: 'tricep', 
    name: 'Tricep Extensions', 
    category: 'isolation', 
    targetReps: 12, 
    targetSets: 3, 
    intensityRange: [0.6, 0.7], 
    equipment: ['cable', 'dumbbell'],
    instructions: [
      'Hold weight overhead with both hands',
      'Lower weight behind head by bending elbows',
      'Extend arms to return to start',
      'Keep upper arms stationary'
    ]
  },
  // Bodyweight Alternatives
  { 
    id: 'pushup', 
    name: 'Push-ups', 
    category: 'compound', 
    targetReps: 15, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'chest',
    instructions: [
      'Place hands slightly wider than shoulders',
      'Keep body in a straight line',
      'Lower chest to the floor',
      'Push back up to start'
    ]
  },
  { 
    id: 'incline_pushup', 
    name: 'Incline Push-ups', 
    category: 'compound', 
    targetReps: 15, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'chest',
    instructions: [
      'Place hands on an elevated surface',
      'Keep body straight',
      'Lower chest to the surface',
      'Push back up'
    ]
  },
  { 
    id: 'decline_pushup', 
    name: 'Decline Push-ups', 
    category: 'compound', 
    targetReps: 12, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'chest',
    instructions: [
      'Place feet on an elevated surface',
      'Hands on the floor',
      'Lower chest to the floor',
      'Push back up'
    ]
  },
  { 
    id: 'jump_squat', 
    name: 'Jump Squats', 
    category: 'compound', 
    targetReps: 12, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'legs',
    instructions: [
      'Squat down normally',
      'Explosively jump upwards',
      'Land softly and go into the next rep'
    ]
  },
  { 
    id: 'lunge', 
    name: 'Walking Lunges', 
    category: 'compound', 
    targetReps: 20, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'legs',
    instructions: [
      'Step forward with one leg',
      'Lower hips until both knees are bent at 90 degrees',
      'Push off back foot to step forward'
    ]
  },
  { 
    id: 'bodyweight_squat', 
    name: 'Air Squats', 
    category: 'compound', 
    targetReps: 20, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'legs',
    instructions: [
      'Feet shoulder-width apart',
      'Squat down until thighs are parallel',
      'Keep chest up and back straight'
    ]
  },
  { 
    id: 'inverted_row', 
    name: 'Inverted Rows', 
    category: 'compound', 
    targetReps: 12, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'back',
    instructions: [
      'Lie under a low bar',
      'Pull chest to the bar',
      'Keep body straight',
      'Lower under control'
    ]
  },
  { 
    id: 'glute_bridge', 
    name: 'Glute Bridges', 
    category: 'isolation', 
    targetReps: 20, 
    targetSets: 3, 
    intensityRange: [0, 0], 
    equipment: ['bodyweight'],
    muscleGroup: 'glutes',
    instructions: [
      'Lie on back with knees bent',
      'Lift hips toward ceiling',
      'Squeeze glutes at the top',
      'Lower hips back down'
    ]
  },
];

export const WORKOUT_PLANS: Record<DayType, string[]> = {
  'A': ['squat', 'bench', 'row'],
  'B': ['deadlift', 'ohp', 'pullup'],
  'C': ['squat', 'bench', 'curl', 'tricep'], // Example C day
};
