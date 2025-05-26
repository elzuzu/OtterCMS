from __future__ import annotations

import asyncio
import itertools
from dataclasses import dataclass
from typing import List, Dict, Any

import numpy as np
from sklearn.linear_model import LinearRegression  # type: ignore
from statsmodels.tsa.stattools import adfuller  # type: ignore


@dataclass
class Signal:
    action: str
    confidence: float
    details: Dict[str, Any]


class StatisticalArbitrageStrategy:
    def __init__(self) -> None:
        self.pairs: List[Dict[str, Any]] = []
        self.z_score_threshold = 2.0
        self.lookback_period = 500

    async def fetch_historical(self, symbol: str, lookback: int) -> np.ndarray:
        # Placeholder for historical data
        return np.zeros(lookback)

    async def find_cointegrated_pairs(self, symbols: List[str]) -> List[Dict[str, Any]]:
        pairs = []
        for sym1, sym2 in itertools.combinations(symbols, 2):
            prices1 = await self.fetch_historical(sym1, self.lookback_period)
            prices2 = await self.fetch_historical(sym2, self.lookback_period)
            model = LinearRegression()
            model.fit(prices1.reshape(-1, 1), prices2)
            spread = prices2 - model.predict(prices1.reshape(-1, 1))
            adf_result = adfuller(spread)
            if adf_result[1] < 0.05:
                pairs.append({
                    "pair": (sym1, sym2),
                    "hedge_ratio": model.coef_[0],
                    "mean": np.mean(spread),
                    "std": np.std(spread),
                })
        self.pairs = pairs
        return pairs

    def calculate_z_score(self, pair_data: Dict[str, Any], current_prices: Dict[str, float]) -> str:
        price1 = current_prices[pair_data["pair"][0]]
        price2 = current_prices[pair_data["pair"][1]]
        spread = price2 - pair_data["hedge_ratio"] * price1
        z_score = (spread - pair_data["mean"]) / max(pair_data["std"], 1e-8)
        if z_score > self.z_score_threshold:
            return "short_spread"
        if z_score < -self.z_score_threshold:
            return "long_spread"
        if abs(z_score) < 0.5:
            return "close"
        return "hold"


class OrnsteinUhlenbeckModel:
    def __init__(self, mean_reversion_speed: float, long_term_mean: float) -> None:
        self.theta = mean_reversion_speed
        self.mu = long_term_mean
        self.sigma: float | None = None

    def predict_half_life(self) -> float:
        return np.log(2) / self.theta

    def optimal_position_size(self, current_spread: float, capital: float) -> float:
        deviation = current_spread - self.mu
        if not self.sigma:
            return 0.0
        position_size = (deviation / self.sigma) * (capital * 0.1)
        return float(np.clip(position_size, -capital * 0.2, capital * 0.2))
