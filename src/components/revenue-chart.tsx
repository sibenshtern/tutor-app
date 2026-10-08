"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export function RevenueChart({ data }: { data: { label: string; earned: number; received: number }[] }) {
  return (
    <div className="h-72 w-full rounded-lg border bg-white p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} width={80} tickFormatter={rub} />
          <Tooltip formatter={(value) => rub(Number(value))} />
          <Legend />
          <Bar dataKey="earned" name="Заработано" fill="#2563eb" />
          <Bar dataKey="received" name="Получено" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
