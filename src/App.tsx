import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ChevronRight, 
  Dumbbell, 
  History as HistoryIcon, 
  Home, 
  Library, 
  Plus, 
  Settings, 
  Trophy, 
  Timer, 
  Check, 
  Minus, 
  ArrowRight,
  Clock,
  Share2,
  Zap,
  ArrowUpRight,
  LogOut,
  Download,
  Sun,
  Moon,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  getDocs,
  where,
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn, calculate1RM, calculateTrainingWeight, generateWorkoutPlan, calculateSmartRest } from './lib/utils';
import { 
  UserProfile, 
  WorkoutLog, 
  Exercise, 
  DEFAULT_EXERCISES, 
  WORKOUT_PLANS, 
  DayType,
  ExerciseLog,
  SetLog,
  Equipment,
  Goal
} from './types';

// --- Firebase Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ErrorBoundary = class extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6 bg-surface-container p-8 rounded-3xl border border-outline-variant/20 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Zap className="text-red-500" size={32} />
            </div>
            <h2 className="font-headline text-3xl font-black uppercase tracking-tighter">ENGINE FAILURE</h2>
            <p className="text-on-surface-variant text-sm">
              The strength engine encountered an unexpected error. Your progress is safe in local storage.
            </p>
            <div className="p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-400 font-mono">
                {this.state.error?.message}
              </code>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              REBOOT ENGINE
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Card = ({ children, className, variant = 'default', ...props }: { children: React.ReactNode, className?: string, variant?: 'default' | 'low' | 'high' | 'highest' } & React.HTMLAttributes<HTMLDivElement>) => {
  const variants = {
    default: 'bg-surface-container',
    low: 'bg-surface-container',
    high: 'bg-surface-container-high',
    highest: 'bg-surface-container-highest'
  };
  return (
    <div className={cn("rounded-xl p-6 border border-outline-variant/10", variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, className, variant = 'primary', size = 'md', disabled = false }) => {
  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100',
    secondary: 'bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100',
    ghost: 'bg-transparent text-on-surface-variant hover:text-primary transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn("rounded-xl font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-2", variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  );
};

// --- Views ---

const EQUIPMENT_OPTIONS: { id: Equipment, label: string }[] = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'machine', label: 'Machines' },
  { id: 'cable', label: 'Cables' },
  { id: 'bodyweight', label: 'Bodyweight' },
];

const STRETCHING_EXERCISES = [
  { name: 'Arm Circles', duration: 30, instructions: 'Rotate arms in large circles to warm up shoulders.' },
  { name: 'Leg Swings', duration: 30, instructions: 'Swing each leg forward and backward to loosen hips.' },
  { name: 'Cat-Cow', duration: 45, instructions: 'Alternate between arching and rounding your back on all fours.' },
  { name: 'Dynamic Lunges', duration: 45, instructions: 'Step forward into a lunge, alternating legs.' },
  { name: 'Child\'s Pose', duration: 60, instructions: 'Rest your hips on your heels and stretch arms forward.' },
  { name: 'Cobra Stretch', duration: 45, instructions: 'Lie on your stomach and push your chest up.' },
  { name: 'Hamstring Stretch', duration: 45, instructions: 'Reach for your toes while keeping legs straight.' },
];

const StretchingView = ({ onComplete, title }: { onComplete: () => void, title: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STRETCHING_EXERCISES[0].duration);
  const [isPaused, setIsPaused] = useState(false);
  const current = STRETCHING_EXERCISES[currentIndex];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (currentIndex < STRETCHING_EXERCISES.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return STRETCHING_EXERCISES[currentIndex + 1].duration;
          } else {
            clearInterval(timer);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < STRETCHING_EXERCISES.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(STRETCHING_EXERCISES[currentIndex + 1].duration);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500 p-6">
      <div className="space-y-2">
        <p className="font-headline text-secondary text-[10px] tracking-[0.3em] font-bold uppercase">{title}</p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter leading-none">{current.name}</h2>
        <p className="text-on-surface-variant text-xs max-w-xs mx-auto mt-2 leading-relaxed">{current.instructions}</p>
      </div>

      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-container-highest" />
          <circle
            cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent"
            strokeDasharray={653.45}
            strokeDashoffset={653.45 * (1 - timeLeft / current.duration)}
            className="text-primary transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-headline text-7xl font-bold leading-none">{timeLeft}</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">SECONDS</span>
        </div>
      </div>

      <div className="space-y-4 w-full max-w-xs">
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => setIsPaused(!isPaused)} className="flex-1">
            {isPaused ? 'RESUME' : 'PAUSE'}
          </Button>
          <Button variant="secondary" onClick={handleNext} className="flex-1">NEXT</Button>
        </div>
        <Button variant="ghost" onClick={onComplete} className="w-full text-error">END SESSION EARLY</Button>
      </div>

      <div className="flex gap-1">
        {STRETCHING_EXERCISES.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 w-4 rounded-full transition-all",
              i === currentIndex ? "bg-primary w-8" : i < currentIndex ? "bg-primary/40" : "bg-surface-container-highest"
            )}
          />
        ))}
      </div>
    </div>
  );
};

