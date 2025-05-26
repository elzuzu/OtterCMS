from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any

import numpy as np


@dataclass
class Quote:
    bid_price: float
    ask_price: float
    bid_size: float
    ask_size: float


class SpreadOptimizer:
    def __init__(self) -> None:
        self.current_mid_price = 0.0
        self.avg_volume = 1.0

    def calculate_reservation_price(self, inventory: float, gamma: float, volatility: float) -> float:
        return self.current_mid_price - gamma * volatility ** 2 * inventory

    def calculate_optimal_spread(self, volatility: float, volume: float, inventory: float) -> float:
        gamma = 0.1
        k = 1.5
        reservation_price = self.calculate_reservation_price(inventory, gamma, volatility)
        optimal_spread = gamma * volatility ** 2 + (2 / gamma) * np.log(1 + k)
        volume_factor = np.clip(volume / self.avg_volume, 0.5, 2.0)
        return optimal_spread * volume_factor


class InventoryManager:
    def calculate_skew(self, current_inventory: float, target_inventory: float, max_inventory: float) -> float:
        if max_inventory == 0:
            return 0.0
        return np.clip(current_inventory / max_inventory, -1.0, 1.0)


class RebateCalculator:
    def __init__(self) -> None:
        self.exchange_rebates = {
            "binance": {"maker": -0.0002, "taker": 0.0004},
            "kraken": {"maker": -0.0001, "taker": 0.0003},
        }

    def optimize_venue_selection(self, venues: list[str], order_type: str) -> str:
        if order_type == "maker":
            return min(venues, key=lambda v: self.exchange_rebates[v]["maker"])
        return min(venues, key=lambda v: self.exchange_rebates[v]["taker"])

    def calculate_net_pnl(self, gross_pnl: float, volume: float, venue: str, order_type: str) -> float:
        fee_rate = self.exchange_rebates[venue][order_type]
        return gross_pnl - volume * fee_rate


class LiquidityProvisionOptimizer:
    def __init__(self) -> None:
        self.spread_optimizer = SpreadOptimizer()
        self.inventory_manager = InventoryManager()
        self.rebate_calculator = RebateCalculator()
        self.max_position_size = 0.0

    async def fetch_market_data(self, symbol: str) -> Dict[str, Any]:
        return {"volatility": 0.0, "volume": 0.0, "mid_price": 0.0}

    def calculate_optimal_size(self, inventory_skew: float, side: str) -> float:
        return 1.0

    async def optimize_quotes(self, symbol: str, current_inventory: float) -> Quote:
        market_data = await self.fetch_market_data(symbol)
        optimal_spread = self.spread_optimizer.calculate_optimal_spread(
            volatility=market_data["volatility"],
            volume=market_data["volume"],
            inventory=current_inventory,
        )
        inventory_skew = self.inventory_manager.calculate_skew(
            current_inventory, target_inventory=0.0, max_inventory=self.max_position_size
        )
        mid_price = market_data["mid_price"]
        bid_offset = optimal_spread / 2 * (1 + inventory_skew)
        ask_offset = optimal_spread / 2 * (1 - inventory_skew)
        return Quote(
            bid_price=mid_price - bid_offset,
            ask_price=mid_price + ask_offset,
            bid_size=self.calculate_optimal_size(inventory_skew, "bid"),
            ask_size=self.calculate_optimal_size(inventory_skew, "ask"),
        )
