import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Exercise, DEFAULT_EXERCISES, DayType, Equipment, ExerciseCategory } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Epley Formula for 1RM estimation
 * 1RM = weight * (1 + reps / 30)
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Calculate training weight based on intensity percentage
 */
export function calculateTrainingWeight(oneRM: number, intensity: number): number {
  return Math.round((oneRM * intensity) / 2.5) * 2.5; // Round to nearest 2.5kg
}

/**
 * Progression logic
 */
export function getProgressionSuggestion(reps: number, targetReps: number): 'increase' | 'maintain' | 'reduce' {
  if (reps > targetReps) return 'increase';
  if (reps === targetReps) return 'maintain';
  return 'reduce';
}

/**
 * Generate a workout plan based on desired time, day type, and custom exercises
 */
export function generateWorkoutPlan(
  day: DayType, 
  desiredTime: number, 
  customExercises: Exercise[] = [], 
  availableEquipment: Equipment[] = ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'],
  isBodyweightOnly: boolean = false
): Exercise[] {
  // Time estimates (minutes per set including rest)
  const COMPOUND_TIME_PER_SET = 4;
  const ISOLATION_TIME_PER_SET = 2;
  
  const allExercises = [...DEFAULT_EXERCISES, ...(customExercises || [])];
  
  // Filter by equipment
  let filteredExercises = allExercises.filter(ex => 
    ex.equipment.some(eq => (availableEquipment || []).includes(eq))
  );

  if (isBodyweightOnly) {
    filteredExercises = allExercises.filter(ex => ex.equipment.includes('bodyweight'));
  }

  const compounds = filteredExercises.filter(e => e.category === 'compound');
  const isolations = filteredExercises.filter(e => e.category === 'isolation');
  
  let remainingTime = desiredTime;
  const plan: Exercise[] = [];
  
  // Mapping for bodyweight alternatives if isBodyweightOnly
  const getExerciseId = (standardId: string) => {
    if (!isBodyweightOnly) return standardId;
    
    const mapping: Record<string, string> = {
      'squat': 'bodyweight_squat',
      'bench': 'pushup',
      'deadlift': 'glute_bridge',
      'ohp': 'decline_pushup',
      'row': 'inverted_row',
      'pullup': 'pullup'
    };
    return mapping[standardId] || standardId;
  };

  const primaryCompoundId = getExerciseId(day === 'A' ? 'squat' : day === 'B' ? 'bench' : 'deadlift');
  const secondaryCompoundId = getExerciseId(day === 'A' ? 'ohp' : day === 'B' ? 'row' : 'pullup');
  
  const addExercise = (id: string) => {
    const ex = filteredExercises.find(e => e.id === id);
    if (!ex) return;
    
    if (plan.find(p => p.id === ex.id)) return;

    const timePerSet = ex.category === 'compound' ? COMPOUND_TIME_PER_SET : ISOLATION_TIME_PER_SET;
    const totalExTime = ex.targetSets * timePerSet;
    
    if (remainingTime >= totalExTime) {
      plan.push(ex);
      remainingTime -= totalExTime;
    }
  };
  
  // 1. Primary Compound
  addExercise(primaryCompoundId);
  
  // 2. Secondary Compound
  addExercise(secondaryCompoundId);
  
  // 3. Fill with other compounds if time permits
  compounds.forEach(c => {
    addExercise(c.id);
  });
  
  // 4. Fill remaining time with isolations
  isolations.forEach(i => {
    addExercise(i.id);
  });
  
  return plan;
}

export function calculateSmartRest(category: ExerciseCategory, intensity: number): number {
  if (category === 'compound') {
    if (intensity >= 0.85) return 180; // 3 mins for heavy
    if (intensity >= 0.75) return 120; // 2 mins
    return 90; // 1.5 mins
  }
  return 60; // 1 min for isolation
}
