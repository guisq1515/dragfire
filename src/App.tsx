/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useMemo, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit,
  getDocFromServer,
  Timestamp,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth, db, storage, googleProvider } from './firebase';
import { 
  Trash2,
  Gauge, 
  Timer, 
  Flag, 
  History, 
  Settings, 
  Play, 
  RotateCcw, 
  AlertCircle,
  MapPin,
  ChevronLeft,
  Zap,
  Trophy,
  Signal,
  Info,
  Share2,
  Map as MapIcon,
  Swords,
  Clock,
  User,
  LogOut,
  Lock,
  Navigation,
  Camera,
  ChevronRight,
  Car,
  Smartphone,
  Cloud,
  BatteryCharging,
  Shield,
  Plus,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    try {
      const info = JSON.parse(error.message);
      return { hasError: true, errorInfo: info };
    } catch {
      return { hasError: true, errorInfo: { error: error.message } };
    }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white h-screen">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-display font-black italic mb-2 uppercase tracking-tighter">Ops! Algo deu errado</h2>
          <p className="text-zinc-400 text-sm mb-8 max-w-xs">
            Ocorreu um erro ao processar sua solicitação. Verifique sua conexão ou tente novamente.
          </p>
          <div className="bg-zinc-900 p-4 rounded-xl border border-white/5 text-left w-full max-w-sm mb-8">
            <p className="text-[10px] font-mono text-zinc-500 uppercase mb-2">Detalhes do Erro</p>
            <p className="text-xs font-mono text-red-400 break-all">
              {this.state.errorInfo?.error || "Erro desconhecido"}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black italic text-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" />
            RECARREGAR APP
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { usePerformanceTimer } from './hooks/usePerformanceTimer';
import { RunMode, RunConfig, RunResult, Challenge, Vehicle, RankingEntry } from './types';
import { calculateDistance } from './lib/utils';
import { VEHICLE_DATA, YEARS } from './constants/vehicles';

// Fix Leaflet default icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

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

const TERMS_VERSION = '1.0.0';

type Screen = 'home' | 'timer' | 'challenge' | 'duel-result' | 'settings' | 'login' | 'terms' | 'vehicle-settings' | 'profile-settings' | 'regional-ranking' | 'history' | 'gps-guide';

function GPSGuide({ onBack }: { onBack: () => void }) {
  const tips = [
    {
      title: "Céu Aberto",
      description: "O sinal de GPS viaja do espaço. Árvores, prédios altos e garagens bloqueiam ou refletem o sinal, causando erros de metros.",
      icon: <Cloud className="w-5 h-5 text-blue-400" />
    },
    {
      title: "Posição do Celular",
      description: "Coloque o celular no painel ou no para-brisa. Evite o console central ou o bolso, onde a lataria do carro abafa o sinal.",
      icon: <Smartphone className="w-5 h-5 text-brand-primary" />
    },
    {
      title: "Antenas Externas",
      description: "Para precisão profissional (10Hz ou 25Hz), considere usar receptores Bluetooth externos.",
      icon: <Zap className="w-5 h-5 text-brand-accent" />
    },
    {
      title: "Bateria e Energia",
      description: "Mantenha o celular carregando. O modo de economia de energia reduz a frequência de atualização do GPS para economizar bateria.",
      icon: <BatteryCharging className="w-5 h-5 text-green-400" />
    },
    {
      title: "Hardware do Smartphone",
      description: "A qualidade do sensor GPS varia entre modelos. Smartphones mais modernos e potentes possuem chips de localização mais precisos e rápidos.",
      icon: <Smartphone className="w-5 h-5 text-purple-400" />
    },
    {
      title: "Permissões de Sistema",
      description: "Algumas marcas (Xiaomi, Samsung, Huawei) podem bloquear o GPS para economizar bateria. Verifique se o app tem permissão de 'Localização Precisa' e se a economia de energia está desativada.",
      icon: <Shield className="w-5 h-5 text-red-400" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">GUIA DE PRECISÃO</h2>
          <p className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">Como melhorar seus resultados</p>
        </div>
      </div>

      <div className="space-y-4">
        {tips.map((tip, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel rounded-2xl p-4 border-white/5 flex gap-4"
          >
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
              {tip.icon}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">{tip.title}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{tip.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-widest">Dica Técnica</h4>
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          O DragFire utiliza um algoritmo híbrido que combina a posição geográfica com o efeito Doppler (velocidade real) para compensar oscilações do sensor do smartphone.
        </p>
      </div>
    </div>
  );
}

function HistoryView({ 
  user, 
  onBack 
}: { 
  user: FirebaseUser | null, 
  onBack: () => void 
}) {
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'runs'), 
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RunResult));
      setRuns(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteRun = async (runId: string) => {
    if (!window.confirm('Deseja excluir esta puxada permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'runs', runId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `runs/${runId}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
        <button onClick={onBack} className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">HISTÓRICO</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Suas puxadas recentes</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
              <History className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase">Nenhuma puxada registrada</p>
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="glass-panel rounded-2xl p-4 border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${run.config.mode === 'speed' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {run.config.mode === 'speed' ? <Zap className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {run.config.mode === 'speed' ? `${run.config.target} km/h` : `${run.config.target}m`}
                    </h4>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase">{formatDate(run.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-xl font-display font-black text-brand-accent italic leading-none">{run.time.toFixed(2)}s</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRun(run.id!);
                    }}
                    className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                <div>
                  <span className="text-[8px] text-zinc-600 uppercase font-black block">Velo. Máx</span>
                  <span className="text-xs font-bold text-zinc-300">{Math.round(run.maxSpeed)} km/h</span>
                </div>
                <div>
                  <span className="text-[8px] text-zinc-600 uppercase font-black block">Distância</span>
                  <span className="text-xs font-bold text-zinc-300">{Math.round(run.distance)}m</span>
                </div>
                <div>
                  <span className="text-[8px] text-zinc-600 uppercase font-black block">Inclinação</span>
                  <span className={`text-xs font-bold ${run.slope && run.slope < 0 ? 'text-red-500' : 'text-zinc-300'}`}>
                    {run.slope ? `${run.slope.toFixed(1)}%` : '0.0%'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RegionalRanking({ 
  userLocation, 
  onBack 
}: { 
  userLocation: { latitude: number, longitude: number } | null, 
  onBack: () => void 
}) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [filter, setFilter] = useState<'regional' | 'general'>('regional');
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'rankings'), orderBy('time', 'asc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RankingEntry));
      setRankings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rankings:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredRankings = useMemo(() => {
    let result = rankings;

    // Filter by vehicle type
    if (typeFilter !== 'all') {
      result = result.filter(entry => entry.vehicleType === typeFilter);
    }

    // Filter by region
    if (filter === 'regional' && userLocation) {
      result = result.filter(entry => {
        const dist = calculateDistance(
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: entry.latitude, longitude: entry.longitude }
        );
        return dist <= 20000; // 20km in meters
      });
    }
    
    return result;
  }, [rankings, filter, typeFilter, userLocation]);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">RANKING 0-100</h2>
          <p className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">Desafio Regional</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setFilter('regional')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'regional' ? 'bg-brand-primary text-white shadow-lg' : 'text-zinc-500'}`}
          >
            Regional (20km)
          </button>
          <button 
            onClick={() => setFilter('general')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'general' ? 'bg-brand-primary text-white shadow-lg' : 'text-zinc-500'}`}
          >
            Geral
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${typeFilter === 'all' ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setTypeFilter('car')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${typeFilter === 'car' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}
          >
            Carros
          </button>
          <button 
            onClick={() => setTypeFilter('motorcycle')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${typeFilter === 'motorcycle' ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}
          >
            Motos
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRankings.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-zinc-500 text-xs font-bold uppercase">Nenhum tempo registrado nesta região</p>
          </div>
        ) : (
          filteredRankings.map((entry, index) => (
            <div key={entry.id} className="glass-panel rounded-2xl p-4 border-white/5 flex items-center gap-4">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-xs font-black italic text-brand-primary border border-brand-primary/20">
                #{index + 1}
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                {entry.userPhoto ? (
                  <img src={entry.userPhoto} alt={entry.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{entry.userName}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase truncate">{entry.vehicleName}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-display font-black text-brand-accent italic leading-none">{entry.time.toFixed(2)}s</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">{Math.round(entry.maxSpeed)} km/h</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
          Apenas puxadas realizadas em <span className="text-white font-bold">plano ou subida</span> são válidas para o ranking. Descidas são automaticamente invalidadas pelo sistema.
        </p>
      </div>
    </div>
  );
}

function ProfileSettings({ 
  user, 
  onUpdate, 
  onBack 
}: { 
  user: FirebaseUser | null, 
  onUpdate: (data: { displayName?: string, photoURL?: string }) => void, 
  onBack: () => void 
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      onUpdate({ photoURL: url });
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onUpdate({ displayName });
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">PERFIL</h2>
          <p className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">Dados do Piloto</p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-primary/30 shadow-lg shadow-brand-primary/10">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <User className="w-10 h-10 text-zinc-700" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-brand-primary rounded-full text-white shadow-lg cursor-pointer hover:bg-red-500 transition-colors active:scale-90">
            <Camera className="w-4 h-4" />
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Toque na câmera para alterar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nome de Piloto</label>
          <input 
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Seu nome ou apelido"
            className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-brand-primary/50 transition-colors"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">E-mail (Não editável)</label>
          <input 
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-zinc-500 cursor-not-allowed"
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            className="w-full py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
          >
            <Zap className="w-5 h-5" />
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsMenu({ 
  user, 
  isGuest, 
  vehicles,
  activeVehicle,
  onSelectVehicle,
  onNavigate, 
  onBack 
}: { 
  user: FirebaseUser | null, 
  isGuest: boolean, 
  vehicles: Vehicle[],
  activeVehicle: Vehicle | null,
  onSelectVehicle: (v: Vehicle) => void,
  onNavigate: (screen: Screen) => void, 
  onBack: () => void 
}) {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">AJUSTES</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Menu de Configurações</p>
        </div>
      </div>

      {!isGuest && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Veículo Ativo</h3>
          <div className="grid grid-cols-1 gap-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelectVehicle(v)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${v.active ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${v.active ? 'bg-brand-primary/20' : 'bg-zinc-800'}`}>
                  {v.type === 'car' ? <Car className={`w-4 h-4 ${v.active ? 'text-brand-primary' : 'text-zinc-600'}`} /> : <Navigation className={`w-4 h-4 -rotate-90 ${v.active ? 'text-brand-primary' : 'text-zinc-600'}`} />}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-xs font-bold ${v.active ? 'text-white' : 'text-zinc-500'}`}>{v.nickname}</p>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase">{v.brand} {v.model}</p>
                </div>
                {v.active && <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Conta e Perfil</h3>
        
        <button 
          onClick={() => isGuest ? null : onNavigate('profile-settings')}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isGuest ? 'bg-zinc-900/30 border-white/5 opacity-50 cursor-not-allowed' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10 active:scale-[0.98]'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isGuest ? 'bg-zinc-800' : 'bg-brand-primary/10'}`}>
            {isGuest ? <Lock className="w-5 h-5 text-zinc-600" /> : <User className="w-5 h-5 text-brand-primary" />}
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-bold text-white">Meu Perfil</h4>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Dados e foto do piloto</p>
          </div>
          {!isGuest && <ChevronRight className="w-5 h-5 text-zinc-700" />}
        </button>

        <button 
          onClick={() => isGuest ? null : onNavigate('vehicle-settings')}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isGuest ? 'bg-zinc-900/30 border-white/5 opacity-50 cursor-not-allowed' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10 active:scale-[0.98]'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isGuest ? 'bg-zinc-800' : 'bg-brand-secondary/10'}`}>
            {isGuest ? <Lock className="w-5 h-5 text-zinc-600" /> : <Car className="w-5 h-5 text-brand-secondary" />}
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-bold text-white">Meus Veículos</h4>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Gerenciar garagem</p>
          </div>
          {!isGuest && <ChevronRight className="w-5 h-5 text-zinc-700" />}
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Aplicativo</h3>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-300">Versão</span>
            <span className="text-xs font-mono text-zinc-500">1.0.0</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-300">Termos de Uso</span>
            <button onClick={() => onNavigate('terms')} className="text-xs font-bold text-brand-primary uppercase tracking-widest">Ver</button>
          </div>
        </div>
      </div>

      {isGuest && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
            Você está no <span className="text-brand-primary font-bold">Modo Visitante</span>. 
            Crie uma conta para salvar seus veículos, fotos e tempos na nuvem.
          </p>
        </div>
      )}
    </div>
  );
}

