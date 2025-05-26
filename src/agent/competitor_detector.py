from __future__ import annotations

import hashlib
from typing import Dict, List, Any, Optional

import numpy as np


class CompetitorDetectorAgent:
    def __init__(self) -> None:
        self.suspicious_patterns = {
            "front_running": self.detect_front_running,
            "spoofing": self.detect_spoofing,
            "layering": self.detect_layering,
            "quote_stuffing": self.detect_quote_stuffing,
        }

    async def detect_front_running(self, my_order: Any, market_data: List[Any]) -> Optional[Dict[str, Any]]:
        time_window = 100
        for trade in market_data:
            if (
                my_order.timestamp - trade.timestamp < time_window
                and trade.direction == my_order.direction
                and getattr(trade, "price", 0) < my_order.price
            ):
                return {
                    "detected": True,
                    "competitor_id": self.fingerprint_trader([trade]),
                    "strategy": "Augmenter la randomisation du timing",
                }
        return None

    async def detect_spoofing(self, *args: Any, **kwargs: Any) -> Optional[Dict[str, Any]]:
        return None

    async def detect_layering(self, *args: Any, **kwargs: Any) -> Optional[Dict[str, Any]]:
        return None

    async def detect_quote_stuffing(self, *args: Any, **kwargs: Any) -> Optional[Dict[str, Any]]:
        return None

    def fingerprint_trader(self, trades: List[Any]) -> str:
        features = {
            "avg_size": np.mean([getattr(t, "size", 0) for t in trades]),
            "timing_pattern": [getattr(t, "timestamp", 0) for t in trades],
            "price_levels": [getattr(t, "price", 0) for t in trades],
        }
        return hashlib.md5(str(features).encode()).hexdigest()


EVASION_STRATEGIES = {
    "randomize_timing": {
        "description": "Ajouter du bruit gaussien aux timings",
        "params": {"std_dev_ms": 50},
    },
    "size_variation": {
        "description": "Varier les tailles d'ordre de ±20%",
        "params": {"variation_pct": 0.2},
    },
    "venue_rotation": {
        "description": "Alterner entre exchanges aléatoirement",
        "params": {"min_venues": 3},
    },
}
