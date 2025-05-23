"use client";

import { RadialBarChart, RadialBar } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

export function EfficiencyChart({ value }) {
  const chartData = [
    {
      efficiency: value,
      fill: "#FFFFFF",
    },
  ];
  const chartConfig = {};
  const valueAngle = -(value / 100) * 360;

  return (
    <div style={{ width: 40, height: 40 }}>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square min-h-[40px] w-full"
      >
        <RadialBarChart
          data={chartData}
          startAngle={0}
          endAngle={valueAngle}
          innerRadius="100%"
          outerRadius="150%"
          barSize={10}
          cx="50%"
          cy="50%"
        >
          <RadialBar
            minAngle={15}
            background={false}
            clockWise
            dataKey="efficiency"
            cornerRadius={1}
          />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}
