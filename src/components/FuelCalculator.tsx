import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Fuel, 
  Navigation, 
  Calculator, 
  History, 
  Trash2, 
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Lightbulb,
  Car
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Vehicle } from '../types';

interface FuelLog {
  id: string;
  distance: number;
  liters: number;
  consumption: number;
  timestamp: number;
  fuelType?: string;
  pricePerLiter?: number;
  vehicleId?: string;
  vehicleName?: string;
}

export function FuelCalculator({ onBack }: { onBack: () => void }) {
  const [distance, setDistance] = useState('');
  const [liters, setLiters] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina');
  const [price, setPrice] = useState('');
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch vehicles
    const fetchVehicles = async () => {
      const vQuery = query(collection(db, 'vehicles'), where('uid', '==', user.uid));
      const vSnapshot = await getDocs(vQuery);
      const vList = vSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vList);
      
      // Select active vehicle by default
      const active = vList.find(v => v.active);
      if (active) setSelectedVehicleId(active.id || '');
    };

    fetchVehicles();

    const q = query(
      collection(db, 'fuel_logs'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fuelLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FuelLog));
      setLogs(fuelLogs);
    });

    return () => unsubscribe();
  }, []);

  const calculateConsumption = () => {
    const d = parseFloat(distance);
    const l = parseFloat(liters);
    if (d > 0 && l > 0) {
      return (d / l).toFixed(2);
    }
    return '0.00';
  };

  const handleSave = async () => {
    const d = parseFloat(distance);
    const l = parseFloat(liters);
    const p = parseFloat(price);
    const user = auth.currentUser;
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);

    if (d > 0 && l > 0 && user) {
      setIsSaving(true);
      try {
        const consumption = d / l;
        await addDoc(collection(db, 'fuel_logs'), {
          uid: user.uid,
          distance: d,
          liters: l,
          pricePerLiter: p || 0,
          fuelType,
          consumption,
          timestamp: Date.now(),
          vehicleId: selectedVehicleId || null,
          vehicleName: vehicle ? `${vehicle.nickname} (${vehicle.model})` : null
        });
        setDistance('');
        setLiters('');
        setPrice('');
      } catch (error) {
        console.error("Error saving fuel log:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fuel_logs', id));
    } catch (error) {
      console.error("Error deleting fuel log:", error);
    }
  };

  const avgConsumption = logs.length > 0 
    ? (logs.reduce((acc, log) => acc + log.consumption, 0) / logs.length).toFixed(2)
    : '0.00';

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
        <button onClick={onBack} className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">CONSUMO</h2>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-1">Calculadora de Combustível</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {/* Calculator Card */}
        <section className="glass-panel p-6 rounded-3xl border-white/5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Distância (km) - (KM trip rodados no painel)</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="number" 
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white font-bold focus:border-brand-primary outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Litros (L)</label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="number" 
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white font-bold focus:border-brand-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Combustível</label>
              <select 
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold focus:border-brand-primary outline-none transition-all appearance-none"
              >
                <option>Gasolina</option>
                <option>Etanol</option>
                <option>Diesel</option>
                <option>GNV</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Veículo (Opcional)</label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <select 
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white font-bold focus:border-brand-primary outline-none transition-all appearance-none"
                >
                  <option value="">Nenhum</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.nickname || v.model}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Preço/L (Opcional)</label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold focus:border-brand-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-brand-primary/10 rounded-2xl p-4 border border-brand-primary/20 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Resultado</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-black italic text-white">{calculateConsumption()}</span>
                <span className="text-xs font-bold text-zinc-500 uppercase">km/L</span>
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving || !distance || !liters}
              className="bg-brand-primary text-zinc-950 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isSaving ? 'Salvando...' : 'Salvar Log'}
            </button>
          </div>
        </section>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-4 rounded-2xl border-white/5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Média Geral</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-black italic text-white">{avgConsumption}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">km/L</span>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border-white/5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Abastecimentos</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-black italic text-white">{logs.length}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">registros</span>
            </div>
          </div>
        </div>

        {/* Measurement Tip */}
        <section className="bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-brand-primary">
            <Lightbulb className="w-5 h-5" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Dica para Medição Real</h3>
          </div>
          <div className="space-y-3 text-zinc-400 text-[11px] leading-relaxed font-medium">
            <p>Para obter o consumo exato do seu veículo, siga estes passos:</p>
            <ol className="space-y-2 list-decimal list-inside marker:text-brand-primary marker:font-black">
              <li>Espere o tanque esvaziar e vá a um posto de combustível.</li>
              <li><span className="text-white font-bold">Complete o tanque</span> e zere o marcador <span className="text-white font-bold">KM Trip</span> do painel do seu carro.</li>
              <li>Rode normalmente até o tanque esvaziar novamente.</li>
              <li>Volte ao <span className="text-white font-bold">mesmo posto e na mesma bomba</span> e mande completar novamente.</li>
              <li>Pegue a quantidade de <span className="text-white font-bold">litros</span> que deu na bomba e os <span className="text-white font-bold">km rodados</span> no painel e insira aqui no app.</li>
            </ol>
          </div>
        </section>

        {/* History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Histórico de Consumo</h3>
            <History className="w-4 h-4 text-zinc-700" />
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {logs.map((log, index) => {
                const isBetter = index < logs.length - 1 && log.consumption > logs[index + 1].consumption;
                const isWorse = index < logs.length - 1 && log.consumption < logs[index + 1].consumption;

                return (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        log.fuelType === 'Etanol' ? 'bg-green-500/10 text-green-500' : 
                        log.fuelType === 'Diesel' ? 'bg-yellow-500/10 text-yellow-500' : 
                        'bg-brand-primary/10 text-brand-primary'
                      }`}>
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{log.consumption.toFixed(2)} km/L</span>
                          {isBetter && <TrendingUp className="w-3 h-3 text-green-500" />}
                          {isWorse && <TrendingDown className="w-3 h-3 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">
                          {log.distance}km • {log.liters}L • {log.fuelType}
                          {log.vehicleName && ` • ${log.vehicleName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600 font-bold">
                          {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                        </p>
                        {log.pricePerLiter > 0 && (
                          <p className="text-[9px] text-brand-primary font-black uppercase">
                            R$ {(log.pricePerLiter * log.liters).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {logs.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                  <Calculator className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