function TermsOfUse({ onAccept, onDecline }: { onAccept: () => void, onDecline: () => void }) {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
          <AlertCircle className="w-8 h-8 text-brand-primary" />
        </div>
        <h2 className="text-2xl font-display font-black italic text-white uppercase tracking-tighter">
          TERMOS DE USO E RESPONSABILIDADE
        </h2>
      </div>

      <div className="glass-panel rounded-2xl p-6 border-white/5 space-y-6 text-zinc-400 text-sm leading-relaxed">
        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">1. ACEITAÇÃO DOS TERMOS</h3>
          <p>Ao clicar em “ACEITO E CONTINUAR”, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso, Responsabilidade e Política de Privacidade. Caso não concorde, selecione “NÃO ACEITO”, e o uso do aplicativo será interrompido.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">2. FINALIDADE DO APLICATIVO</h3>
          <p>O <span className="text-white font-bold">DRAGFIRE</span> é um aplicativo destinado ao monitoramento de desempenho veicular, incluindo medições como aceleração (0–100 km/h, 0–200 km/h), tempo, velocidade e outras métricas.</p>
          <p className="text-brand-primary/80 font-medium italic">⚠️ O uso é permitido exclusivamente em ambientes privados, controlados e legalmente autorizados, como pistas fechadas, autódromos ou propriedades particulares.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-brand-primary font-black text-[10px] uppercase tracking-widest">3. USO PROIBIDO</h3>
          <p>É expressamente proibido:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Utilizar o aplicativo em vias públicas para testes de desempenho;</li>
            <li>Praticar direção perigosa ou ilegal com base nas informações do app;</li>
            <li>Utilizar o aplicativo de forma que viole leis de trânsito ou normas de segurança.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">4. RESPONSABILIDADE DO USUÁRIO</h3>
          <p>O usuário declara que:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Utiliza o aplicativo por sua conta e risco;</li>
            <li>Cumpre integralmente a legislação vigente;</li>
            <li>É o único responsável pela condução do veículo;</li>
            <li>Assume total responsabilidade por quaisquer danos materiais, pessoais ou a terceiros decorrentes do uso.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">5. ISENÇÃO DE RESPONSABILIDADE</h3>
          <p>O <span className="text-white font-bold">DRAGFIRE</span> não se responsabiliza por:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Acidentes, multas, penalidades ou infrações;</li>
            <li>Danos ao veículo, ao usuário ou terceiros;</li>
            <li>Uso indevido, ilegal ou imprudente do aplicativo;</li>
            <li>Decisões tomadas com base nos dados fornecidos.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">6. LIMITAÇÃO DE GARANTIA</h3>
          <p>O aplicativo é fornecido “como está”, sem garantias de precisão absoluta dos dados, funcionamento ininterrupto ou livre de erros.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">7. COLETA DE DADOS (LGPD)</h3>
          <p>Para funcionamento do aplicativo, poderão ser coletados dados de localização (GPS), desempenho do veículo, dados do dispositivo e informações fornecidas pelo usuário.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">8. FINALIDADE DO TRATAMENTO DE DADOS</h3>
          <p>Os dados coletados serão utilizados para o funcionamento das funcionalidades, geração de métricas, melhoria da experiência e segurança.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">9. COMPARTILHAMENTO DE DADOS</h3>
          <p>Os dados não serão vendidos. Poderão ser compartilhados apenas quando necessário para funcionamento técnico ou por obrigação legal.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">10. ARMAZENAMENTO E SEGURANÇA</h3>
          <p>Os dados são armazenados em ambiente seguro, com medidas técnicas adequadas para proteção contra acesso não autorizado.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">11. DIREITOS DO USUÁRIO (LGPD)</h3>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados através do contato: <span className="text-white font-bold">guisq1515@gmail.com</span></p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">12. RETENÇÃO DE DADOS</h3>
          <p>Os dados serão armazenados apenas pelo tempo necessário para cumprir as finalidades descritas ou conforme exigido por lei.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">13. ALTERAÇÕES NOS TERMOS</h3>
          <p>Estes termos podem ser atualizados a qualquer momento. O uso contínuo do app após alterações implica nova aceitação.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">14. LEGISLAÇÃO E FORO</h3>
          <p>Este termo será regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para resolução de conflitos.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest">15. CONSENTIMENTO FINAL</h3>
          <p>Ao clicar em “ACEITO E CONTINUAR”, você declara que leu e concorda com todos os termos, autoriza o tratamento de dados e assume total responsabilidade pelo uso.</p>
        </div>
      </div>

      <div className="pb-8 space-y-3">
        <button 
          onClick={onAccept}
          className="w-full py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
        >
          <Zap className="w-5 h-5" />
          ACEITO E CONTINUAR
        </button>
        <button 
          onClick={onDecline}
          className="w-full py-3 bg-zinc-900 text-zinc-500 rounded-xl font-bold text-sm hover:text-white transition-all active:scale-95 border border-white/5"
        >
          NÃO ACEITO
        </button>
      </div>
    </div>
  );
}

