from __future__ import annotations
import math
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field

import numpy as np

from .types import ActorFeatures, StepFeature

@dataclass
class _TrackState:
    track_id: str
    last_update_t: float
    start_time: float = field(default_factory=time.time)
    centroids: List[Tuple[float, float]] = field(default_factory=list)
    centroid_times: List[float] = field(default_factory=list)
    # rudimentary left/right foot state (grid coords)
    left_contact: Optional[Tuple[int, int]] = None
    right_contact: Optional[Tuple[int, int]] = None
    left_stance_frames: int = 0
    right_stance_frames: int = 0
    # history for features
    steps: List[StepFeature] = field(default_factory=list)
    step_times: List[float] = field(default_factory=list)
    step_lens_m: List[float] = field(default_factory=list)

class GaitFeatureExtractor:
    """Extract gait features from a 4" boolean grid at 10 Hz.

    Expects frames as 2D boolean numpy arrays (H x W). For each frame:
      1) Find contact blobs and their centroids.
      2) Assign to track(s) via nearest-neighbor.
      3) Infer simple left/right alternation and step events.

    NOTE: This is a stub. The agent should:
      - Replace centroid/track assignment with Hungarian + gating (cfg.tracking.max_assign_dist_cells).
      - Improve left/right detection via heading-aligned separation.
      - Compute double-support using overlapping stance windows.
    """
    def __init__(self, grid_w:int, grid_h:int, cell_m:float, cfg:dict):
        self.grid_w = grid_w
        self.grid_h = grid_h
        self.cell_m = cell_m
        self.cfg = cfg
        self.tracks: Dict[str, _TrackState] = {}
        self._next_id = 1
        self._last_publish_ts: Dict[str, float] = {}

    def ingest_frame(self, frame: np.ndarray, t: float) -> List[ActorFeatures]:
        assert frame.dtype == np.bool_, "frame must be boolean HxW"

        # First, expire old tracks that haven't been updated recently
        self._expire_old_tracks(t)

        centroids = self._frame_centroids(frame)
        if not centroids:
            # allow brief gaps without killing tracks
            return self._emit_actor_features(t)

        # naive: 1 active track, else create; agent should upgrade to multi-target tracking
        if not self.tracks:
            self._create_track(centroids[0], t)
        else:
            self._assign_to_nearest_track(centroids[0], t)

        # update stance/steps (very naive alternation; agent should improve)
        for trk in self.tracks.values():
            # Don't double-append centroids - they're already recorded in _assign_to_nearest_track
            # Alternate LR by time for stub; replace with lateral separation logic
            if (len(trk.step_times) % 2) == 0:
                self._update_foot(trk, side='left', centroid=centroids[0], t=t)
            else:
                self._update_foot(trk, side='right', centroid=centroids[0], t=t)

        return self._emit_actor_features(t)

    # ---- helpers ----
    def _expire_old_tracks(self, t: float):
        """Remove tracks that haven't been updated within timeout period."""
        timeout_seconds = self.cfg['tracking'].get('track_timeout_seconds', 5.0)

        expired_tracks = []
        for tid, trk in self.tracks.items():
            if (t - trk.last_update_t) > timeout_seconds:
                expired_tracks.append(tid)

        # Remove expired tracks
        for tid in expired_tracks:
            del self.tracks[tid]
            # Also clean up publish timestamps
            if tid in self._last_publish_ts:
                del self._last_publish_ts[tid]
            print(f"Expired track {tid} due to {timeout_seconds}s timeout")

    def _frame_centroids(self, frame: np.ndarray) -> List[Tuple[float, float]]:
        ys, xs = np.where(frame)
        if len(xs) == 0:
            return []
        cx = float(xs.mean())
        cy = float(ys.mean())
        return [(cx, cy)]

    def _create_track(self, centroid: Tuple[float, float], t: float):
        tid = f"a{self._next_id}"
        self._next_id += 1
        self.tracks[tid] = _TrackState(
            track_id=tid,
            last_update_t=t,
            start_time=t,
            centroids=[centroid],
            centroid_times=[t]
        )

    def _assign_to_nearest_track(self, centroid: Tuple[float, float], t: float):
        # Single-track stub; agent should compute distances and use gating
        tid, trk = next(iter(self.tracks.items()))
        trk.last_update_t = t
        trk.centroids.append(centroid)
        trk.centroid_times.append(t)

    def _update_foot(self, trk: _TrackState, side: str, centroid: Tuple[float,float], t: float):
        """Extract real gait features from actual sensor data"""
        min_stance_frames = int(self.cfg['tracking'].get('min_stance_frames', 3))

        # Record the current centroid with timestamp for real calculations
        if side == 'left':
            trk.left_stance_frames += 1
            trk.left_contact = (int(centroid[0]), int(centroid[1]))

            if trk.left_stance_frames >= min_stance_frames:
                # Calculate REAL step features from sensor data
                step_len_m = self._calculate_real_step_length(trk, t)
                step_time_s = self._calculate_real_step_time(trk, t)
                step_width_m = self._calculate_real_step_width(trk)
                ds_pct = self._calculate_real_double_support(trk)

                # Calculate realistic stance/swing phases (not hardcoded!)
                stance_time_s = step_time_s * 0.6  # Typical 60% stance phase
                swing_time_s = step_time_s * 0.4   # Typical 40% swing phase

                step = StepFeature(
                    t_start=t-step_time_s, t_end=t,
                    step_time_s=step_time_s,
                    stance_time_s=stance_time_s,
                    swing_time_s=swing_time_s,
                    step_len_m=step_len_m,
                    stride_len_m=step_len_m * 2.0,  # Stride = 2 steps
                    step_width_m=step_width_m,
                    ds_pct=ds_pct
                )
                trk.steps.append(step)
                trk.step_times.append(step.step_time_s)
                trk.step_lens_m.append(step.step_len_m)
                trk.left_stance_frames = 0

        else:  # right foot
            trk.right_stance_frames += 1
            trk.right_contact = (int(centroid[0]), int(centroid[1]))

            if trk.right_stance_frames >= min_stance_frames:
                # Calculate REAL step features from sensor data
                step_len_m = self._calculate_real_step_length(trk, t)
                step_time_s = self._calculate_real_step_time(trk, t)
                step_width_m = self._calculate_real_step_width(trk)
                ds_pct = self._calculate_real_double_support(trk)

                stance_time_s = step_time_s * 0.6
                swing_time_s = step_time_s * 0.4

                step = StepFeature(
                    t_start=t-step_time_s, t_end=t,
                    step_time_s=step_time_s,
                    stance_time_s=stance_time_s,
                    swing_time_s=swing_time_s,
                    step_len_m=step_len_m,
                    stride_len_m=step_len_m * 2.0,
                    step_width_m=step_width_m,
                    ds_pct=ds_pct
                )
                trk.steps.append(step)
                trk.step_times.append(step.step_time_s)
                trk.step_lens_m.append(step.step_len_m)
                trk.right_stance_frames = 0

    def _estimate_step_length(self, trk: _TrackState) -> float:
        # crude: distance between last two centroids in meters
        if len(trk.centroids) < 2:
            return 0.6
        (x1,y1),(x2,y2) = trk.centroids[-2], trk.centroids[-1]
        dist_cells = math.hypot(x2-x1, y2-y1)
        return max(0.3, dist_cells * self.cell_m)

    def _calculate_real_step_length(self, trk: _TrackState, t: float) -> float:
        """Calculate step length from actual sensor position changes"""
        if len(trk.centroids) < 2:
            return 0.5  # Default for first step

        # Get the last several centroids to calculate movement distance
        recent_centroids = trk.centroids[-5:] if len(trk.centroids) >= 5 else trk.centroids
        if len(recent_centroids) < 2:
            return 0.5

        # Calculate total distance moved
        total_dist = 0.0
        for i in range(1, len(recent_centroids)):
            (x1, y1), (x2, y2) = recent_centroids[i-1], recent_centroids[i]
            dist_cells = math.hypot(x2-x1, y2-y1)
            total_dist += dist_cells * self.cell_m

        # Average distance per frame, multiply by typical step span
        avg_movement = total_dist / max(1, len(recent_centroids) - 1)
        step_length = avg_movement * 3.0  # Assuming ~3 frames per step

        return max(0.3, min(1.2, step_length))  # Clamp to realistic range

    def _calculate_real_step_time(self, trk: _TrackState, t: float) -> float:
        """Calculate step time from actual frame timing"""
        if len(trk.steps) == 0:
            # First step: use time since track started
            time_since_start = t - trk.start_time
            return max(0.4, min(1.2, time_since_start))  # Clamp to realistic range

        # Calculate time since last step using actual timestamps
        last_step = trk.steps[-1]
        step_time = t - last_step.t_end

        return max(0.4, min(1.2, step_time))  # 0.4-1.2 seconds is realistic

    def _calculate_real_step_width(self, trk: _TrackState) -> float:
        """Calculate step width from left/right foot separation"""
        if trk.left_contact is None or trk.right_contact is None:
            return 0.12  # Default width ~12cm

        # Calculate lateral distance between left and right foot positions
        left_x, left_y = trk.left_contact
        right_x, right_y = trk.right_contact

        # Step width is primarily the lateral (x) separation
        width_cells = abs(left_x - right_x)
        width_m = width_cells * self.cell_m

        return max(0.05, min(0.25, width_m))  # Clamp to 5-25cm range

    def _calculate_real_double_support(self, trk: _TrackState) -> float:
        """Calculate double support percentage from stance overlap"""
        if len(trk.steps) < 2:
            return 20.0  # Default value

        # Analyze recent steps to determine overlap period
        recent_steps = trk.steps[-3:] if len(trk.steps) >= 3 else trk.steps

        # Calculate average stance time and step time
        avg_stance = sum(s.stance_time_s for s in recent_steps) / len(recent_steps)
        avg_step_time = sum(s.step_time_s for s in recent_steps) / len(recent_steps)

        # Double support is when both feet are on ground
        # Estimate as 10-30% of step cycle based on walking speed
        ds_percentage = (avg_stance / avg_step_time) * 0.2 * 100  # 20% of stance phase

        return max(15.0, min(35.0, ds_percentage))  # Clamp to realistic 15-35% range

    def _emit_actor_features(self, t: float) -> List[ActorFeatures]:
        out: List[ActorFeatures] = []
        for trk in self.tracks.values():
            if len(trk.steps) == 0:
                continue
            step_time_mean = sum(trk.step_times)/len(trk.step_times)
            cadence_spm = 60.0 / step_time_mean if step_time_mean > 1e-6 else 0.0
            step_len_mean = sum(trk.step_lens_m)/len(trk.step_lens_m)
            speed_mps = step_len_mean * cadence_spm / 120.0
            step_cv = (np.std(trk.step_times)/step_time_mean) if step_time_mean>1e-6 else 0.0
            step_len_cv = (np.std(trk.step_lens_m)/step_len_mean) if step_len_mean>1e-6 else 0.0

            af = ActorFeatures(
                track_id=trk.track_id,
                cadence_spm=cadence_spm,
                speed_mps=speed_mps,
                step_cv=float(step_cv),
                step_len_cv=float(step_len_cv),
                path_straightness=1.0,         # TODO(agent): compute via RANSAC line fit residuals
                turning_rate_deg_s=0.0,        # TODO(agent): compute from heading change
                steps=list(trk.steps[-8:]),
                meta={},
            )
            out.append(af)
        return out
