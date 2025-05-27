import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, Typography, Box } from '@mui/material';
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
      <Card sx={{ textAlign: 'center' }}>
        <CardContent>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: gradients[gradient],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {change && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: trend === 'up' ? 'success.main' : 'error.main' }}>
              {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {change}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
