from __future__ import annotations

import json
import math
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Dict, Deque, List, Optional


@dataclass
class AgentSignal:
    agent_id: str
    signal_type: str  # 'buy', 'sell', 'hold', 'risk_up', 'risk_down'
    confidence: float  # 0-1
    reasoning: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Decision:
    action: str
    confidence: float
    reasoning: str
    size: float = 1.0
    agents: List[str] = field(default_factory=list)
    dissenters: List[str] = field(default_factory=list)


@dataclass
class CoordinatorMetrics:
    consensus_rate: float = 0.0
    conflict_rate: float = 0.0
    decision_accuracy: float = 0.0
    avg_decision_time: float = 0.0
    agent_reliability: Dict[str, float] = field(default_factory=dict)


CONFLICT_RESOLUTION_PROMPT = """
Conflits d\u00e9tect\u00e9s entre agents de trading:

Signaux en conflit:
{signals_json}

Contexte march\u00e9:
- Volatilit\u00e9: {volatility}
- Trend: {trend}
- Volume: {volume}
- Positions ouvertes: {positions}

Performance r\u00e9cente des agents:
{agent_performance}

Choisis la meilleure action avec justification.
Format: {{"action": "...", "confidence": 0.X, "reasoning": "..."}}
"""


class MetaCoordinatorAgent:
    def __init__(self, message_bus: Optional[Any] = None, llm_client: Optional[Any] = None,
                 min_consensus: Optional[float] = None) -> None:
        self.message_bus = message_bus
        self.llm_client = llm_client

        self.consensus_threshold = float(
            min_consensus if min_consensus is not None else os.getenv("CONSENSUS_THRESHOLD", "0.65")
        )
        self.agent_score_decay = float(os.getenv("AGENT_SCORE_DECAY", "0.95"))
        self.conflict_timeout = int(os.getenv("CONFLICT_RESOLUTION_TIMEOUT_MS", "500"))
        self.min_agents_for_decision = int(os.getenv("MIN_AGENTS_FOR_DECISION", "3"))
        self.decision_confidence_min = float(os.getenv("DECISION_CONFIDENCE_MIN", "0.7"))

        self.agent_scores: Dict[str, float] = defaultdict(lambda: 1.0)
        self.pending_signals: Deque[AgentSignal] = deque(maxlen=100)

        self.metrics = CoordinatorMetrics()

    # ------------------------------------------------------------------
    def _time_decay(self, signal: AgentSignal) -> float:
        ts = signal.metadata.get("timestamp")
        if ts is None:
            return 1.0
        age = max(0.0, time.time() - ts)
        # 30 minutes half-life approximation
        return math.exp(-age / 1800)

    # ------------------------------------------------------------------
    def add_signal(self, signal: AgentSignal) -> None:
        self.pending_signals.append(signal)

    # ------------------------------------------------------------------
    def calculate_weighted_consensus(self, signals: List[AgentSignal]):
        weights_by_type: Dict[str, float] = defaultdict(float)
        contributing: Dict[str, List[str]] = defaultdict(list)
        total_weight = 0.0

        for sig in signals:
            decay = self._time_decay(sig)
            w = sig.confidence * self.agent_scores[sig.agent_id] * decay
            weights_by_type[sig.signal_type] += w
            total_weight += w
            contributing[sig.signal_type].append(sig.agent_id)

        if not weights_by_type:
            return None

        best_signal = max(weights_by_type.keys(), key=lambda k: weights_by_type[k])
        best_weight = weights_by_type[best_signal]
        ratio = best_weight / total_weight if total_weight else 0.0

        return {
            "signal_type": best_signal,
            "ratio": ratio,
            "contributing_agents": contributing.get(best_signal, []),
            "weights": weights_by_type,
        }

    # ------------------------------------------------------------------
    def _build_conflict_prompt(self, signals: List[AgentSignal]) -> str:
        signals_json = json.dumps([sig.__dict__ for sig in signals], ensure_ascii=False)
        return CONFLICT_RESOLUTION_PROMPT.format(
            signals_json=signals_json,
            volatility="N/A",
            trend="N/A",
            volume="N/A",
            positions="N/A",
            agent_performance=json.dumps(self.agent_scores)
        )

    # ------------------------------------------------------------------
    def _resolve_conflict(self, signals: List[AgentSignal]) -> Decision:
        if not self.llm_client:
            return Decision(
                action="hold",
                confidence=0.0,
                reasoning="No LLM client configured for conflict resolution",
                agents=[s.agent_id for s in signals]
            )
        prompt = self._build_conflict_prompt(signals)
        try:
            response = self.llm_client.generate(prompt, timeout=self.conflict_timeout)
            data = json.loads(response)
            return Decision(
                action=data.get("action", "hold"),
                confidence=data.get("confidence", 0.0),
                reasoning=data.get("reasoning", ""),
                agents=[s.agent_id for s in signals]
            )
        except Exception as exc:
            return Decision(
                action="hold",
                confidence=0.0,
                reasoning=f"Conflict resolution failed: {exc}",
                agents=[s.agent_id for s in signals]
            )

    # ------------------------------------------------------------------
    def calculate_accuracy(self, prediction: AgentSignal, outcome: str) -> float:
        return 1.0 if prediction.signal_type == outcome else 0.0

    def sharpe_ratio(self, agent_id: str) -> float:
        return 0.0

    def update_agent_score(self, agent_id: str, prediction: AgentSignal, outcome: str) -> None:
        accuracy = self.calculate_accuracy(prediction, outcome)
        risk_adjusted = accuracy * (1 + self.sharpe_ratio(agent_id))
        prev = self.agent_scores[agent_id]
        self.agent_scores[agent_id] = (
            self.agent_score_decay * prev + (1 - self.agent_score_decay) * risk_adjusted
        )

    # ------------------------------------------------------------------
    async def publish_decision(self, decision: Decision) -> None:
        if not self.message_bus:
            return
        payload = {
            "action": decision.action,
            "size": decision.size,
            "confidence": decision.confidence,
            "contributing_agents": decision.agents,
            "dissenting_agents": decision.dissenters,
        }
        await self.message_bus.publish({"topic": "final_decision", "payload": payload})

    # ------------------------------------------------------------------
    async def process_signals(self, signals: List[AgentSignal]) -> Decision:
        start = time.time()
        consensus = self.calculate_weighted_consensus(signals)
        if not consensus:
            dec = Decision(action="hold", confidence=0.0, reasoning="No signals provided")
        elif consensus["ratio"] >= self.consensus_threshold and len(signals) >= self.min_agents_for_decision:
            dec = Decision(
                action=consensus["signal_type"],
                confidence=consensus["ratio"],
                reasoning="Consensus reached",
                agents=consensus["contributing_agents"],
                dissenters=[s.agent_id for s in signals if s.agent_id not in consensus["contributing_agents"]]
            )
            self.metrics.consensus_rate += 1
        else:
            dec = self._resolve_conflict(signals)
            self.metrics.conflict_rate += 1

        elapsed = time.time() - start
        # simple moving average for latency
        self.metrics.avg_decision_time = (
            self.metrics.avg_decision_time * 0.9 + elapsed * 0.1
        )

        await self.publish_decision(dec)
        return dec