function VehicleSettings({ 
  vehicles,
  onSave, 
  onDelete,
  onBack 
}: { 
  vehicles: Vehicle[], 
  onSave: (v: Vehicle) => void, 
  onDelete: (v: Vehicle) => void,
  onBack: () => void 
}) {
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Vehicle>({
    type: 'car',
    brand: '',
    model: '',
    year: YEARS[0],
    nickname: ''
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      // 1. Create a canvas to resize and compress the image
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // 2. Convert to blob with reduced quality (0.6)
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6)
      );

      if (!blob) throw new Error('Falha ao processar imagem');

      // 3. Upload to Firebase Storage
      const storageRef = ref(storage, `vehicles/${auth.currentUser.uid}/${Date.now()}.jpg`);
      
      // Delete old photo if exists
      if (formData.photoURL) {
        try {
          const oldRef = ref(storage, formData.photoURL);
          await deleteObject(oldRef);
        } catch (err) {
          console.warn('Could not delete old photo:', err);
        }
      }

      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setFormData({ ...formData, photoURL: downloadURL });
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Erro ao carregar foto. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const brands = useMemo(() => {
    return Object.keys(VEHICLE_DATA[formData.type]);
  }, [formData.type]);

  const models = useMemo(() => {
    if (!formData.brand) return [];
    return (VEHICLE_DATA[formData.type] as any)[formData.brand] || [];
  }, [formData.type, formData.brand]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      // Ensure at least a nickname or brand/model is provided for better display
      const finalData = {
        ...formData,
        nickname: formData.nickname?.trim() || (formData.brand ? `${formData.brand} ${formData.model}` : 'Meu Veículo')
      };

      console.log('Submitting vehicle data:', finalData);
      await onSave(finalData);
      
      setEditingVehicle(null);
      setFormData({
        type: 'car',
        brand: '',
        model: '',
        year: '',
        nickname: ''
      });
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      setSaveError(error?.message || 'Erro inesperado ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData(v);
  };

  const handleAddNew = () => {
    setEditingVehicle({
      type: 'car',
      brand: '',
      model: '',
      year: YEARS[0],
      nickname: ''
    } as Vehicle);
    setFormData({
      type: 'car',
      brand: '',
      model: '',
      year: YEARS[0],
      nickname: ''
    });
  };

  if (!editingVehicle) {
    return (
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
        <div className="flex items-center gap-4 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
          <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-black italic text-white leading-none">MEUS VEÍCULOS</h2>
            <p className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">Garagem Virtual</p>
          </div>
        </div>

        <div className="space-y-3">
          {vehicles.map((v) => (
            <div 
              key={v.id}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${v.active ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-zinc-900/50 border-white/5'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${v.active ? 'bg-brand-primary/20' : 'bg-zinc-800'}`}>
                {v.photoURL ? (
                  <img src={v.photoURL} alt={v.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  v.type === 'car' ? <Car className={`w-6 h-6 ${v.active ? 'text-brand-primary' : 'text-zinc-500'}`} /> : <Navigation className={`w-6 h-6 -rotate-90 ${v.active ? 'text-brand-primary' : 'text-zinc-500'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{v.nickname}</h4>
                  {v.active && <span className="text-[8px] bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Ativo</span>}
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">{v.brand} {v.model} • {v.year}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEdit(v)}
                  className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(v)}
                  className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAddNew}
            className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-white/10 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Adicionar Novo Veículo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-4 bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20">
        <button onClick={() => setEditingVehicle(null)} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">
            {editingVehicle.id ? 'EDITAR VEÍCULO' : 'NOVO VEÍCULO'}
          </h2>
          <p className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">Dados Técnicos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group-hover:border-brand-primary/50 transition-colors">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Camera className="w-8 h-8 text-zinc-700 group-hover:text-brand-primary/50 transition-colors" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-red-500 transition-colors active:scale-90">
              <Plus className="w-5 h-5 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
            </label>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Foto do Veículo</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Tipo de Veículo</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'car', brand: '', model: '' })}
              className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${formData.type === 'car' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-600/20' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
            >
              <Car className="w-5 h-5" />
              CARRO
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'motorcycle', brand: '', model: '' })}
              className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${formData.type === 'motorcycle' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-red-600/20' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
            >
              <Navigation className="w-5 h-5 -rotate-90" />
              MOTO
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nome Afetivo (Apelido)</label>
          <input 
            type="text"
            value={formData.nickname}
            onChange={e => setFormData({...formData, nickname: e.target.value})}
            placeholder="Ex: Foguete Vermelho"
            className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-brand-primary/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Marca</label>
            <select 
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value, model: ''})}
              className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
            >
              <option value="">Selecione</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Modelo</label>
            <select 
              value={formData.model}
              onChange={e => setFormData({...formData, model: e.target.value})}
              className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.brand}
            >
              <option value="">Selecione</option>
              {models.map((model: string) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Ano</label>
          <select 
            value={formData.year}
            onChange={e => setFormData({...formData, year: e.target.value})}
            className="w-full bg-zinc-900 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
          >
            <option value="">Selecione</option>
            {YEARS.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {saveError && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 text-red-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{saveError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <button 
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                SALVAR VEÍCULO
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={onBack}
            className="w-full py-3 text-zinc-500 text-sm font-bold hover:text-white transition-colors"
          >
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}

function DuelComparison({ challenge }: { challenge: Challenge }) {
  if (!challenge.opponentResult) return null;

  const data = [
    { name: 'Tempo (s)', [challenge.creatorName]: challenge.result.time, Você: challenge.opponentResult.time },
    { name: 'Velo. Máx (km/h)', [challenge.creatorName]: challenge.result.maxSpeed, Você: challenge.opponentResult.maxSpeed },
    { name: 'Velo. Média (km/h)', [challenge.creatorName]: challenge.result.avgSpeed, Você: challenge.opponentResult.avgSpeed },
  ];

  // Prepare chart data (speed over time)
  const chartData = challenge.result.path.map((p, i) => ({
    time: i,
    [challenge.creatorName]: p.speed,
    Você: challenge.opponentResult?.path[i]?.speed || 0
  }));

  const isWinner = challenge.opponentResult.time < challenge.result.time;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${isWinner ? 'bg-brand-secondary shadow-green-600/20' : 'bg-brand-primary shadow-red-600/20'}`}>
          <Trophy className={`w-8 h-8 ${isWinner ? 'text-zinc-950' : 'text-white'}`} />
        </div>
        <h2 className="text-2xl font-display font-black italic text-white uppercase italic">
          {isWinner ? 'VOCÊ VENCEU!' : 'NÃO FOI DESSA VEZ'}
        </h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Duelo Finalizado</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Creator Card */}
        <div className="glass-panel rounded-2xl p-4 border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">{challenge.creatorName}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-zinc-600 uppercase">Tempo</span>
            <p className="text-2xl font-display font-black text-white italic">{challenge.result.time.toFixed(2)}s</p>
          </div>
          <div className="text-[9px] text-zinc-500 font-bold uppercase">
            {Math.round(challenge.result.maxSpeed)} km/h máx
          </div>
        </div>

        {/* Opponent Card (You) */}
        <div className={`glass-panel rounded-2xl p-4 space-y-3 border ${isWinner ? 'border-brand-secondary/30 bg-brand-secondary/5' : 'border-white/5'}`}>
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-brand-accent" />
            <span className="text-[9px] font-black text-brand-accent uppercase tracking-widest">VOCÊ</span>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-zinc-600 uppercase">Tempo</span>
            <p className={`text-2xl font-display font-black italic ${isWinner ? 'text-brand-secondary' : 'text-white'}`}>{challenge.opponentResult.time.toFixed(2)}s</p>
          </div>
          <div className="text-[9px] text-zinc-500 font-bold uppercase">
            {Math.round(challenge.opponentResult.maxSpeed)} km/h máx
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Comparativo de Velocidade</h3>
        <div className="h-[200px] w-full bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCreator" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#71717a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis hide />
              <YAxis 
                stroke="#3f3f46" 
                fontSize={10} 
                tickFormatter={(val) => `${val}`}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey={challenge.creatorName} 
                stroke="#71717a" 
                fillOpacity={1} 
                fill="url(#colorCreator)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="Você" 
                stroke="#00f2ff" 
                fillOpacity={1} 
                fill="url(#colorYou)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Trajetos Comparados</h3>
        <div className="h-[200px] rounded-2xl overflow-hidden border border-white/5">
          <MapContainer 
            center={[challenge.result.path[0].latitude, challenge.result.path[0].longitude]} 
            zoom={16} 
            className="h-full w-full"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Polyline 
              positions={challenge.result.path.map(p => [p.latitude, p.longitude] as [number, number])} 
              color="#71717a" 
              weight={4}
              opacity={0.5}
            />
            <Polyline 
              positions={challenge.opponentResult.path.map(p => [p.latitude, p.longitude] as [number, number])} 
              color="#00f2ff" 
              weight={4}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

function ChallengeView({ 
  challenge, 
  onAccept, 
  onDecline,
  currentLocation
}: { 
  challenge: Challenge, 
  onAccept: () => void, 
  onDecline: () => void,
  currentLocation: { latitude: number, longitude: number } | null
}) {
  const startPoint = challenge.result.path[0];
  const distanceToStart = currentLocation 
    ? calculateDistance(currentLocation, startPoint) 
    : null;

  const isNearStart = distanceToStart !== null && distanceToStart < 100; // 100 meters radius

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center gap-4 bg-brand-accent/10 p-4 rounded-2xl border border-brand-accent/20">
        <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)]">
          <Swords className="w-6 h-6 text-zinc-950" />
        </div>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">CONVITE DE DUELO</h2>
          <p className="text-xs text-brand-accent font-bold uppercase tracking-widest mt-1">De: {challenge.creatorName}</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Modalidade</span>
          <span className="text-white font-bold">{challenge.result.config.target}{challenge.result.config.mode === 'speed' ? ' km/h' : 'm'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Tempo a Bater</span>
          <span className="text-brand-primary text-2xl font-display font-black italic">{challenge.result.time.toFixed(2)}s</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Expira em</span>
          <div className="flex items-center gap-1.5 text-orange-500 font-bold">
            <Clock className="w-4 h-4" />
            <span>48h</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Local do Desafio</h3>
        <RunMap result={challenge.result} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-medium bg-zinc-900/50 p-3 rounded-xl border border-white/5">
            <Navigation className="w-4 h-4 text-brand-accent" />
            {distanceToStart !== null ? (
              <span>Você está a <strong className="text-white">{Math.round(distanceToStart)}m</strong> do ponto de largada.</span>
            ) : (
              <span>Aguardando sinal de GPS para verificar sua posição...</span>
            )}
          </div>
          <button 
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${startPoint.latitude},${startPoint.longitude}&travelmode=driving`;
              window.open(url, '_blank');
            }}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-white/5"
          >
            <MapPin className="w-4 h-4 text-brand-accent" />
            COMO CHEGAR NA LARGADA
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <button 
          onClick={onAccept}
          disabled={!isNearStart}
          className={`w-full py-4 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
            isNearStart 
              ? 'bg-brand-secondary text-zinc-950 shadow-green-600/20' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Play className="w-5 h-5" />
          ACEITAR DESAFIO
        </button>
        {!isNearStart && (
          <p className="text-[9px] text-center text-zinc-500 font-bold uppercase">
            Vá até o local da largada para aceitar o duelo
          </p>
        )}
        <button 
          onClick={onDecline}
          className="w-full py-3 text-zinc-500 text-sm font-bold hover:text-white transition-colors"
        >
          RECUSAR
        </button>
      </div>
    </div>
  );
}

function RunMap({ result }: { result: RunResult }) {
  const positions = useMemo(() => 
    result.path.map(p => [p.latitude, p.longitude] as [number, number]), 
  [result.path]);

  if (positions.length === 0) return null;

  const startPoint = positions[0];
  const endPoint = positions[positions.length - 1];

  function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, 16);
    return null;
  }

  return (
    <div className="h-48 w-full rounded-xl overflow-hidden border border-white/10 mt-4 relative group">
      <MapContainer 
        center={startPoint} 
        zoom={16} 
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Polyline 
          positions={positions} 
          pathOptions={{ color: '#00f2ff', weight: 4, opacity: 0.8 }} 
        />
        <Marker position={startPoint} />
        <Marker position={endPoint} />
        <ChangeView center={startPoint} />
      </MapContainer>
      <div className="absolute top-2 right-2 z-10 bg-zinc-950/80 p-1.5 rounded-lg backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <MapIcon className="w-3 h-3 text-brand-accent" />
      </div>
    </div>
  );
}

const PRESETS = [
  { id: '0-100', label: '0-100 km/h', mode: 'speed' as const, target: 100, startSpeed: 0, description: 'Teste clássico de aceleração', icon: Zap, color: 'from-red-500 to-orange-500', type: 'standing' },
  { id: '0-200', label: '0-200 km/h', mode: 'speed' as const, target: 200, startSpeed: 0, description: 'Performance em alta velocidade', icon: Gauge, color: 'from-orange-500 to-yellow-500', type: 'standing' },
  { id: '100-200', label: '100-200 km/h', mode: 'speed' as const, target: 200, startSpeed: 100, description: 'Retomada em movimento', icon: Timer, color: 'from-yellow-500 to-green-500', type: 'rolling' },
  { id: '201m', label: '201m', mode: 'distance' as const, target: 201, startSpeed: 0, description: '1/8 de milha (Arrancada)', icon: Flag, color: 'from-blue-500 to-cyan-500', type: 'standing' },
  { id: '402m', label: '402m', mode: 'distance' as const, target: 402, startSpeed: 0, description: '1/4 de milha (Padrão)', icon: Trophy, color: 'from-purple-500 to-pink-500', type: 'standing' },
  { id: '1km', label: '1km', mode: 'distance' as const, target: 1000, startSpeed: 0, description: 'Velocidade final máxima', icon: Flag, color: 'from-zinc-500 to-zinc-400', type: 'standing' },
];

function GPSIndicator({ accuracy, onRequest }: { accuracy: number | null, onRequest: () => void }) {
  const getSignalLevel = () => {
    if (accuracy === null) return 0;
    if (accuracy < 5) return 4;
    if (accuracy < 10) return 3;
    if (accuracy < 20) return 2;
    if (accuracy < 50) return 1;
    return 0;
  };

  const level = getSignalLevel();
  const colors = ['text-zinc-700', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500'];

  return (
    <button 
      onClick={onRequest}
      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-full hover:bg-zinc-800 transition-colors active:scale-95"
    >
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`w-1 rounded-full transition-all ${i <= level ? 'bg-current' : 'bg-zinc-800'} ${colors[level]}`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest ${colors[level]}`}>
        {level === 4 ? 'Excelente' : level === 3 ? 'Bom' : level === 2 ? 'Regular' : level === 1 ? 'Fraco' : 'Sem Sinal'}
      </span>
    </button>
  );
}

export default function App() {
  const {
    currentSpeed,
    distance,
    isRunning,
    isWaiting,
    elapsedTime,
    lastResult,
    error,
    accuracy,
    gpsStatus,
    lastPosition,
    startRun,
    reset,
    setMockResult,
    requestPermission,
    isReady
  } = usePerformanceTimer();

  const [screen, setScreen] = useState<Screen>('home');
  const [activeConfig, setActiveConfig] = useState<typeof PRESETS[0] | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [guestTermsAccepted, setGuestTermsAccepted] = useState(false);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      if (!user) return;
      try {
        console.log("Testing Firestore connection...");
        // Try to read a non-existent doc to test connectivity
        await getDocFromServer(doc(db, '_connection_test', 'ping'));
        console.log("Firestore connection test successful (Read)");
      } catch (error) {
        console.error("Firestore connection test failed:", error);
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, [user]);

  // Auth Listener
  useEffect(() => {
    let unsubscribeVehicles: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      setUser(firebaseUser);
      setIsAuthReady(true);
      setIsLoggingIn(false); // Reset loading state when auth state is resolved
      
      if (firebaseUser) {
        setIsGuest(false); // Reset guest mode if logged in
        // Sync user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              termsAccepted: false,
              termsVersion: TERMS_VERSION,
              createdAt: new Date().toISOString()
            });
            setScreen('terms');
          } else if (!userData?.termsAccepted || userData?.termsVersion !== TERMS_VERSION) {
            setScreen('terms');
          } else {
            setScreen('home');
          }

          // Real-time vehicles sync
          const vehiclesRef = collection(db, 'vehicles');
          const q = query(vehiclesRef, where('uid', '==', firebaseUser.uid));
          
          unsubscribeVehicles = onSnapshot(q, (snapshot) => {
            const vehicleList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vehicle));
            console.log('Vehicles updated:', vehicleList);
            setVehicles(vehicleList);
            
            // Set active vehicle (the one with active: true or the first one)
            const active = vehicleList.find(v => v.active) || vehicleList[0] || null;
            setVehicle(active);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'vehicles');
          });

        } catch (error) {
          console.error('Error syncing user data:', error);
        }
      } else {
        if (unsubscribeVehicles) {
          unsubscribeVehicles();
          unsubscribeVehicles = null;
        }
        if (!isGuest) {
          setVehicle(null);
          setVehicles([]);
          setScreen('login');
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeVehicles) unsubscribeVehicles();
    };
  }, [isGuest]);

  const handleAcceptTerms = async () => {
    if (isGuest) {
      setGuestTermsAccepted(true);
      setScreen('home');
      return;
    }

    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { 
        termsAccepted: true,
        termsVersion: TERMS_VERSION 
      }, { merge: true });
      setScreen('home');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleUpdateProfile = async (data: { displayName?: string, photoURL?: string }) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      // Update local user state to reflect changes in UI immediately
      setUser(prev => prev ? { ...prev, ...data } as FirebaseUser : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setGuestTermsAccepted(false);
    setScreen('terms');
  };

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // The onAuthStateChanged listener will handle the screen transition
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
      if (error.code === 'auth/popup-blocked') {
        alert('O login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else {
        alert('Erro ao fazer login: ' + error.message);
      }
    }
  };

  // Remove redirect result handler as we are using popups only
  useEffect(() => {
    // No-op
  }, []);

  const handleLogout = async () => {
    try {
      if (isGuest) {
        setIsGuest(false);
        setGuestTermsAccepted(false);
        setScreen('login');
      } else {
        await signOut(auth);
        setScreen('login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveVehicle = async (v: Vehicle) => {
    if (!user) {
      console.warn('Cannot save vehicle: No user logged in');
      return;
    }
    
    console.log('Attempting to save vehicle:', v);
    
    try {
      if (v.id) {
        // Update existing
        console.log('Updating existing vehicle:', v.id);
        const vehicleRef = doc(db, 'vehicles', v.id);
        await setDoc(vehicleRef, { ...v, updatedAt: new Date().toISOString() }, { merge: true });
        console.log('Vehicle update successful');
      } else {
        // Create new
        console.log('Creating new vehicle');
        const vehicleData = { 
          ...v, 
          uid: user.uid, 
          active: vehicles.length === 0, // Set as active if it's the first one
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
        const newDocRef = await addDoc(collection(db, 'vehicles'), vehicleData);
        console.log('Vehicle creation successful, ID:', newDocRef.id);
      }

      // Only change screen if we are not already in vehicle-settings
      if (screen !== 'vehicle-settings') {
        setScreen('vehicle-settings');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      handleFirestoreError(error, OperationType.WRITE, `vehicles`);
      throw error; // Re-throw so handleSubmit can catch it
    }
  };

  const selectVehicle = async (v: Vehicle) => {
    if (!user || !v.id) return;

    try {
      const batch = writeBatch(db);
      // Deactivate all
      vehicles.forEach(veh => {
        if (veh.id) {
          batch.update(doc(db, 'vehicles', veh.id), { active: false });
        }
      });
      // Activate selected
      batch.update(doc(db, 'vehicles', v.id), { active: true });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${v.id}`);
    }
  };

  const deleteVehicle = async (v: Vehicle) => {
    if (!user || !v.id) return;
    if (vehicles.length <= 1) {
      alert("Você precisa ter pelo menos um veículo cadastrado.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'vehicles', v.id));
      const newList = vehicles.filter(veh => veh.id !== v.id);
      setVehicles(newList);
      if (v.active) {
        const newActive = newList[0];
        await selectVehicle(newActive);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${v.id}`);
    }
  };

  useEffect(() => {
    if (lastResult && activeChallenge && activeChallenge.status === 'pending') {
      const updatedChallenge: Challenge = {
        ...activeChallenge,
        status: 'completed',
        opponentResult: lastResult
      };
      setActiveChallenge(updatedChallenge);
      setScreen('duel-result');

      // Save duel result to Firestore
      if (user) {
        const challengeRef = doc(db, 'challenges', activeChallenge.id);
        setDoc(challengeRef, updatedChallenge, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `challenges/${activeChallenge.id}`));
      }
    } else if (lastResult && !activeChallenge) {
      // Save solo run result to Firestore
      if (user) {
        const runData = { ...lastResult, uid: user.uid };
        addDoc(collection(db, 'runs'), runData)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, 'runs'));

        // Save to rankings if it's a valid 0-100 run
        if (
          lastResult.config.mode === 'speed' && 
          lastResult.config.target === 100 && 
          lastResult.isValidSlope && 
          lastResult.location
        ) {
          const rankingData: Omit<RankingEntry, 'id'> = {
            uid: user.uid,
            userName: user.displayName || 'Piloto',
            userPhoto: user.photoURL || undefined,
            vehicleName: vehicle ? `${vehicle.nickname} (${vehicle.model})` : 'Veículo não cadastrado',
            vehicleType: vehicle?.type || 'car',
            time: lastResult.time,
            maxSpeed: lastResult.maxSpeed,
            timestamp: lastResult.timestamp,
            latitude: lastResult.location.latitude,
            longitude: lastResult.location.longitude,
            slope: lastResult.slope || 0
          };
          addDoc(collection(db, 'rankings'), rankingData)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, 'rankings'));
        }
      }
    }
  }, [lastResult]);

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setActiveConfig(preset);
    setScreen('timer');
    
    // Auto-start ONLY for rolling starts (100-200)
    if (preset.type === 'rolling') {
      const config: RunConfig = {
        mode: preset.mode,
        target: preset.target,
        startSpeed: preset.startSpeed
      };
      startRun(config);
    }
  };

  const handleStart = () => {
    if (!activeConfig) return;
    const config: RunConfig = {
      mode: activeConfig.mode,
      target: activeConfig.target,
      startSpeed: activeConfig.startSpeed
    };
    startRun(config);
  };

  const handleBack = () => {
    reset();
    setScreen('home');
    setActiveConfig(null);
  };

  const handleSimulateMock = () => {
    const creatorResult: RunResult = {
      id: 'creator-123',
      timestamp: Date.now(),
      config: { mode: 'speed', target: 100 },
      time: 4.85,
      maxSpeed: 101.2,
      avgSpeed: 52.4,
      distance: 72,
      path: Array.from({ length: 10 }, (_, i) => ({
        latitude: -22.9068 + (i * 0.0001),
        longitude: -43.1729 + (i * 0.0001),
        altitude: null,
        speed: i * 11,
        timestamp: Date.now() + (i * 500)
      }))
    };

    const opponentResult: RunResult = {
      id: 'opponent-123',
      timestamp: Date.now(),
      config: { mode: 'speed', target: 100 },
      time: 4.52,
      maxSpeed: 104.8,
      avgSpeed: 55.1,
      distance: 68,
      path: Array.from({ length: 10 }, (_, i) => ({
        latitude: -22.9068 + (i * 0.0001),
        longitude: -43.1729 + (i * 0.0001),
        altitude: null,
        speed: i * 12,
        timestamp: Date.now() + (i * 450)
      }))
    };

    const mockChallenge: Challenge = {
      id: 'challenge-123',
      creatorId: 'user-2',
      creatorName: 'Alemão do Opala',
      result: creatorResult,
      opponentResult: opponentResult,
      expiresAt: Date.now() + 86400000,
      status: 'completed'
    };

    setActiveChallenge(mockChallenge);
    setScreen('duel-result');
  };

  const handleDuel = () => {
    if (!lastResult) return;
    
    const challenge: Challenge = {
      id: crypto.randomUUID(),
      creatorId: 'user-1',
      creatorName: 'Piloto X',
      result: lastResult,
      expiresAt: Date.now() + (48 * 60 * 60 * 1000),
      status: 'pending'
    };
    
    setActiveChallenge(challenge);
    
    // Simulate sharing
    const shareText = `Desafio você para um duelo de ${challenge.result.config.target}${challenge.result.config.mode === 'speed' ? 'km/h' : 'm'}! Meu tempo foi ${challenge.result.time.toFixed(2)}s. Aceita?`;
    if (navigator.share) {
      navigator.share({
        title: 'Duelo DragFire',
        text: shareText,
        url: window.location.href,
      }).catch(() => {
        alert('Link de duelo copiado para a área de transferência!');
      });
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      alert('Link de duelo copiado para a área de transferência!');
    }
    
    setScreen('challenge');
  };

  const handleAcceptChallenge = () => {
    if (!activeChallenge) return;
    
    const preset = PRESETS.find(p => 
      p.mode === activeChallenge.result.config.mode && 
      p.target === activeChallenge.result.config.target
    ) || PRESETS[0];

    setActiveConfig(preset);
    setScreen('timer');
    
    const config: RunConfig = {
      mode: activeChallenge.result.config.mode,
      target: activeChallenge.result.config.target,
      startSpeed: activeChallenge.result.config.startSpeed
    };
    startRun(config);
  };

  const isStopped = currentSpeed < 3;

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
        <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <motion.div 
              key="loading"
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : screen === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] mb-8">
              <Gauge className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-display font-black italic text-white leading-none tracking-tighter mb-2">DRAGFIRE</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-12">Performance GPS Timer</p>
            
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full max-w-xs py-4 bg-white text-zinc-950 rounded-xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-zinc-100 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              )}
              {isLoggingIn ? 'Entrando...' : 'Entrar com Google'}
            </button>

            <button 
              onClick={handleGuestLogin}
              className="mt-4 w-full max-w-xs py-4 bg-zinc-900 text-zinc-400 rounded-xl font-bold flex items-center justify-center gap-3 border border-white/5 hover:bg-zinc-800 transition-all active:scale-95"
            >
              Entrar como Visitante
            </button>
            <p className="mt-8 text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
              Sincronize seus tempos e veículos na nuvem
            </p>
          </motion.div>
        ) : screen === 'terms' ? (
          <motion.div
            key="terms"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TermsOfUse onAccept={handleAcceptTerms} onDecline={handleLogout} />
          </motion.div>
        ) : screen === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SettingsMenu 
              user={user} 
              isGuest={isGuest} 
              vehicles={vehicles}
              activeVehicle={vehicle}
              onSelectVehicle={selectVehicle}
              onNavigate={setScreen} 
              onBack={() => setScreen('home')} 
            />
          </motion.div>
        ) : screen === 'vehicle-settings' ? (
          <motion.div
            key="vehicle-settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <VehicleSettings 
              vehicles={vehicles} 
              onSave={saveVehicle} 
              onDelete={deleteVehicle}
              onBack={() => setScreen('settings')} 
            />
          </motion.div>
        ) : screen === 'profile-settings' ? (
          <motion.div
            key="profile-settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ProfileSettings 
              user={user} 
              onUpdate={handleUpdateProfile} 
              onBack={() => setScreen('settings')} 
            />
          </motion.div>
        ) : screen === 'regional-ranking' ? (
          <motion.div
            key="regional-ranking"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <RegionalRanking 
              userLocation={lastPosition} 
              onBack={() => setScreen('home')} 
            />
          </motion.div>
        ) : screen === 'history' ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <HistoryView 
              user={user} 
              onBack={() => setScreen('home')} 
            />
          </motion.div>
        ) : screen === 'gps-guide' ? (
          <motion.div
            key="gps-guide"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <GPSGuide onBack={() => setScreen('home')} />
          </motion.div>
        ) : screen === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Home Header */}
            <header className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-brand-primary/30 shadow-lg shadow-brand-primary/10">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-brand-primary flex items-center justify-center neon-glow">
                      <Gauge className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="font-display font-extrabold text-2xl tracking-tighter italic leading-none">
                    DRAG<span className="text-brand-primary">FIRE</span>
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {isGuest ? 'Modo Visitante' : (vehicle ? `${vehicle.nickname} • ${vehicle.model}` : user?.displayName || 'Piloto')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GPSIndicator accuracy={accuracy} onRequest={requestPermission} />
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                  title={isGuest ? "Sair do Modo Visitante" : "Sair"}
                >
                  {isGuest ? <LogOut className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setScreen('settings')}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Home Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6">
              <section className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/20 shadow-lg shadow-brand-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Desafio Regional</h4>
                    <p className="text-[10px] text-brand-primary uppercase font-bold">Ranking 0-100 km/h</p>
                  </div>
                  <button 
                    onClick={() => setScreen('regional-ranking')}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
                  >
                    Ver Ranking
                  </button>
                </div>
              </section>

              {(!accuracy || accuracy > 20) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-xl flex items-start gap-3"
                >
                  <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Sinal Instável</p>
                    <p className="text-zinc-400 text-[10px] leading-relaxed">
                      Para melhores resultados, evite ficar sob árvores ou coberturas metálicas. Procure um local com céu aberto.
                    </p>
                  </div>
                </motion.div>
              )}
              <section>
                <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 px-1">Selecione a Modalidade</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {PRESETS.map((preset) => (
                    <motion.button
                      key={preset.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectPreset(preset)}
                      className="group relative flex flex-col items-start p-4 bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden text-left transition-all hover:bg-zinc-900 hover:border-white/10"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${preset.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
                      
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center mb-3 shadow-lg`}>
                        <preset.icon className="w-5 h-5 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-display font-black italic text-white leading-tight mb-1">{preset.label}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase leading-tight">{preset.description}</p>
                      
                      <div className="mt-4 flex items-center gap-2 text-zinc-500 group-hover:text-brand-primary transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-widest">Selecionar</span>
                        <ChevronLeft className="w-3 h-3 rotate-180" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <section 
                onClick={() => setScreen('history')}
                className="bg-zinc-900/30 rounded-2xl p-4 border border-white/5 cursor-pointer hover:bg-zinc-900/50 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <History className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Histórico</h4>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Ver puxadas anteriores</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-700" />
                </div>
              </section>

              {activeChallenge && (
                <section className={`rounded-2xl p-4 border ${isGuest ? 'bg-zinc-900/50 border-white/5 opacity-50' : 'bg-brand-accent/5 border-brand-accent/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGuest ? 'bg-zinc-800' : 'bg-brand-accent/20'}`}>
                      {isGuest ? <Lock className="w-5 h-5 text-zinc-600" /> : <Swords className="w-5 h-5 text-brand-accent" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">Duelo Ativo</h4>
                      <p className={`text-[10px] uppercase font-bold ${isGuest ? 'text-zinc-600' : 'text-brand-accent'}`}>
                        {isGuest ? 'Disponível apenas para usuários logados' : `Desafio de ${activeChallenge.creatorName}`}
                      </p>
                    </div>
                    {!isGuest && (
                      <button 
                        onClick={() => setScreen('challenge')}
                        className="px-4 py-2 bg-brand-accent text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-accent/20"
                      >
                        Ver Desafio
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section 
                onClick={() => setScreen('gps-guide')}
                className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/10 cursor-pointer hover:bg-brand-primary/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                    <Signal className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Guia de Precisão</h4>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Como melhorar o sinal GPS</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-700" />
                </div>
              </section>
            </main>
          </motion.div>
        ) : screen === 'challenge' && activeChallenge ? (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <header className="p-3 flex items-center justify-between border-b border-white/5 bg-zinc-900/50 backdrop-blur-md z-10">
              <button 
                onClick={() => setScreen('home')}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors flex items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Início</span>
              </button>
              <h1 className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Duelo Ativo</h1>
              <div className="w-8" />
            </header>
            <ChallengeView 
              challenge={activeChallenge} 
              onAccept={handleAcceptChallenge}
              onDecline={() => setScreen('home')}
              currentLocation={lastPosition}
            />
          </motion.div>
        ) : screen === 'duel-result' && activeChallenge ? (
          <motion.div
            key="duel-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <header className="p-3 flex items-center justify-between border-b border-white/5 bg-zinc-900/50 backdrop-blur-md z-10">
              <button 
                onClick={() => {
                  setActiveChallenge(null);
                  setScreen('home');
                }}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors flex items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Início</span>
              </button>
              <h1 className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Resultado do Duelo</h1>
              <button 
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
                onClick={() => {
                  // Share duel result
                  alert('Resultado do duelo copiado!');
                }}
              >
                <Share2 className="w-4 h-4 text-zinc-400" />
              </button>
            </header>
            <DuelComparison challenge={activeChallenge} />
          </motion.div>
        ) : (
          <motion.div 
            key="timer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Timer Header */}
            <header className="p-3 flex items-center justify-between border-b border-white/5 bg-zinc-900/50 backdrop-blur-md z-10">
              <button 
                onClick={handleBack}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors flex items-center gap-1.5 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Voltar</span>
              </button>
              
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest leading-none mb-0.5">{activeConfig?.label}</span>
                <GPSIndicator accuracy={accuracy} onRequest={requestPermission} />
              </div>

              <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                <Settings className="w-4 h-4 text-zinc-400" />
              </button>
            </header>

            {/* GPS Status Bar */}
            <div className="bg-zinc-900/80 backdrop-blur-sm border-b border-white/5 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-green-500 animate-pulse' : gpsStatus === 'searching' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  GPS: {gpsStatus === 'active' ? 'Sinal Ativo' : gpsStatus === 'searching' ? 'Buscando...' : 'Erro'}
                  {accuracy && ` (${accuracy.toFixed(1)}m)`}
                </span>
              </div>
              <button 
                onClick={() => {
                  reset();
                  requestPermission();
                }}
                className="text-[9px] font-black uppercase tracking-widest text-brand-primary hover:text-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reiniciar GPS
              </button>
            </div>

            {/* Timer Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-center gap-2 text-red-400 text-[10px] max-w-md mx-auto">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {(!accuracy || accuracy > 20) && !lastResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-xl flex items-start gap-3 max-w-md mx-auto"
                >
                  <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Dica de Sinal</p>
                    <p className="text-zinc-400 text-[10px] leading-relaxed">
                      Para resultados precisos, evite ficar sob árvores ou coberturas metálicas. Procure um local com céu aberto.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Speedometer */}
              {!lastResult && (
                <div className="relative aspect-square w-full max-w-[280px] mx-auto flex flex-col items-center justify-center">
                  <div className="absolute inset-0 border-[12px] border-zinc-900 rounded-full" />
                  <motion.div 
                    className="absolute inset-0 border-[12px] border-brand-primary rounded-full border-t-transparent border-l-transparent"
                    animate={{ rotate: (currentSpeed / 260) * 270 - 135 }}
                    transition={{ type: 'spring', damping: 15 }}
                  />
                  
                  <div className="text-center z-10">
                    <motion.span 
                      className="block text-8xl font-display font-black italic tracking-tighter speed-text leading-none"
                      animate={{ scale: isRunning ? 1.05 : 1 }}
                    >
                      {Math.round(currentSpeed)}
                    </motion.span>
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm">km/h</span>
                  </div>

                  <div className="absolute bottom-10 flex gap-8 text-zinc-400 font-mono">
                    <div className="text-center">
                      <span className="block text-zinc-600 text-[9px] uppercase font-bold mb-0.5">Tempo</span>
                      <span className="text-white text-lg font-bold leading-none">{elapsedTime.toFixed(2)}s</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-zinc-600 text-[9px] uppercase font-bold mb-0.5">Distância</span>
                      <span className="text-white text-lg font-bold leading-none">
                        {distance > 1000 ? `${(distance / 1000).toFixed(2)}k` : `${Math.round(distance)}m`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Distance Progress Bar */}
              {activeConfig?.mode === 'distance' && (isRunning || isWaiting) && (
                <div className="max-w-[320px] mx-auto w-full space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span>Progresso do Percurso</span>
                    <span className="text-brand-accent">{Math.round(Math.min((distance / activeConfig.target) * 100, 100))}%</span>
                  </div>
                  <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <motion.div 
                      className="h-full bg-brand-accent rounded-full shadow-[0_0_15px_rgba(0,242,255,0.4)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((distance / activeConfig.target) * 100, 100)}%` }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                    <span>LARGADA (0m)</span>
                    <span>CHEGADA ({activeConfig.target}m)</span>
                  </div>
                </div>
              )}

              {/* Status/Results */}
              <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                  {isWaiting && (
                    <motion.div 
                      key="waiting"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center p-6 glass-panel rounded-2xl border-brand-secondary/30"
                    >
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 transition-all duration-500 ${isReady ? 'bg-brand-secondary shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'bg-brand-secondary/20 animate-pulse'}`}>
                        {activeConfig?.id === '100-200' ? (
                          <Flag className={`w-6 h-6 ${isReady ? 'text-white' : 'text-brand-secondary'} fill-current`} />
                        ) : (
                          <Play className={`w-6 h-6 ${isReady ? 'text-white' : 'text-brand-secondary'} fill-current`} />
                        )}
                      </div>
                      <h3 className={`text-lg font-bold uppercase tracking-wider mb-1 transition-colors duration-500 ${isReady ? 'text-brand-secondary' : 'text-zinc-500'}`}>
                        {activeConfig?.id === '100-200' 
                          ? (isReady ? 'PRONTO PARA ACELERAR' : 'ACELERE ATÉ 100KM/H')
                          : (isReady ? 'SINAL VERDE: ARRANQUE!' : 'PARE O VEÍCULO')}
                      </h3>
                      <p className="text-zinc-500 text-[10px] font-medium">
                        {activeConfig?.id === '100-200' 
                          ? `Aguardando atingir ${activeConfig.startSpeed} km/h...` 
                          : (isReady ? 'O cronômetro iniciará ao detectar movimento.' : 'O teste só começa com o carro totalmente parado.')}
                      </p>

                      {!isReady && currentSpeed > 5 && activeConfig?.id !== '100-200' && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-4 p-2 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-[10px] text-red-200 font-bold uppercase text-left">
                            Movimento detectado! Pare totalmente para iniciar.
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {lastResult && (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-panel rounded-2xl p-5 border-brand-accent/30 overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Flag className="w-16 h-16 text-brand-accent" />
                      </div>
                      
                      <h3 className="text-brand-accent font-black uppercase tracking-tighter text-xl italic mb-4">RESULTADO</h3>
                      
                      {vehicle && (
                        <div className="mb-4 p-3 bg-brand-accent/5 border border-brand-accent/20 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-accent/10 rounded-lg flex items-center justify-center overflow-hidden">
                            {vehicle.photoURL ? (
                              <img src={vehicle.photoURL} alt={vehicle.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              vehicle.type === 'car' ? <Car className="w-5 h-5 text-brand-accent" /> : <Navigation className="w-5 h-5 text-brand-accent -rotate-90" />
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Veículo Utilizado</p>
                            <p className="text-sm font-bold text-white leading-none">{vehicle.nickname} <span className="text-zinc-500 font-medium text-[10px] uppercase ml-1">{vehicle.brand} {vehicle.model}</span></p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 text-[9px] uppercase font-bold">Tempo Final</span>
                          <p className="text-3xl font-display font-black text-white italic leading-none">{lastResult.time.toFixed(2)}s</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 text-[9px] uppercase font-bold">Velo. Máxima</span>
                          <p className="text-3xl font-display font-black text-white italic leading-none">{Math.round(lastResult.maxSpeed)} <span className="text-xs">km/h</span></p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 text-[9px] uppercase font-bold">Velo. Média</span>
                          <p className="text-xl font-display font-bold text-zinc-300 italic leading-none">{Math.round(lastResult.avgSpeed)} km/h</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 text-[9px] uppercase font-bold">Distância</span>
                          <p className="text-xl font-display font-bold text-zinc-300 italic leading-none">{Math.round(lastResult.distance)}m</p>
                        </div>
                      </div>

                      <RunMap result={lastResult} />

                      <div className="flex flex-col gap-2 mt-5">
                        <div className="flex gap-2">
                          <button 
                            onClick={reset}
                            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            REPETIR
                          </button>
                          <button 
                            className="px-4 py-3 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-brand-accent/20"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button 
                          onClick={handleDuel}
                          className="w-full py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                        >
                          <Swords className="w-5 h-5" />
                          DUELAR COM AMIGO
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isRunning && !isWaiting && !lastResult && (
                    <motion.div 
                      key="setup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 text-center"
                    >
                      <div className="mb-4 flex flex-col items-center">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center mb-2">
                          <Info className="w-5 h-5 text-brand-primary" />
                        </div>
                        <h4 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest mb-1">Atenção</h4>
                        <p className="text-zinc-500 text-[10px] font-medium">O teste de arrancada só inicia com o veículo parado.</p>
                      </div>

                      <button 
                        onClick={handleStart}
                        className="w-full py-4 bg-brand-primary hover:bg-red-500 rounded-xl font-display font-black text-lg italic tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                      >
                        <Timer className="w-5 h-5" />
                        INICIAR
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </ErrorBoundary>
);
}
