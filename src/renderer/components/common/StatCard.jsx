import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon, title, value, change, trend = 'up', gradient = 'blue' }) {
  const gradients = {
    blue: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    green: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    purple: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    orange: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  };

  return (
    <motion.div className="stat-card" whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <div className="stat-icon" style={{ background: gradients[gradient] }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-label">{title}</p>
        {change && (
          <div className={`stat-trend trend-${trend}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
