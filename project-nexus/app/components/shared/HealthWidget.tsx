import { DailyHealthData } from '@/types/health-data';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface HealthWidgetProps {
  healthData: DailyHealthData[];
}

// Recharts Tooltip 参数类型
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: DailyHealthData;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-effect p-2 rounded-lg text-xs">
        <p className="label text-white/80">{`${label} : ${payload[0].value} 步`}</p>
      </div>
    );
  }
  return null;
};

const HealthWidget: React.FC<HealthWidgetProps> = ({ healthData }) => {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={healthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          />
          <YAxis
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}
          />
          <Bar dataKey="steps" name="步数">
            {healthData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`rgba(136, 132, 216, ${0.4 + (entry.steps / 15000) * 0.6})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthWidget;


