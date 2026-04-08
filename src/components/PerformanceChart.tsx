import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RunResult } from '../types';

interface PerformanceChartProps {
  result: RunResult;
}

export function PerformanceChart({ result }: PerformanceChartProps) {
  // Prepare data for the chart
  // We want to show Speed vs Time
  const startTime = result.path[0]?.timestamp || 0;
  const data = result.path.map((point, index) => {
    const time = (point.timestamp - startTime) / 1000;
    const speed = point.speed * 3.6;
    return {
      time: parseFloat(time.toFixed(2)),
      speed: Math.round(speed),
    };
  });

  return (
    <div className="w-full h-48 mt-4 bg-zinc-950/50 rounded-xl border border-white/5 p-2">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Curva de Aceleração</span>
        <span className="text-[10px] font-bold text-brand-primary italic">km/h vs s</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#ef4444' }}
            labelStyle={{ color: '#71717a' }}
            labelFormatter={(label) => `${label}s`}
          />
          <Area 
            type="monotone" 
            dataKey="speed" 
            stroke="#ef4444" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorSpeed)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
