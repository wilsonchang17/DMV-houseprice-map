// src/StationPopupChart.js
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { supabase } from './supabaseClient';


export default function StationPopupChart({ zip }) {
  const [priceData, setPriceData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("Locations_Prices")
        .select("date, value")
        .eq("region_name", zip)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching price data:", error);
        return;
      }

      const formatted = data.map((d) => ({
        date: d.date.slice(0, 7),
        value: Number(d.value),
      }));

      setPriceData(formatted);
    };

    fetchData();
  }, [zip]);

  if (!priceData.length) {
    return <div>Loading chart...</div>;
  }

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={priceData}>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
          formatter={(value) =>
            [`Price: $${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
          }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#618390"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

