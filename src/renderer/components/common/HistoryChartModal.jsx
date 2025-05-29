import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import DattaModal from './DattaModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function HistoryChartModal({ label, dataByYear, onClose }) {
  const years = Object.keys(dataByYear).sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]);
  const data = {
    labels: MONTHS,
    datasets: [
      {
        label,
        data: dataByYear[year],
        backgroundColor: 'rgba(var(--theme-color-rgb, 99, 102, 241), 0.6)',
      },
    ],
  };
  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true },
    },
  };
  return (
    <DattaModal open onClose={onClose} title={`Historique : ${label}`}> 
      <div style={{ padding: 'var(--spacing-4)' }}>
        {years.length > 1 && (
          <select
            className="select-stylish"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ marginBottom: 'var(--spacing-4)' }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <Bar data={data} options={options} />
      </div>
    </DattaModal>
  );
}
