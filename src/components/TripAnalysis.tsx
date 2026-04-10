import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { RunResult } from '../types';
import { motion } from 'motion/react';
import { Activity, Map as MapIcon, TrendingUp, Clock, Navigation, Zap } from 'lucide-react';

interface TripAnalysisProps {
  result: RunResult;
}

export function TripAnalysis({ result }: TripAnalysisProps) {
  const startTime = result.path[0]?.timestamp || 0;
  
  // Prepare data for various charts
  const data = result.path.map((point, index) => {
    const time = (point.timestamp - startTime) / 1000;
    const speed = point.speed * 3.6;
    const altitude = point.altitude || 0;
    
    // Calculate distance from start for this point
    let dist = 0;
    if (index > 0) {
      // This is a simplification, ideally we'd have cumulative distance in the path
      // But for the chart we can use time as X axis or index
    }

    return {
      time: parseFloat((time / 60).toFixed(2)), // time in minutes
      speed: Math.round(speed),
      altitude: Math.round(altitude),
      index
    };
  });

  // Calculate some stats
  const maxSpeed = result.maxSpeed;
  const avgSpeed = result.avgSpeed;
  const totalDistance = result.distance / 1000; // km
  const totalTime = result.time / 60; // minutes

  return (
    <div className="space-y-6 pb-20">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-4 rounded-2xl border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-brand-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vel. Média</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-black italic text-white">{avgSpeed.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">km/h</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vel. Máxima</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-black italic text-white">{maxSpeed.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">km/h</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Distância</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-black italic text-white">{totalDistance.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">km</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-purple-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tempo Total</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-black italic text-white">{totalTime.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">min</span>
          </div>
        </div>
      </div>

      {/* Speed Over Time Chart */}
      <div className="glass-panel p-5 rounded-3xl border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Perfil de Velocidade</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Velocidade (km/h) vs Tempo (min)</p>
          </div>
          <Activity className="w-5 h-5 text-brand-primary opacity-50" />
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                unit="m"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="speed" 
                stroke="#ef4444" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSpeed)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Altitude Chart */}
      <div className="glass-panel p-5 rounded-3xl border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Altimetria</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Altitude (m) vs Tempo (min)</p>
          </div>
          <TrendingUp className="w-5 h-5 text-blue-500 opacity-50" />
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                unit="m"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="altitude" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAlt)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speed Distribution (Bar Chart) */}
      <div className="glass-panel p-5 rounded-3xl border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Distribuição de Velocidade</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Frequência por Faixa de Velocidade</p>
          </div>
          <Activity className="w-5 h-5 text-green-500 opacity-50" />
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(() => {
              const bins = [0, 20, 40, 60, 80, 100, 120, 140, 160];
              const distribution = bins.map((bin, i) => {
                const nextBin = bins[i+1] || 999;
                const count = data.filter(d => d.speed >= bin && d.speed < nextBin).length;
                return {
                  range: `${bin}-${nextBin === 999 ? '+' : nextBin}`,
                  count
                };
              });
              return distribution;
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="range" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                hide
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar 
                dataKey="count" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
                animationDuration={2000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
