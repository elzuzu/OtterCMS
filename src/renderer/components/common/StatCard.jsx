import React from 'react';
import { motion } from 'framer-motion';
import DattaCard from './DattaCard';
import { TrendUpIcon, TrendDownIcon } from './Icons';

export default function StatCard({ icon, title, value, change, trend = 'up', gradient = 'blue' }) {
  const gradients = {
    blue: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    green: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    purple: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    orange: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  };

  return (
    <motion.div className="stat-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <DattaCard className="text-center">
        <div className="card-body">
          <div
            className="mx-auto mb-2 d-flex align-items-center justify-content-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: gradients[gradient],
            }}
          >
            {icon}
          </div>
          <h5 className="mb-0">{value}</h5>
          <p className="text-muted mb-2">{title}</p>
          {change && (
            <div
              className={`d-flex justify-content-center align-items-center ${trend === 'up' ? 'text-success' : 'text-danger'}`}
            >
              {trend === 'up' ? <TrendUpIcon /> : <TrendDownIcon />}
              <span className="ms-1">{change}</span>
            </div>
          )}
        </div>
      </DattaCard>
    </motion.div>
  );
}
