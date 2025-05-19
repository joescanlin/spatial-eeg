import numpy as np
from collections import deque
import time
from dataclasses import dataclass
from typing import Optional, List, Tuple, Literal

from src.pt_analytics.features.load import calc_cop

# Constants
SENSOR_ROWS = 12
SENSOR_COLS = 15
PIXEL_SIZE_IN = 4  # Default pixel size in inches

@dataclass
class GaitEvent:
    ts: float  # timestamp 
    type: Literal["heel", "toe"]  # heel-strike or toe-off
    side: Literal["left", "right"]  # left or right foot
    cop_x: float  # CoP x-coordinate
    cop_y: float  # CoP y-coordinate
    dx: float  # stride length in pixels
    frame: np.ndarray  # binary frame at time of event


class GaitDetector:
    def __init__(self, fps=30, stride_px_thresh=3):
        """
        Initialize a gait detector to track and analyze walking patterns.
        
        Args:
            fps (int): Frames per second of the input data
            stride_px_thresh (int): Minimum pixel threshold to detect a step
        """
        self.fps = fps
        self.stride_px_thresh = stride_px_thresh
        self.history = deque(maxlen=fps*3)  # 3 seconds of history
        self.events = []
        self.last_heel_strike = None
        self.last_toe_off = None
        self.pixel_size_in = PIXEL_SIZE_IN
        
    def update(self, frame_bool, ts):
        """
        Update the gait detector with a new frame.
        
        Args:
            frame_bool (np.ndarray): Binary array where True indicates active sensors
            ts (float): Timestamp in seconds
            
        Returns:
            dict: Current gait metrics
        """
        # Calculate center of pressure
        cop_x, cop_y = calc_cop(frame_bool)
        
        # Store frame in history
        self.history.append((ts, cop_x, cop_y, frame_bool))
        
        # Detect steps based on current and historical data
        self._detect_steps()
        
        # Calculate and return latest metrics
        return self._latest_metrics(ts)
    
    def _detect_steps(self):
        """
        Detect heel-strikes and toe-offs from the sensor data.
        
        Uses changes in center of pressure to identify stepping patterns.
        """
        if len(self.history) < 3:
            return
        
        # Get the last few frames for analysis
        history_list = list(self.history)
        current_ts, current_x, current_y, current_frame = history_list[-1]
        prev_ts, prev_x, prev_y, prev_frame = history_list[-2]
        
        # Calculate change in CoP position
        dx = current_x - prev_x
        
        # Detect heel-strike (rising edge)
        if dx >= self.stride_px_thresh and np.sum(current_frame) > np.sum(prev_frame) * 1.2:
            # Determine side (left/right) based on CoP position relative to center
            C = SENSOR_COLS
            side = "left" if current_x < C/2 else "right"
            
            # Calculate stride length from previous heel strike of the same side
            stride_length = 0
            for event in reversed(self.events):
                if event.type == "heel" and event.side == side:
                    stride_length = abs(current_x - event.cop_x)
                    break
            
            # Record the heel-strike event
            event = GaitEvent(
                ts=current_ts,
                type="heel",
                side=side,
                cop_x=current_x,
                cop_y=current_y,
                dx=stride_length,
                frame=current_frame.copy()
            )
            self.events.append(event)
            self.last_heel_strike = event
            
        # Detect toe-off (falling edge)
        elif dx <= -self.stride_px_thresh and np.sum(current_frame) < np.sum(prev_frame) * 0.8:
            # Determine side (left/right) - opposite of last heel strike
            side = "right" if self.last_heel_strike and self.last_heel_strike.side == "left" else "left"
            
            # Record the toe-off event
            event = GaitEvent(
                ts=current_ts,
                type="toe",
                side=side,
                cop_x=current_x,
                cop_y=current_y,
                dx=0,  # Not applicable for toe-off
                frame=current_frame.copy()
            )
            self.events.append(event)
            self.last_toe_off = event
    
    def _latest_metrics(self, now):
        """
        Calculate the latest gait metrics based on detected events.
        
        Args:
            now (float): Current timestamp for calculating the window
            
        Returns:
            dict: Dictionary of gait metrics
        """
        # Filter events within a 15-second window
        win = [e for e in self.events if now - e.ts < 15]
        
        # Calculate cadence (steps per minute)
        heel_strikes = [e for e in win if e.type == "heel"]
        cadence = len(heel_strikes) * 4  # *4 to convert to steps per minute
        
        # Calculate stride length (average of detected strides)
        stride_lengths = [e.dx * self.pixel_size_in * 2 for e in heel_strikes if e.dx > 0]
        stride_len = np.mean(stride_lengths) if stride_lengths else 0
        
        # Calculate cadence variability (coefficient of variation)
        heel_times = [e.ts for e in heel_strikes]
        step_times = np.diff(heel_times) if len(heel_times) > 1 else []
        cadence_cv = np.std(step_times)/np.mean(step_times) if len(step_times) > 2 else 0
        
        # Calculate additional metrics
        double_support = self._double_support_pct()
        symmetry = self._symmetry_idx()
        turning = self._turn_metrics()
        
        return {
            "cadence_spm": cadence,
            "stride_len_in": stride_len,
            "cadence_cv": cadence_cv,
            "symmetry_idx_pct": symmetry,
            "dbl_support_pct": double_support,
            **turning
        }
    
    def _double_support_pct(self):
        """Calculate percentage of time in double support phase (both feet on ground)."""
        if len(self.events) < 4:
            return 0
        
        # Find periods where both feet are on the ground
        total_time = 0
        double_support_time = 0
        
        # Group events by sequence
        gait_cycles = []
        current_cycle = []
        
        for event in sorted(self.events, key=lambda e: e.ts):
            if not current_cycle:
                current_cycle.append(event)
            elif event.type == "heel" and current_cycle[-1].type == "toe":
                current_cycle.append(event)
                if len(current_cycle) >= 4:  # A complete cycle
                    gait_cycles.append(current_cycle)
                    current_cycle = [event]
            else:
                current_cycle.append(event)
        
        # Calculate double support time for each cycle
        for cycle in gait_cycles:
            if len(cycle) < 4:
                continue
                
            cycle_start = cycle[0].ts
            cycle_end = cycle[-1].ts
            cycle_duration = cycle_end - cycle_start
            
            # Find periods of double support in this cycle
            double_support_periods = []
            for i in range(len(cycle) - 1):
                if cycle[i].type == "heel" and cycle[i+1].type == "toe":
                    double_support_periods.append((cycle[i].ts, cycle[i+1].ts))
            
            # Calculate total double support time
            ds_time = sum(end - start for start, end in double_support_periods)
            
            if cycle_duration > 0:
                total_time += cycle_duration
                double_support_time += ds_time
        
        return (double_support_time / total_time * 100) if total_time > 0 else 0
    
    def _symmetry_idx(self):
        """Calculate symmetry index between left and right steps."""
        if len(self.events) < 6:
            return 100  # Perfect symmetry by default
            
        # Get heel strikes for left and right
        left_strikes = [e for e in self.events if e.type == "heel" and e.side == "left"]
        right_strikes = [e for e in self.events if e.type == "heel" and e.side == "right"]
        
        if not left_strikes or not right_strikes:
            return 100
            
        # Calculate average step length for each side
        left_lengths = [e.dx * self.pixel_size_in for e in left_strikes if e.dx > 0]
        right_lengths = [e.dx * self.pixel_size_in for e in right_strikes if e.dx > 0]
        
        left_avg = np.mean(left_lengths) if left_lengths else 0
        right_avg = np.mean(right_lengths) if right_lengths else 0
        
        # Calculate symmetry index (0-100, 100 is perfect symmetry)
        if left_avg == 0 and right_avg == 0:
            return 100
            
        symmetry = 100 * (1 - abs(left_avg - right_avg) / (left_avg + right_avg))
        return symmetry
    
    def _turn_metrics(self):
        """Calculate turning-related metrics."""
        if len(self.events) < 10:
            return {
                "turning_angle_deg": 0,
                "turning_speed_deg_s": 0
            }
            
        # Get recent CoP trajectory
        recent_cops = [(ts, x, y) for ts, x, y, _ in self.history]
        
        if len(recent_cops) < 3:
            return {
                "turning_angle_deg": 0,
                "turning_speed_deg_s": 0
            }
            
        # Calculate path and direction changes
        angles = []
        for i in range(2, len(recent_cops)):
            prev2_ts, prev2_x, prev2_y = recent_cops[i-2]
            prev_ts, prev_x, prev_y = recent_cops[i-1]
            curr_ts, curr_x, curr_y = recent_cops[i]
            
            # Calculate vectors
            v1 = (prev_x - prev2_x, prev_y - prev2_y)
            v2 = (curr_x - prev_x, curr_y - prev_y)
            
            # Skip if either vector is too small (noise or standing)
            if np.linalg.norm(v1) < 0.5 or np.linalg.norm(v2) < 0.5:
                continue
                
            # Calculate angle between vectors
            dot_product = v1[0]*v2[0] + v1[1]*v2[1]
            v1_mag = np.sqrt(v1[0]**2 + v1[1]**2)
            v2_mag = np.sqrt(v2[0]**2 + v2[1]**2)
            
            if v1_mag * v2_mag == 0:
                continue
                
            cos_angle = dot_product / (v1_mag * v2_mag)
            cos_angle = max(-1, min(1, cos_angle))  # Clamp to avoid numerical errors
            
            angle_rad = np.arccos(cos_angle)
            angle_deg = np.degrees(angle_rad)
            
            # Determine direction using cross product
            cross_z = v1[0]*v2[1] - v1[1]*v2[0]
            if cross_z < 0:
                angle_deg = -angle_deg
                
            angles.append((curr_ts, angle_deg))
        
        # Calculate total turning angle and speed
        if not angles:
            return {
                "turning_angle_deg": 0,
                "turning_speed_deg_s": 0
            }
            
        total_angle = sum(abs(angle) for _, angle in angles)
        time_period = angles[-1][0] - angles[0][0] if len(angles) > 1 else 1
        turning_speed = total_angle / time_period if time_period > 0 else 0
        
        return {
            "turning_angle_deg": total_angle,
            "turning_speed_deg_s": turning_speed
        } 