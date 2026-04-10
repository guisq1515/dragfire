import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RunResult } from '../types';

import { Lock, Zap } from 'lucide-react';

interface PerformanceChartProps {
  result: RunResult;
  isPremium?: boolean;
}

export function PerformanceChart({ result, isPremium }: PerformanceChartProps) {
  // Prepare data for the chart
  // We want to show Speed vs Time
  const startTime = result.path[0]?.timestamp || 0;
  const data = result.path.map((point, index) => {
    const time = (point.timestamp - startTime) / 1000;
    const speed = point.speed * 3.6;
    
    // Calculate G-force between points
    let g = 0;
    if (index > 0) {
      const prev = result.path[index - 1];
      const dt = (point.timestamp - prev.timestamp) / 1000;
      if (dt > 0) {
        const dv = point.speed - prev.speed;
        g = dv / (dt * 9.81);
      }
    }

    return {
      time: parseFloat(time.toFixed(2)),
      speed: Math.round(speed),
      g: parseFloat(g.toFixed(2)),
    };
  });

  return (
    <div className="w-full h-64 mt-4 bg-zinc-950/50 rounded-xl border border-white/5 p-4 relative overflow-hidden">
      {!isPremium && (
        <div className="absolute inset-0 z-20 backdrop-blur-md bg-zinc-950/40 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-yellow-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Gráficos Premium</h4>
          <p className="text-[10px] text-zinc-400 font-medium leading-tight max-w-[200px]">
            Assine o Premium para visualizar a curva de velocidade e força G detalhada.
          </p>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-yellow-500 rounded-lg text-zinc-950 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Zap className="w-3 h-3" />
            Desbloquear
          </button>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Curva de Performance</span>
          <div className="flex gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-primary" />
              <span className="text-[10px] font-bold text-zinc-300 uppercase">Velocidade (km/h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-zinc-300 uppercase">G-Force (G)</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-zinc-500 block">Duração Total</span>
          <span className="text-sm font-display font-black text-white italic">{result.time.toFixed(2)}s</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide={false} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
            unit="s"
          />
          <YAxis 
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
            domain={[0, 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            labelStyle={{ color: '#71717a', marginBottom: '4px' }}
            labelFormatter={(label) => `Tempo: ${label}s`}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="speed" 
            stroke="#ef4444" 
            strokeWidth={3}
            dot={false}
            animationDuration={1500}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="g" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
