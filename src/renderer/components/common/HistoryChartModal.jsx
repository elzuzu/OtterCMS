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
import { XCircle } from 'lucide-react';

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
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 style={{ flex: 1 }}>Historique : {label}</h2>
          <button onClick={onClose} className="close-button" aria-label="Fermer">
            <XCircle size={24} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {years.length > 1 && (
            <select className="select-stylish" value={year} onChange={(e) => setYear(e.target.value)} style={{ marginBottom: '15px' }}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