const MorningRoutine = ({ onComplete }: { onComplete: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const routines = [
    { name: 'Cat-Cow', duration: 45, instructions: 'Loosen up the spine and core.' },
    { name: 'Bird-Dog', duration: 45, instructions: 'Core stability and balance.' },
    { name: 'Dead Bug', duration: 45, instructions: 'Deep core activation.' },
    { name: 'Plank', duration: 60, instructions: 'Full body stability.' },
    { name: 'World\'s Greatest Stretch', duration: 60, instructions: 'Full body mobility.' },
  ];
  const [timeLeft, setTimeLeft] = useState(routines[0].duration);
  const [isPaused, setIsPaused] = useState(false);
  const current = routines[currentIndex];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (currentIndex < routines.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return routines[currentIndex + 1].duration;
          } else {
            clearInterval(timer);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < routines.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(routines[currentIndex + 1].duration);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500 p-6">
      <div className="space-y-2">
        <p className="font-headline text-primary text-[10px] tracking-[0.3em] font-bold uppercase">MORNING MOBILITY</p>
        <h2 className="font-headline text-4xl font-black uppercase tracking-tighter leading-none">{current.name}</h2>
        <p className="text-on-surface-variant text-xs max-w-xs mx-auto mt-2 leading-relaxed">{current.instructions}</p>
      </div>

      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-container-highest" />
          <circle
            cx="112" cy="112" r="104" stroke="currentColor" strokeWidth="8" fill="transparent"
            strokeDasharray={653.45}
            strokeDashoffset={653.45 * (1 - timeLeft / current.duration)}
            className="text-primary transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-headline text-7xl font-bold leading-none">{timeLeft}</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">SECONDS</span>
        </div>
      </div>

      <div className="space-y-4 w-full max-w-xs">
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => setIsPaused(!isPaused)} className="flex-1">
            {isPaused ? 'RESUME' : 'PAUSE'}
          </Button>
          <Button variant="secondary" onClick={handleNext} className="flex-1">NEXT</Button>
        </div>
        <Button variant="ghost" onClick={onComplete} className="w-full">SKIP ROUTINE</Button>
      </div>

      <div className="flex gap-1">
        {routines.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 w-4 rounded-full transition-all",
              i === currentIndex ? "bg-primary w-8" : i < currentIndex ? "bg-primary/40" : "bg-surface-container-highest"
            )}
          />
        ))}
      </div>
    </div>
  );
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-surface z-[100] flex flex-col items-center justify-center p-8 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] border border-primary/20 rounded-full"
          />
          <Activity className="text-primary w-24 h-24" />
        </div>
        <div className="text-center">
          <h1 className="font-headline text-5xl font-black tracking-[0.2em] text-primary uppercase">IRONFLOW</h1>
          <p className="font-headline text-on-surface-variant text-xs tracking-[0.4em] font-bold mt-2 uppercase">High-Performance Strength Engine</p>
        </div>
      </motion.div>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 h-1 bg-primary"
      />
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: (profile: UserProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [prs, setPrs] = useState<Record<string, number>>({
    'squat': 100,
    'bench': 80,
    'deadlift': 120,
    'ohp': 50
  });
  const [time, setTime] = useState(60);
  const [units, setUnits] = useState<'kg' | 'lbs'>('kg');
  const [goal, setGoal] = useState<Goal>('strength');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'bodyweight']);

  const toggleEquipment = (id: Equipment) => {
    setSelectedEquipment(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      onComplete({
        name: auth.currentUser?.displayName || 'Athlete',
        experienceLevel: 'intermediate',
        goal,
        units,
        currentDay: 'A',
        oneRMs: prs,
        desiredWorkoutTime: time,
        onboarded: true,
        customExercises: [],
        availableEquipment: selectedEquipment,
        weightHistory: [],
        templates: [],
        workoutMode: 'standard',
        morningRoutineCompleted: {}
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col p-8 max-w-2xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-8"
          >
            <div className="space-y-2">
              <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold uppercase">WELCOME TO THE LAB</p>
              <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">INITIALIZE YOUR PERFORMANCE</h2>
            </div>
            <Card variant="low" className="space-y-6">
              <div className="space-y-4">
                <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">PREFERRED UNITS</label>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant={units === 'kg' ? 'primary' : 'secondary'}
                    onClick={() => setUnits('kg')}
                    className="py-4"
                  >
                    KG
                  </Button>
                  <Button 
                    variant={units === 'lbs' ? 'primary' : 'secondary'}
                    onClick={() => setUnits('lbs')}
                    className="py-4"
                  >
                    LBS
                  </Button>
                </div>
              </div>
            </Card>
            <Button onClick={handleNext} className="w-full py-6 text-xl">CONTINUE</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-8"
          >
            <div className="space-y-2">
              <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold uppercase">OBJECTIVE</p>
              <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">WHAT IS YOUR PRIMARY GOAL?</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'strength', label: 'MAX STRENGTH', desc: 'Focus on heavy compound lifts and low reps.' },
                { id: 'hypertrophy', label: 'MUSCLE GROWTH', desc: 'Focus on volume and moderate rep ranges.' },
                { id: 'fitness', label: 'GENERAL FITNESS', desc: 'Focus on consistency and overall health.' }
              ].map(g => (
                <Button 
                  key={g.id}
                  variant={goal === g.id ? 'primary' : 'secondary'}
                  onClick={() => setGoal(g.id as Goal)}
                  className="flex-col items-start p-6 h-auto"
                >
                  <span className="text-lg">{g.label}</span>
                  <span className="text-[10px] opacity-60 normal-case font-sans mt-1">{g.desc}</span>
                </Button>
              ))}
            </div>
            <Button onClick={handleNext} className="w-full py-6 text-xl">CONTINUE</Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-8"
          >
            <div className="space-y-2">
              <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold uppercase">BENCHMARKS</p>
              <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">ESTABLISH YOUR BASELINE</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {['squat', 'bench', 'deadlift', 'ohp'].map(id => (
                <Card key={id} variant="low" className="flex items-center justify-between p-4">
                  <span className="font-headline font-bold uppercase tracking-tight">{id.toUpperCase()}</span>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      value={prs[id]} 
                      onChange={(e) => setPrs({...prs, [id]: Number(e.target.value)})}
                      className="bg-surface-container-highest border-none rounded-lg p-2 w-24 text-center font-headline font-bold text-primary focus:ring-1 focus:ring-primary"
                    />
                    <span className="font-headline text-xs text-on-surface-variant font-bold">{units}</span>
                  </div>
                </Card>
              ))}
            </div>
            <Button onClick={handleNext} className="w-full py-6 text-xl">CONTINUE</Button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-8"
          >
            <div className="space-y-2">
              <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold uppercase">EQUIPMENT</p>
              <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">WHAT TOOLS ARE AVAILABLE?</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {EQUIPMENT_OPTIONS.map(opt => (
                <Button
                  key={opt.id}
                  variant={selectedEquipment.includes(opt.id) ? 'primary' : 'secondary'}
                  onClick={() => toggleEquipment(opt.id)}
                  className="justify-between p-6"
                >
                  <span>{opt.label}</span>
                  {selectedEquipment.includes(opt.id) && <Check size={20} />}
                </Button>
              ))}
            </div>
            <Button onClick={handleNext} className="w-full py-6 text-xl">CONTINUE</Button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div 
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center space-y-8"
          >
            <div className="space-y-2">
              <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold uppercase">PROTOCOL PARAMETERS</p>
              <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">DEFINE YOUR TRAINING WINDOW</h2>
            </div>
            <Card variant="low" className="space-y-6">
              <div className="space-y-4">
                <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">DESIRED WORKOUT TIME (MINUTES)</label>
                <div className="flex items-center justify-center gap-8">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-12 h-12 rounded-full p-0"
                    onClick={() => setTime(Math.max(30, time - 15))}
                  >
                    <Minus size={24} />
                  </Button>
                  <div className="text-center">
                    <span className="font-headline text-7xl font-black text-primary">{time}</span>
                    <p className="font-headline text-xs text-on-surface-variant font-bold uppercase tracking-widest">MIN</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-12 h-12 rounded-full p-0"
                    onClick={() => setTime(Math.min(180, time + 15))}
                  >
                    <Plus size={24} />
                  </Button>
                </div>
              </div>
            </Card>
            <Button onClick={handleNext} className="w-full py-6 text-xl">INITIALIZE ENGINE</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dashboard = ({ profile, lastWorkout, onStartWorkout, onUpdateEquipment, onUpdateMode, onOpenCustomWorkout }: { 
  profile: UserProfile, 
  lastWorkout?: WorkoutLog, 
  onStartWorkout: (plan?: Exercise[]) => void,
  onUpdateEquipment: (eq: Equipment[]) => void,
  onUpdateMode: (mode: 'standard' | 'bodyweight') => void,
  onOpenCustomWorkout: () => void
}) => {
  const initialPlan = generateWorkoutPlan(profile.currentDay, profile.desiredWorkoutTime, profile.customExercises, profile.availableEquipment, profile.workoutMode === 'bodyweight');
  const [currentPlan, setCurrentPlan] = useState<Exercise[]>(initialPlan);
  const [showPreview, setShowPreview] = useState(false);
  const [showEquipmentFilter, setShowEquipmentFilter] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  useEffect(() => {
    setCurrentPlan(generateWorkoutPlan(profile.currentDay, profile.desiredWorkoutTime, profile.customExercises, profile.availableEquipment, profile.workoutMode === 'bodyweight'));
  }, [profile.currentDay, profile.desiredWorkoutTime, profile.availableEquipment, profile.workoutMode]);

  const toggleEquipment = (id: Equipment) => {
    const currentEq = profile.availableEquipment || [];
    const newEq = currentEq.includes(id)
      ? currentEq.filter(e => e !== id)
      : [...currentEq, id];
    onUpdateEquipment(newEq);
  };

  const removeExercise = (id: string) => {
    setCurrentPlan(prev => prev.filter(ex => ex.id !== id));
  };

  const addExercise = (ex: Exercise) => {
    if (currentPlan.find(e => e.id === ex.id)) return;
    setCurrentPlan(prev => [...prev, ex]);
    setShowAddExercise(false);
  };

  const allExercises = [...DEFAULT_EXERCISES, ...(profile.customExercises || [])];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <div className="flex gap-2 p-1 bg-surface-container-highest rounded-xl">
          <button 
            onClick={() => onUpdateMode('standard')}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
              profile.workoutMode === 'standard' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant hover:text-primary"
            )}
          >
            STANDARD ENGINE
          </button>
          <button 
            onClick={() => onUpdateMode('bodyweight')}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
              profile.workoutMode === 'bodyweight' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant hover:text-primary"
            )}
          >
            BODYWEIGHT ONLY
          </button>
        </div>

        <div 
          onClick={() => setShowPreview(true)}
          className="relative group cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-container p-8 shadow-2xl transition-transform active:scale-95 duration-150"
        >
          <div className="flex flex-col gap-4 relative z-10">
            <div>
              <span className="font-headline text-[10px] font-extrabold tracking-[0.2em] text-on-primary uppercase opacity-70">
                {profile.workoutMode === 'bodyweight' ? 'BODYWEIGHT PROTOCOL' : 'ACTIVE PROTOCOL'}
              </span>
              <h1 className="font-headline text-4xl font-bold text-on-primary leading-none tracking-tighter">START WORKOUT - DAY {profile.currentDay}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentPlan.map(ex => (
                <span key={ex.id} className="px-2 py-1 bg-on-primary/10 rounded text-[10px] font-bold text-on-primary uppercase tracking-widest border border-on-primary/20">
                  {ex.name}
                </span>
              ))}
            </div>
          </div>
          <Activity className="absolute right-[-10px] bottom-[-10px] w-32 h-32 text-on-primary opacity-10" />
        </div>
      </section>

      <div className="flex gap-4">
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-1 py-4"
          onClick={() => setShowEquipmentFilter(true)}
        >
          <Settings size={16} className="mr-2" /> EQUIPMENT FILTER
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-1 py-4"
          onClick={onOpenCustomWorkout}
        >
          <Plus size={16} className="mr-2" /> CUSTOM WORKOUT
        </Button>
      </div>

      <AnimatePresence>
        {showEquipmentFilter && (
          <div className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container max-w-md w-full rounded-2xl p-8 shadow-2xl border border-outline-variant/20"
            >
              <h3 className="font-headline text-2xl font-bold uppercase mb-6 tracking-tighter">AVAILABLE TOOLS</h3>
              <div className="grid grid-cols-1 gap-3 mb-8">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <Button
                    key={opt.id}
                    variant={profile.availableEquipment.includes(opt.id) ? 'primary' : 'secondary'}
                    onClick={() => toggleEquipment(opt.id)}
                    className="justify-between p-4"
                  >
                    <span className="text-sm">{opt.label}</span>
                    {profile.availableEquipment.includes(opt.id) && <Check size={16} />}
                  </Button>
                ))}
              </div>
              <Button onClick={() => setShowEquipmentFilter(false)} className="w-full">UPDATE PROTOCOL</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface-container max-w-md w-full rounded-2xl p-8 shadow-2xl border border-outline-variant/20 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="font-headline text-secondary text-[10px] tracking-[0.3em] font-bold uppercase mb-1">PROTOCOL PREVIEW</p>
                  <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">DAY {profile.currentDay}</h2>
                </div>
                <button onClick={() => setShowPreview(false)} className="text-on-surface-variant hover:text-primary">
                  <Minus size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {currentPlan.map((ex, i) => (
                  <div key={ex.id} className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl border-l-2 border-primary/30">
                    <div className="flex items-center gap-4">
                      <span className="font-headline text-on-surface-variant/30 font-bold">0{i + 1}</span>
                      <span className="font-headline font-bold uppercase tracking-tight">{ex.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-headline text-xs text-on-surface-variant font-bold">{ex.targetSets} × {ex.targetReps}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1 text-error/50 hover:text-error"
                        onClick={() => removeExercise(ex.id)}
                      >
                        <Minus size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="secondary"
                  onClick={() => setShowAddExercise(true)}
                  className="w-full p-4 border-2 border-dashed border-outline-variant/20 bg-transparent hover:border-primary text-on-surface-variant hover:text-primary transition-all text-xs"
                >
                  <Plus size={16} /> ADD EXERCISE
                </Button>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setShowPreview(false)} className="flex-1">CANCEL</Button>
                <Button onClick={() => onStartWorkout(currentPlan)} className="flex-1">INITIALIZE</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddExercise && (
          <div className="fixed inset-0 bg-surface/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface-container max-w-md w-full rounded-2xl p-8 shadow-2xl border border-outline-variant/20 max-h-[70vh] overflow-y-auto"
            >
              <h3 className="font-headline text-2xl font-bold uppercase mb-6 tracking-tighter">SELECT EXERCISE</h3>
              <div className="space-y-2">
                {allExercises.map(ex => (
                  <Button
                    key={ex.id}
                    variant="secondary"
                    onClick={() => addExercise(ex)}
                    className="w-full p-4 justify-between"
                  >
                    <span>{ex.name}</span>
                    <Plus size={16} />
                  </Button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setShowAddExercise(false)} className="w-full mt-6">CLOSE</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile.templates && profile.templates.length > 0 && (
          <Card className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-headline text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">SAVED TEMPLATES</p>
              <Library className="text-primary w-4 h-4" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.templates.map(template => (
                <Button 
                  key={template.id}
                  variant="secondary"
                  onClick={() => {
                    const plan = template.exerciseIds.map(id => 
                      allExercises.find(ex => ex.id === id)
                    ).filter(Boolean) as Exercise[];
                    onStartWorkout(plan);
                  }}
                  className="justify-between p-4 group"
                >
                  <div className="text-left">
                    <p className="font-headline font-bold uppercase text-sm group-hover:text-primary transition-colors">{template.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">DAY {template.dayType} • {template.exerciseIds.length} EXERCISES</p>
                  </div>
                  <ArrowRight size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card className="col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="font-headline text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase mb-1">PREVIOUS SESSION</p>
              <h2 className="font-headline text-2xl font-medium">{lastWorkout ? `Day ${lastWorkout.dayType} Summary` : 'No sessions yet'}</h2>
            </div>
            <HistoryIcon className="text-secondary w-6 h-6" />
          </div>
          {lastWorkout ? (
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col">
                <p className="font-headline text-[10px] font-bold text-secondary tracking-widest uppercase mb-2">TOP LIFT</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-4xl font-bold tracking-tighter">
                    {Math.max(...lastWorkout.exercises.flatMap(e => e.sets.map(s => s.weight)))}
                  </span>
                  <span className="font-headline text-xs font-bold text-on-surface-variant uppercase">{profile.units}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="font-headline text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mb-2">TOTAL VOLUME</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-4xl font-bold tracking-tighter">
                    {lastWorkout.exercises.reduce((acc, e) => acc + e.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0).toLocaleString()}
                  </span>
                  <span className="font-headline text-xs font-bold text-on-surface-variant uppercase">{profile.units}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm italic">Complete your first workout to see stats here.</p>
          )}
          <div className="absolute bottom-0 left-0 w-full h-1 technical-dashed-line opacity-30"></div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-headline text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase mb-1">WEEKLY CONSISTENCY</p>
              <h3 className="font-headline text-2xl font-bold text-primary">ELITE</h3>
            </div>
            <Trophy className="text-primary w-6 h-6" />
          </div>
          <div className="flex gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-full aspect-square rounded-md border-2 transition-all",
                  i < 5 ? "bg-primary/20 border-primary shadow-[0_0_10px_rgba(243,255,202,0.2)]" : "bg-surface-container-highest border-outline-variant/10"
                )} />
                <span className="text-[8px] font-bold text-on-surface-variant">{day}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-headline text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase mb-1">NEXT MILESTONE</p>
              <h3 className="font-headline text-2xl font-bold text-secondary">SQUAT 120KG</h3>
            </div>
            <Zap className="text-secondary w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span>Progress</span>
              <span>85%</span>
            </div>
            <div className="relative w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-[85%] bg-secondary rounded-full shadow-[0_0_10px_rgba(243,255,202,0.2)]"></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const LibraryView = ({ profile, onUpdate1RM, onAddCustomExercise }: { profile: UserProfile, onUpdate1RM: (exerciseId: string, weight: number, reps: number) => void, onAddCustomExercise: (ex: Exercise) => void }) => {
  const [weight, setWeight] = useState(225);
  const [reps, setReps] = useState(5);
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEx, setNewEx] = useState({ 
    name: '', 
    category: 'isolation' as 'compound' | 'isolation', 
    targetSets: 3, 
    targetReps: 10,
    instructions: [] as string[]
  });

  const estimated1RM = calculate1RM(weight, reps);
  const allExercises = [...DEFAULT_EXERCISES, ...(profile.customExercises || [])];

  const handleAddExercise = () => {
    if (!newEx.name) return;
    onAddCustomExercise({
      id: newEx.name.toLowerCase().replace(/\s+/g, '-'),
      name: newEx.name,
      category: newEx.category,
      targetSets: newEx.targetSets,
      targetReps: newEx.targetReps,
      intensityRange: newEx.category === 'compound' ? [0.7, 0.85] : [0.6, 0.75],
      equipment: ['bodyweight'], // Default for custom exercises
      instructions: newEx.instructions
    });
    setNewEx({ name: '', category: 'isolation', targetSets: 3, targetReps: 10, instructions: [] });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <p className="font-headline text-secondary text-xs tracking-[0.3em] font-bold mb-1 uppercase">LAB / TOOLS / ENGINE</p>
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter leading-none">PR CALCULATOR</h2>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> ADD EXERCISE
        </Button>
      </header>

      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container max-w-md w-full rounded-2xl p-8 shadow-2xl border border-outline-variant/20"
            >
              <h3 className="font-headline text-2xl font-bold uppercase mb-6 tracking-tighter">NEW EXERCISE</h3>
              <div className="space-y-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">NAME</label>
                  <input 
                    value={newEx.name}
                    onChange={e => setNewEx({...newEx, name: e.target.value})}
                    placeholder="e.g. Hammer Curls"
                    className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">CATEGORY</label>
                    <select 
                      value={newEx.category}
                      onChange={e => setNewEx({...newEx, category: e.target.value as any})}
                      className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-primary"
                    >
                      <option value="compound">Compound</option>
                      <option value="isolation">Isolation</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">SETS</label>
                    <input 
                      type="number"
                      value={newEx.targetSets}
                      onChange={e => setNewEx({...newEx, targetSets: Number(e.target.value)})}
                      className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">INSTRUCTIONS (ONE PER LINE)</label>
                  <textarea 
                    value={newEx.instructions?.join('\n')}
                    onChange={e => setNewEx({...newEx, instructions: e.target.value.split('\n').filter(s => s.trim() !== '')})}
                    placeholder="e.g. Keep back straight&#10;Drive through heels"
                    rows={3}
                    className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-primary text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setShowAddForm(false)} className="flex-1">CANCEL</Button>
                <Button onClick={handleAddExercise} className="flex-1">CREATE</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Card variant="low" className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">EXERCISE</label>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary"
            >
              {allExercises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">WEIGHT ({profile.units})</label>
              <input 
                type="number" 
                value={weight} 
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-5xl text-center text-primary focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">REPS</label>
              <input 
                type="number" 
                value={reps} 
                onChange={(e) => setReps(Number(e.target.value))}
                className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-5xl text-center text-primary focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <Button onClick={() => onUpdate1RM(selectedExercise, weight, reps)} className="w-full">SAVE TO PROFILE</Button>
      </Card>

      <Card variant="high" className="relative overflow-hidden flex flex-col justify-center min-h-[200px]">
        <div className="relative z-10">
          <span className="font-headline text-secondary text-[10px] tracking-[0.4em] font-bold uppercase block mb-4">ESTIMATED 1-REP MAX</span>
          <div className="flex items-baseline gap-4">
            <h3 className="font-headline text-8xl font-black leading-none tracking-tighter text-primary">{Math.round(estimated1RM)}</h3>
            <span className="font-headline text-on-surface-variant text-2xl font-light uppercase">{profile.units}</span>
          </div>
          <p className="mt-4 text-on-surface-variant text-sm">
            Calculated using the <span className="text-on-surface font-bold">Epley Formula</span>.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {[0.85, 0.8, 0.75, 0.7].map((intensity) => (
          <Card key={intensity} className="flex flex-col items-center p-4">
            <span className="font-headline text-on-surface-variant text-[10px] font-bold">{intensity * 100}%</span>
            <span className="font-headline text-2xl font-black text-secondary">{Math.round(estimated1RM * intensity)}</span>
            <span className="font-headline text-[10px] text-on-surface-variant uppercase tracking-tighter mt-1">
              {intensity === 0.85 ? 'Intensity' : intensity === 0.8 ? 'Hypertrophy' : intensity === 0.75 ? 'Volume' : 'Deload'}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
};

const WorkoutSession = ({ profile, customPlan, onComplete, onShare, onSaveTemplate }: { profile: UserProfile, customPlan: Exercise[] | null, onComplete: (log: WorkoutLog) => void, onShare: (log: WorkoutLog) => void, onSaveTemplate: (name: string, dayType: DayType, exerciseIds: string[]) => void }) => {
  const dayExercises = customPlan || generateWorkoutPlan(profile.currentDay, profile.desiredWorkoutTime, profile.customExercises, profile.availableEquipment);
  const [sessionState, setSessionState] = useState<'warmup' | 'workout' | 'cooldown'>('warmup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sets, setSets] = useState<SetLog[]>([]);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState(Date.now());
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [targetSets, setTargetSets] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalLog, setFinalLog] = useState<WorkoutLog | null>(null);
  const [overallTimeLeft, setOverallTimeLeft] = useState(profile.desiredWorkoutTime * 60);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  const currentExercise = dayExercises[currentIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setOverallTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentExercise) {
      const oneRM = profile.oneRMs[currentExercise.id] || 100;
      const suggested = calculateTrainingWeight(oneRM, currentExercise.intensityRange[1]);
      setCurrentWeight(suggested);
      setCurrentReps(currentExercise.targetReps);
      setTargetSets(currentExercise.targetSets);
      setSets([]);
      setShowInstructions(false);
    }
  }, [currentIndex, currentExercise, profile.oneRMs]);

  useEffect(() => {
    let interval: any;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const handleAddSet = () => {
    const newSet: SetLog = { weight: currentWeight, reps: currentReps, timestamp: Date.now() };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    
    // Smart Rest Timer
    const intensity = currentWeight / (profile.oneRMs[currentExercise.id] || currentWeight);
    const smartRest = calculateSmartRest(currentExercise.category, intensity);
    setRestTimer(smartRest);

    if (updatedSets.length >= targetSets) {
      const newExerciseLog: ExerciseLog = { exerciseId: currentExercise.id, sets: updatedSets };
      const updatedExerciseLogs = [...exerciseLogs, newExerciseLog];
      setExerciseLogs(updatedExerciseLogs);

      if (currentIndex < dayExercises.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setRestTimer(null);
      } else {
        setSessionState('cooldown');
      }
    }
  };

  const handleFinishExercise = () => {
    // Save only the sets that were actually completed
    if (sets.length > 0) {
      const newExerciseLog: ExerciseLog = { exerciseId: currentExercise.id, sets };
      setExerciseLogs(prev => [...prev, newExerciseLog]);
    }

    if (currentIndex < dayExercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRestTimer(null);
    } else {
      setSessionState('cooldown');
    }
  };

  const handleEndWorkoutEarly = () => {
    // Log current exercise if it has sets, then go to cooldown
    if (sets.length > 0) {
      const newExerciseLog: ExerciseLog = { exerciseId: currentExercise.id, sets };
      setExerciseLogs(prev => [...prev, newExerciseLog]);
    }
    setSessionState('cooldown');
  };

  const handleFinishWorkout = () => {
    const duration = Math.round((Date.now() - startTime) / 60000);
    const log: WorkoutLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now(),
      dayType: profile.currentDay,
      exercises: exerciseLogs,
      duration
    };
    setFinalLog(log);
    setIsComplete(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isComplete && finalLog) {
    const totalVolume = finalLog.exercises.reduce((acc, e) => acc + e.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0);
    const prsHit = finalLog.exercises.filter(e => {
      const bestSet = e.sets.reduce((prev, current) => (calculate1RM(current.weight, current.reps) > calculate1RM(prev.weight, prev.reps) ? current : prev));
      const estimated = calculate1RM(bestSet.weight, bestSet.reps);
      return estimated > (profile.oneRMs[e.exerciseId] || 0);
    }).length;

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(243,255,202,0.3)]"
          >
            <Check size={64} className="text-on-primary" />
          </motion.div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] border-2 border-dashed border-primary/30 rounded-full"
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-headline text-5xl font-black uppercase tracking-tighter">PROTOCOL COMPLETE</h2>
          <p className="text-primary font-headline text-lg tracking-tight font-bold uppercase">
            {prsHit > 0 ? `NEW PRs DETECTED: ${prsHit}` : "SESSION LOGGED"}
          </p>
          <p className="text-on-surface-variant font-headline text-xs tracking-widest uppercase max-w-xs mx-auto">
            {prsHit >= 3 ? "Absolute Beast Mode! You're rewriting your limits today." :
             prsHit >= 1 ? "Incredible! You're breaking through plateaus." :
             totalVolume > 10000 ? "Massive volume session! The engine is running hot." :
             "Great work! Consistency is the key to progress."}
          </p>
        </div>

        {/* Protocol Summary Card */}
        <Card variant="high" className="w-full max-w-sm relative overflow-hidden text-left p-0 border-none shadow-2xl">
          <div className="bg-primary p-6 text-on-primary">
            <div className="flex justify-between items-center mb-2">
              <p className="font-headline text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">SESSION SUMMARY</p>
              <Zap size={20} />
            </div>
            <h3 className="font-headline text-3xl font-black tracking-tighter uppercase">{new Date(finalLog.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} SESSION</h3>
          </div>

          <div className="p-6 space-y-6 bg-surface-container-low">
            <div className="space-y-4">
              {finalLog.exercises.map(ex => {
                const exercise = DEFAULT_EXERCISES.find(e => e.id === ex.exerciseId) || (profile.customExercises || []).find(e => e.id === ex.exerciseId);
                const bestSet = ex.sets.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev));
                return (
                  <div key={ex.exerciseId} className="flex justify-between items-center border-b border-outline-variant/10 pb-3 last:border-0">
                    <div>
                      <p className="font-headline text-sm font-bold uppercase tracking-tight">{exercise?.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{ex.sets.length} SETS COMPLETED</p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-lg font-black text-primary leading-none">{bestSet.weight}<span className="text-[10px] ml-0.5">{profile.units}</span></p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">BEST LIFT</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-primary/20">
              <div className="text-center">
                <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">VOLUME</p>
                <p className="font-headline text-sm font-black text-primary">{totalVolume.toLocaleString()}</p>
              </div>
              <div className="text-center border-x border-outline-variant/10">
                <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">TIME</p>
                <p className="font-headline text-sm font-black text-primary">{finalLog.duration}M</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">PRs</p>
                <p className="font-headline text-sm font-black text-secondary">{prsHit}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => onShare(finalLog)}>
              <Share2 size={18} className="mr-2" /> SHARE
            </Button>
            <Button onClick={() => onComplete(finalLog)} className="flex-1">
              RETURN TO HUB
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] tracking-[0.2em]"
            onClick={() => {
              const name = prompt("Enter template name:");
              if (name) {
                const exerciseIds = finalLog.exercises.map(ex => ex.exerciseId);
                onSaveTemplate(name, finalLog.dayType, exerciseIds);
              }
            }}
          >
            SAVE AS TEMPLATE
          </Button>
        </div>
      </div>
    );
  }

  if (sessionState === 'warmup') {
    return <StretchingView title="PRE-WORKOUT MOBILITY" onComplete={() => setSessionState('workout')} />;
  }

  if (sessionState === 'cooldown') {
    return <StretchingView title="POST-WORKOUT RECOVERY" onComplete={handleFinishWorkout} />;
  }

  if (!currentExercise) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={14} />
            <span className="font-headline text-[10px] font-bold tracking-widest uppercase">SESSION TIME: {formatTime(overallTimeLeft)}</span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter uppercase leading-none">{currentExercise.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="font-headline text-secondary text-[10px] tracking-[0.3em] font-bold uppercase">
              EXERCISE {currentIndex + 1} OF {dayExercises.length}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-primary text-[10px] p-0"
              >
                {showInstructions ? 'HIDE INFO' : 'SHOW INFO'}
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowFormModal(true)}
                className="text-secondary text-[10px] p-0"
              >
                FORM CUES
              </Button>
            </div>
          </div>
        </div>
        <Button 
          variant="danger"
          size="sm"
          onClick={handleEndWorkoutEarly}
          className="px-3 py-1 text-[10px]"
        >
          END SESSION
        </Button>
      </header>

      <AnimatePresence>
        {showInstructions && currentExercise.instructions && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card variant="low" className="bg-primary/5 border-primary/20">
              <ul className="space-y-2">
                {currentExercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs text-on-surface-variant leading-relaxed">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4">
        <Card variant="low" className="p-4 flex flex-col items-center justify-center space-y-1">
          <p className="font-headline text-on-surface-variant text-[10px] tracking-widest uppercase">Target Weight</p>
          <span className="font-headline text-3xl font-bold text-primary">{currentWeight}<span className="text-xs ml-1">{profile.units}</span></span>
        </Card>
        <Card variant="low" className="p-4 flex flex-col items-center justify-center space-y-1">
          <p className="font-headline text-on-surface-variant text-[10px] tracking-widest uppercase">Target Sets</p>
          <div className="flex items-center gap-3">
            <span className="font-headline text-3xl font-bold">{targetSets}</span>
            <button 
              onClick={() => setTargetSets(targetSets + 1)} 
              className="text-primary hover:scale-110 transition-transform"
              aria-label="Add set"
            >
              <Plus size={16} />
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block text-center">WEIGHT ({profile.units})</label>
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="secondary"
              onClick={() => setCurrentWeight(Math.max(0, currentWeight - 5))} 
              className="w-14 h-14 rounded-2xl p-0"
            >
              <Minus size={24} />
            </Button>
            <input 
              type="number" 
              value={currentWeight} 
              onChange={e => setCurrentWeight(Number(e.target.value))}
              className="w-24 bg-transparent border-b-2 border-primary/20 focus:border-primary text-center font-headline font-black text-5xl p-2 outline-none"
            />
            <Button 
              variant="secondary"
              onClick={() => setCurrentWeight(currentWeight + 5)} 
              className="w-14 h-14 rounded-2xl p-0"
            >
              <Plus size={24} />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block text-center">REPS</label>
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="secondary"
              onClick={() => setCurrentReps(Math.max(0, currentReps - 1))} 
              className="w-14 h-14 rounded-2xl p-0"
            >
              <Minus size={24} />
            </Button>
            <input 
              type="number" 
              value={currentReps} 
              onChange={e => setCurrentReps(Number(e.target.value))}
              className="w-24 bg-transparent border-b-2 border-primary/20 focus:border-primary text-center font-headline font-black text-5xl p-2 outline-none"
            />
            <Button 
              variant="secondary"
              onClick={() => setCurrentReps(currentReps + 1)} 
              className="w-14 h-14 rounded-2xl p-0"
            >
              <Plus size={24} />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {restTimer !== null && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="flex justify-between w-full items-center">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">RECOVERY</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="px-3 py-1 text-[10px]"
                      onClick={() => setRestTimer(prev => (prev !== null ? Math.max(0, prev - 15) : null))}
                    >
                      -15S
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="px-3 py-1 text-[10px]"
                      onClick={() => setRestTimer(prev => (prev !== null ? prev + 15 : null))}
                    >
                      +15S
                    </Button>
                  </div>
                </div>
                <div 
                  onClick={() => setRestTimer(null)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <span className="font-headline text-7xl font-black text-primary tabular-nums leading-none group-hover:scale-105 transition-transform">{formatTime(restTimer)}</span>
                  <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">TAP TO SKIP REST</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button 
          onClick={handleAddSet} 
          disabled={restTimer !== null}
          className="w-full py-6 text-xl tracking-widest flex justify-between px-8 shadow-[0_10px_30px_rgba(243,255,202,0.2)]"
        >
          <span>COMPLETE SET {sets.length + 1}</span>
          <ArrowRight size={24} />
        </Button>

        <Button 
          variant="secondary"
          onClick={handleFinishExercise}
          className="w-full py-3 text-[10px]"
        >
          FINISH EXERCISE EARLY
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">SET HISTORY</p>
          <span className="text-[10px] font-bold text-primary">{sets.length}/{targetSets} COMPLETED</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sets.map((set, i) => (
            <div key={i} className="px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/10 flex items-center gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant/50">{i + 1}</span>
              <span className="font-headline font-bold text-sm">{set.weight}{profile.units} × {set.reps}</span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, targetSets - sets.length) }).map((_, i) => (
            <div key={i + sets.length} className="px-4 py-2 bg-surface-container/30 rounded-lg border border-dashed border-outline-variant/10 flex items-center gap-2 opacity-50">
              <span className="text-[10px] font-bold text-on-surface-variant/50">{i + sets.length + 1}</span>
              <span className="font-headline font-bold text-sm">--</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-surface/95 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-surface-container max-w-md w-full rounded-3xl p-8 shadow-2xl border border-outline-variant/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>
              
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <p className="font-headline text-secondary text-[10px] tracking-[0.4em] font-bold uppercase">TECHNICAL GUIDE</p>
                  <h3 className="font-headline text-3xl font-black uppercase tracking-tighter leading-none">{currentExercise.name}</h3>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Close modal"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-headline text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Check size={14} /> EXECUTION STEPS
                  </h4>
                  <div className="space-y-3">
                    {currentExercise.instructions?.map((step, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-all">
                          {i + 1}
                        </span>
                        <p className="text-sm text-on-surface-variant leading-relaxed pt-0.5">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3">
                  <h4 className="font-headline text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                    <Zap size={14} /> ELITE FORM CUES
                  </h4>
                  <ul className="space-y-2">
                    <li className="text-xs text-on-surface-variant flex gap-2">
                      <span className="text-secondary">•</span>
                      Maintain a neutral spine throughout the entire movement.
                    </li>
                    <li className="text-xs text-on-surface-variant flex gap-2">
                      <span className="text-secondary">•</span>
                      Control the eccentric (lowering) phase for maximum fiber recruitment.
                    </li>
                    <li className="text-xs text-on-surface-variant flex gap-2">
                      <span className="text-secondary">•</span>
                      Focus on the mind-muscle connection and explosive concentric drive.
                    </li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={() => setShowFormModal(false)} 
                className="w-full mt-10 py-5 text-lg"
              >
                GOT IT, LETS LIFT
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Progress = ({ logs, profile, onUpdateWeight }: { logs: WorkoutLog[], profile: UserProfile, onUpdateWeight: (w: number) => void }) => {
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [newWeight, setNewWeight] = useState(profile.weightHistory.length > 0 ? profile.weightHistory[profile.weightHistory.length - 1].weight : 75);

  const chartData = logs
    .filter(log => log.exercises.some(e => e.exerciseId === selectedExercise))
    .map(log => {
      const exerciseLog = log.exercises.find(e => e.exerciseId === selectedExercise)!;
      const bestSet = exerciseLog.sets.reduce((prev, current) => (calculate1RM(current.weight, current.reps) > calculate1RM(prev.weight, prev.reps) ? current : prev));
      return {
        date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        oneRM: Math.round(calculate1RM(bestSet.weight, bestSet.reps)),
        weight: bestSet.weight
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weightData = profile.weightHistory.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight
  }));

  const allExercises = [...DEFAULT_EXERCISES, ...(profile.customExercises || [])];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex justify-between items-end">
        <h2 className="text-4xl font-headline font-bold tracking-tighter uppercase leading-none">PROGRESS<span className="text-primary">.</span></h2>
        <span className="text-on-surface-variant font-headline text-[10px] tracking-[0.2em] font-bold uppercase">PERFORMANCE ANALYTICS</span>
      </header>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-headline text-[10px] tracking-[0.2em] font-bold uppercase">STRENGTH CURVE</span>
          <select 
            value={selectedExercise} 
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-surface-container-high border-none rounded-lg px-3 py-1.5 font-headline font-bold text-[10px] text-primary uppercase tracking-widest focus:ring-1 focus:ring-primary"
          >
            {allExercises.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="h-[280px] w-full chart-grid p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorOneRM" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#f3ffca" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f3ffca" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#484847" opacity={0.1} />
                <XAxis dataKey="date" stroke="#adaaaa" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#adaaaa" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="oneRM" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorOneRM)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant font-headline text-[10px] tracking-[0.2em] font-bold uppercase">BODY MASS ({profile.units})</span>
          <Button size="sm" variant="secondary" onClick={() => setShowWeightInput(true)}>LOG WEIGHT</Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="h-[200px] w-full chart-grid p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.1} />
                <XAxis dataKey="date" stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: 'var(--color-primary)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showWeightInput && (
          <div className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container max-w-xs w-full rounded-2xl p-8 shadow-2xl border border-outline-variant/20"
            >
              <h3 className="font-headline text-2xl font-bold uppercase mb-6 tracking-tighter">LOG WEIGHT</h3>
              <div className="space-y-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">CURRENT WEIGHT ({profile.units})</label>
                  <input 
                    type="number"
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-3xl text-center text-primary"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setShowWeightInput(false)} className="flex-1">CANCEL</Button>
                <Button onClick={() => { onUpdateWeight(newWeight); setShowWeightInput(false); }} className="flex-1">SAVE</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const History = ({ logs, profile }: { logs: WorkoutLog[], profile: UserProfile }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface mb-2 uppercase">HISTORY</h1>
        <p className="text-on-surface-variant font-medium tracking-tight text-sm uppercase">{logs.length} SESSIONS TRACKED</p>
      </header>

      <div className="space-y-4">
        {logs.slice().reverse().map((log) => (
          <Card key={log.id} variant="low" className="group transition-all active:scale-[0.98]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-1">
                <span className="font-headline text-lg font-bold text-on-surface">
                  {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Day {log.dayType}
                </span>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{log.duration} MIN</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-sm border border-primary/20 uppercase tracking-tighter">Completed</span>
              </div>
            </div>
            <div className="space-y-2 border-t border-outline-variant/10 pt-4">
              {log.exercises.map((e, i) => {
                const exercise = DEFAULT_EXERCISES.find(ex => ex.id === e.exerciseId);
                const bestSet = e.sets.reduce((prev, current) => (current.weight > prev.weight ? current : prev));
                return (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-on-surface">{exercise?.name}</span>
                    <span className="font-headline text-sm font-bold text-secondary">{bestSet.weight} <span className="text-[10px] text-on-surface-variant">{profile.units}</span> × {bestSet.reps}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-surface/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container max-w-sm w-full rounded-2xl p-8 shadow-2xl border border-error/20 space-y-6"
      >
        <div className="space-y-2">
          <h3 className="font-headline text-2xl font-bold uppercase tracking-tighter text-error">{title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>CANCEL</Button>
          <Button className="flex-1 bg-error text-on-error hover:bg-error/90" onClick={onConfirm}>CONFIRM</Button>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsView = ({ profile, onUpdateProfile, onReset }: { profile: UserProfile, onUpdateProfile: (p: UserProfile) => void, onReset: () => void }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal 
        isOpen={showResetConfirm}
        title="WIPE ALL DATA?"
        message="This will permanently delete all your workout history, PRs, and custom exercises. This action cannot be undone."
        onConfirm={onReset}
        onCancel={() => setShowResetConfirm(false)}
      />
      <header>
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface mb-2 uppercase">SETTINGS</h1>
        <p className="text-on-surface-variant font-medium tracking-tight text-sm uppercase">MANAGE YOUR PROTOCOL</p>
      </header>

      <Card variant="low" className="space-y-6">
        <div className="space-y-4">
          <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">USER NAME</label>
          <input 
            type="text" 
            value={profile.name} 
            onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 font-headline font-bold text-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-4">
          <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">PREFERRED UNITS</label>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant={profile.units === 'kg' ? 'primary' : 'secondary'}
              onClick={() => onUpdateProfile({ ...profile, units: 'kg' })}
              className="py-4"
            >
              KG
            </Button>
            <Button 
              variant={profile.units === 'lbs' ? 'primary' : 'secondary'}
              onClick={() => onUpdateProfile({ ...profile, units: 'lbs' })}
              className="py-4"
            >
              LBS
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">EXPERIENCE LEVEL</label>
          <div className="grid grid-cols-3 gap-2">
            {['beginner', 'intermediate', 'advanced'].map((level) => (
              <Button 
                key={level}
                variant={profile.experienceLevel === level ? 'primary' : 'secondary'}
                onClick={() => onUpdateProfile({ ...profile, experienceLevel: level as any })}
                className="py-3 text-[10px]"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="font-headline text-on-surface-variant text-[10px] tracking-widest font-bold uppercase block">EQUIPMENT PROFILE</label>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <Button 
                key={opt.id}
                variant={profile.availableEquipment.includes(opt.id) ? 'primary' : 'secondary'}
                onClick={() => {
                  const current = profile.availableEquipment || [];
                  const next = current.includes(opt.id) 
                    ? current.filter(e => e !== opt.id) 
                    : [...current, opt.id];
                  onUpdateProfile({ ...profile, availableEquipment: next });
                }}
                className="justify-between p-4"
              >
                <span className="text-[10px]">{opt.label}</span>
                {profile.availableEquipment.includes(opt.id) && <Check size={14} />}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-headline text-xl font-bold uppercase tracking-tighter">LEGAL & PRIVACY</h3>
        <Card variant="low" className="space-y-4">
          <div className="flex flex-col gap-2">
            <button className="text-left text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span>PRIVACY POLICY</span>
              <Activity size={14} className="opacity-50" />
            </button>
            <button className="text-left text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center justify-between py-2 border-b border-outline-variant/10">
              <span>TERMS OF SERVICE</span>
              <Activity size={14} className="opacity-50" />
            </button>
            <div className="pt-2">
              <p className="text-[8px] text-on-surface-variant/50 font-bold uppercase tracking-widest">VERSION 1.0.0 (STABLE)</p>
              <p className="text-[8px] text-on-surface-variant/50 font-bold uppercase tracking-widest">© 2026 IRONFLOW ENGINE</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-headline text-xl font-bold uppercase tracking-tighter text-error">DANGER ZONE</h3>
        <Card variant="low" className="border-l-4 border-error space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Resetting your profile will permanently delete all your workout history, PRs, and custom exercises. This action cannot be undone.
          </p>
          <Button 
            variant="secondary" 
            className="w-full border-error/50 text-error hover:bg-error hover:text-on-error"
            onClick={() => setShowResetConfirm(true)}
          >
            RESET ALL DATA
          </Button>
        </Card>
      </div>
    </div>
  );
};

const CustomWorkoutBuilder = ({ profile, onStart, onCancel }: { 
  profile: UserProfile, 
  onStart: (plan: Exercise[]) => void, 
  onCancel: () => void 
}) => {
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  
  const allExercises = [...DEFAULT_EXERCISES, ...(profile.customExercises || [])];
  const filtered = allExercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExercise = (ex: Exercise) => {
    if (selectedExercises.find(e => e.id === ex.id)) {
      setSelectedExercises(prev => prev.filter(e => e.id !== ex.id));
    } else {
      setSelectedExercises(prev => [...prev, { ...ex }]);
    }
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setSelectedExercises(prev => prev.map(ex => ex.id === id ? { ...ex, ...updates } : ex));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="font-headline text-secondary text-[10px] tracking-[0.3em] font-bold uppercase">CUSTOM PROTOCOL</p>
          <h2 className="font-headline text-4xl font-black uppercase tracking-tighter">BUILD YOUR SESSION</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>CANCEL</Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="SEARCH EXERCISES..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-highest border-none rounded-xl p-4 pl-12 font-headline font-bold text-primary focus:ring-2 focus:ring-primary placeholder:opacity-30"
          />
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50" size={20} />
        </div>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-surface-container rounded-xl">
          {filtered.map(ex => {
            const isSelected = selectedExercises.find(e => e.id === ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                  isSelected 
                    ? "bg-primary text-on-primary border-primary" 
                    : "bg-surface-container-highest text-on-surface-variant border-outline-variant/10 hover:border-primary/50"
                )}
              >
                {ex.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-headline text-xl font-bold uppercase tracking-tighter">SELECTED PROTOCOLS ({selectedExercises.length})</h3>
        <div className="space-y-3">
          {selectedExercises.length === 0 ? (
            <Card variant="low" className="text-center py-12 border-2 border-dashed border-outline-variant/20">
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold opacity-50">NO EXERCISES SELECTED</p>
            </Card>
          ) : (
            selectedExercises.map((ex, i) => (
              <Card key={ex.id} variant="high" className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-headline text-primary/30 font-bold">0{i + 1}</span>
                    <span className="font-headline font-bold uppercase tracking-tight">{ex.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 text-error/50 hover:text-error"
                    onClick={() => toggleExercise(ex)}
                  >
                    <Minus size={16} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">TARGET SETS</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateExercise(ex.id, { targetSets: Math.max(1, ex.targetSets - 1) })} className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">-</button>
                      <span className="font-headline font-bold">{ex.targetSets}</span>
                      <button onClick={() => updateExercise(ex.id, { targetSets: Math.min(10, ex.targetSets + 1) })} className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">TARGET REPS</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateExercise(ex.id, { targetReps: Math.max(1, ex.targetReps - 1) })} className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">-</button>
                      <span className="font-headline font-bold">{ex.targetReps}</span>
                      <button onClick={() => updateExercise(ex.id, { targetReps: Math.min(100, ex.targetReps + 1) })} className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">+</button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedExercises.length > 0 && (
        <div className="fixed bottom-24 left-0 w-full px-6 z-40">
          <Button onClick={() => onStart(selectedExercises)} className="w-full py-6 text-xl shadow-[0_0_50px_rgba(243,255,202,0.2)]">
            INITIALIZE CUSTOM PROTOCOL
          </Button>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <IronFlowApp />
    </ErrorBoundary>
  );
}

function IronFlowApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'workout' | 'progress' | 'history' | 'library' | 'settings' | 'custom_workout' | 'morning_routine'>('dashboard');
  const [customPlan, setCustomPlan] = useState<Exercise[] | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Athlete',
    experienceLevel: 'intermediate',
    units: 'kg',
    currentDay: 'A',
    oneRMs: {
      'squat': 100,
      'bench': 80,
      'deadlift': 120,
      'ohp': 50,
      'row': 70,
      'pullup': 80,
      'curl': 30,
      'tricep': 30
    },
    desiredWorkoutTime: 60,
    onboarded: false,
    customExercises: [],
    availableEquipment: ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'],
    weightHistory: [],
    templates: [],
    workoutMode: 'standard',
    goal: 'fitness',
    morningRoutineCompleted: {}
  });

  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setProfile(prev => ({ ...prev, name: currentUser.displayName || 'Athlete', onboarded: false }));
          }

          const logsQuery = query(collection(db, 'workout_logs'), where('userId', '==', currentUser.uid));
          const logsSnapshot = await getDocs(logsQuery);
          const loadedLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutLog));
          setLogs(loadedLogs);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users/workout_logs');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleWorkoutComplete = async (log: WorkoutLog) => {
    if (!user) return;
    try {
      const logWithUser = { ...log, userId: user.uid };
      const docRef = await addDoc(collection(db, 'workout_logs'), logWithUser);
      setLogs([...logs, { ...logWithUser, id: docRef.id }]);
      setCustomPlan(null);
      
      const newOneRMs = { ...profile.oneRMs };
      log.exercises.forEach(e => {
        const bestSet = e.sets.reduce((prev, current) => (calculate1RM(current.weight, current.reps) > calculate1RM(prev.weight, prev.reps) ? current : prev));
        const estimated = calculate1RM(bestSet.weight, bestSet.reps);
        if (estimated > (newOneRMs[e.exerciseId] || 0)) {
          newOneRMs[e.exerciseId] = Math.round(estimated);
        }
      });

      const days: DayType[] = ['A', 'B', 'C'];
      const nextDay = days[(days.indexOf(profile.currentDay) + 1) % 3];
      
      await saveProfile({ ...profile, oneRMs: newOneRMs, currentDay: nextDay });
      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workout_logs');
    }
  };

  const handleMorningRoutineComplete = async () => {
    const today = new Date().toISOString().split('T')[0];
    const newRoutine = { ...profile.morningRoutineCompleted, [today]: true };
    await saveProfile({ ...profile, morningRoutineCompleted: newRoutine });
    setView('dashboard');
  };

  const handleUpdate1RM = (exerciseId: string, weight: number, reps: number) => {
    const estimated = calculate1RM(weight, reps);
    saveProfile({
      ...profile,
      oneRMs: {
        ...profile.oneRMs,
        [exerciseId]: Math.round(estimated)
      }
    });
  };

  const handleUpdateWeight = (weight: number) => {
    const newEntry = { date: Date.now(), weight };
    saveProfile({
      ...profile,
      weightHistory: [...(profile.weightHistory || []), newEntry]
    });
  };

  const handleSaveTemplate = (name: string, dayType: DayType, exerciseIds: string[]) => {
    const newTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      dayType,
      exerciseIds
    };
    saveProfile({
      ...profile,
      templates: [...(profile.templates || []), newTemplate]
    });
  };

  const handleShare = async (log: WorkoutLog) => {
    const totalVolume = log.exercises.reduce((acc, ex) => 
      acc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0
    );
    
    const text = `IRONFLOW SESSION COMPLETE\nDate: ${new Date(log.date).toLocaleDateString()}\nVolume: ${totalVolume.toLocaleString()} ${profile.units}\nDuration: ${log.duration} min\n\nProof of Iron.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IRONFLOW Workout Summary',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard!');
    }
  };

  const handleAddCustomExercise = (ex: Exercise) => {
    saveProfile({
      ...profile,
      customExercises: [...(profile.customExercises || []), ex]
    });
  };

  const handleUpdateEquipment = (eq: Equipment[]) => {
    saveProfile({
      ...profile,
      availableEquipment: eq
    });
  };

  const handleUpdateMode = (mode: 'standard' | 'bodyweight') => {
    saveProfile({
      ...profile,
      workoutMode: mode
    });
  };

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 bg-surface text-on-surface">
        <div className="text-center space-y-2">
          <h1 className="font-headline text-6xl font-black tracking-tighter uppercase leading-none">IRONFLOW<span className="text-primary">.</span></h1>
          <p className="text-on-surface-variant font-headline text-[10px] tracking-[0.4em] font-bold uppercase">ELITE PERFORMANCE ENGINE</p>
        </div>
        <Button onClick={handleLogin} className="w-full max-w-xs py-6 text-xl">
          INITIALIZE PROTOCOL
        </Button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface text-primary font-headline font-bold uppercase tracking-widest">LOADING...</div>;

  if (!profile.onboarded) {
    return <Onboarding onComplete={(p) => saveProfile({ ...p, onboarded: true })} />;
  }

  const today = new Date().toISOString().split('T')[0];
  const routineDoneToday = profile.morningRoutineCompleted?.[today];
  const lastWorkout = logs.length > 0 ? [...logs].sort((a, b) => b.date - a.date)[0] : undefined;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/30">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
        <main className="flex-1 p-6 pb-32">
          {view === 'dashboard' && (
            <Dashboard 
              profile={profile} 
              lastWorkout={lastWorkout}
              onStartWorkout={(plan) => {
                if (plan) setCustomPlan(plan);
                setView('workout');
              }} 
              onUpdateEquipment={handleUpdateEquipment}
              onUpdateMode={handleUpdateMode}
              onOpenCustomWorkout={() => setView('custom_workout')}
            />
          )}
          {view === 'workout' && (
            <WorkoutSession 
              profile={profile} 
              customPlan={customPlan}
              onComplete={handleWorkoutComplete} 
              onShare={handleShare}
              onSaveTemplate={handleSaveTemplate}
            />
          )}
          {view === 'morning_routine' && (
            <MorningRoutine onComplete={handleMorningRoutineComplete} />
          )}
          {view === 'progress' && (
            <Progress 
              logs={logs} 
              profile={profile} 
              onUpdateWeight={handleUpdateWeight} 
            />
          )}
          {view === 'history' && <History logs={logs} profile={profile} />}
          {view === 'library' && (
            <LibraryView 
              profile={profile} 
              onUpdate1RM={handleUpdate1RM}
              onAddCustomExercise={handleAddCustomExercise}
            />
          )}
          {view === 'settings' && (
            <SettingsView 
              profile={profile} 
              onUpdateProfile={saveProfile} 
              onReset={async () => {
                const resetProfile: UserProfile = {
                  ...profile,
                  onboarded: false,
                  weightHistory: [],
                  customExercises: [],
                  oneRMs: {
                    'squat': 100, 'bench': 80, 'deadlift': 120, 'ohp': 50, 'row': 70, 'pullup': 80, 'curl': 30, 'tricep': 30
                  }
                };
                await saveProfile(resetProfile);
              }} 
            />
          )}
          {view === 'custom_workout' && (
            <CustomWorkoutBuilder 
              profile={profile} 
              onStart={(plan) => {
                setCustomPlan(plan);
                setView('workout');
              }} 
              onCancel={() => setView('dashboard')} 
            />
          )}
        </main>

        {view !== 'workout' && view !== 'morning_routine' && (
          <nav className="fixed bottom-0 left-0 w-full bg-surface/80 backdrop-blur-xl border-t border-outline-variant/10 px-6 py-4 z-50">
            <div className="max-w-md mx-auto flex justify-between items-center">
              <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Activity size={20} />} label="FLOW" />
              <NavButton active={view === 'progress'} onClick={() => setView('progress')} icon={<Zap size={20} />} label="STATS" />
              <div className="relative -top-8">
                <button 
                  onClick={() => setView('custom_workout')}
                  className="w-16 h-16 rounded-2xl bg-primary text-on-primary shadow-[0_0_30px_rgba(243,255,202,0.4)] flex items-center justify-center transition-transform active:scale-90"
                >
                  <Plus size={32} strokeWidth={3} />
                </button>
              </div>
              <NavButton active={view === 'library'} onClick={() => setView('library')} icon={<Dumbbell size={20} />} label="LIFT" />
              <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<Activity size={20} />} label="USER" />
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-primary scale-110" : "text-on-surface-variant opacity-40 hover:opacity-100"
    )}
  >
    {icon}
    <span className="text-[8px] font-black tracking-[0.2em] uppercase">{label}</span>
  </button>
);
