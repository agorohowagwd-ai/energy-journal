import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
  } from "recharts"
  
  export default function EnergyChart({
    weeklyData,
  }) {
    return (
      <div className="border rounded-2xl p-6 h-[320px]">
  
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyData}>
  
            <defs>
              <linearGradient
                id="energy"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#2563eb"
                  stopOpacity={0.35}
                />
  
                <stop
                  offset="95%"
                  stopColor="#2563eb"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
  
            <XAxis dataKey="day" />
  
            <YAxis domain={[0, 10]} />
  
            <Tooltip />
  
            <Area
              type="monotone"
              dataKey="energy"
              stroke="#2563eb"
              fill="url(#energy)"
            />
  
          </AreaChart>
        </ResponsiveContainer>
  
      </div>
    )
  }