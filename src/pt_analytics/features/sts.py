import numpy as np
from enum import Enum
from collections import deque
from dataclasses import dataclass
from typing import Tuple, Optional, List

from src.utils.config import config
from src.pt_analytics.features.load import calc_cop

class STSState(Enum):
    """Enumeration of the states in a sit-to-stand transition."""
    SITTING = 0      # Fully seated
    LIFTING = 1      # Beginning to rise
    STANDING = 2     # Fully standing
    RETURNING = 3    # Beginning to sit down
    UNKNOWN = 4      # Initial or indeterminate state

@dataclass
class STSEvent:
    """Represents a sit-to-stand or stand-to-sit transition event."""
    timestamp: float
    event_type: str  # "sit_to_stand" or "stand_to_sit"
    duration: float  # seconds
    max_pressure: float  # maximum pressure during transition
    peak_velocity: float  # peak CoP velocity during transition
    frame: np.ndarray  # snapshot of the frame at the event

class STSDetector:
    """Detector for sit-to-stand and stand-to-sit transitions."""
    
    def __init__(self, fps=30, history_sec=5):
        """
        Initialize the sit-to-stand detector.
        
        Args:
            fps (int): Frames per second of the input data
            history_sec (float): Seconds of history to maintain
        """
        self.fps = fps
        self.history = deque(maxlen=int(fps * history_sec))
        self.state = STSState.UNKNOWN
        self.state_start_time = 0
        self.transition_metrics = {
            "max_pressure": 0,
            "peak_velocity": 0,
        }
        self.events = []
        self.prev_cop = None
        self.prev_time = None
        
    def update(self, frame_bool, timestamp, chair_zone=(slice(8, 12), slice(5, 10))):
        """
        Update the detector with a new frame.
        
        Args:
            frame_bool (np.ndarray): Binary array where True indicates active sensors
            timestamp (float): Current timestamp in seconds
            chair_zone (tuple): Tuple of slice objects defining the chair zone
            
        Returns:
            Optional[STSEvent]: An STSEvent if a transition was detected, None otherwise
        """
        # Store frame in history
        self.history.append((timestamp, frame_bool.copy()))
        
        # Check activity in chair zone
        zone_activity = np.sum(frame_bool[chair_zone])
        total_activity = np.sum(frame_bool)
        
        # Calculate CoP for velocity tracking
        cop_x, cop_y = calc_cop(frame_bool)
        
        # Calculate CoP velocity if we have previous data
        cop_velocity = 0
        if self.prev_cop is not None and self.prev_time is not None:
            time_delta = timestamp - self.prev_time
            if time_delta > 0:
                dx = cop_x - self.prev_cop[0]
                dy = cop_y - self.prev_cop[1]
                distance = np.sqrt(dx**2 + dy**2)
                cop_velocity = distance / time_delta
                
                # Update peak velocity if this is higher
                if cop_velocity > self.transition_metrics["peak_velocity"]:
                    self.transition_metrics["peak_velocity"] = cop_velocity
        
        # Update previous values
        self.prev_cop = (cop_x, cop_y)
        self.prev_time = timestamp
        
        # Update max pressure if current is higher
        if total_activity > self.transition_metrics["max_pressure"]:
            self.transition_metrics["max_pressure"] = total_activity
            
        # State machine for detecting transitions
        event = None
        
        if self.state == STSState.UNKNOWN:
            # Initialize state based on current frame
            if zone_activity > total_activity * 0.7:  # 70% of activity in chair zone
                self.state = STSState.SITTING
            elif total_activity > 0:
                self.state = STSState.STANDING
            self.state_start_time = timestamp
            self.transition_metrics = {"max_pressure": total_activity, "peak_velocity": cop_velocity}
            
        elif self.state == STSState.SITTING:
            # Check for transition to LIFTING
            if zone_activity < total_activity * 0.5 and total_activity > 0:
                self.state = STSState.LIFTING
                self.state_start_time = timestamp
                self.transition_metrics = {"max_pressure": total_activity, "peak_velocity": cop_velocity}
                
        elif self.state == STSState.LIFTING:
            # Check for transition to STANDING
            if zone_activity < total_activity * 0.1 and total_activity > 0:
                self.state = STSState.STANDING
                duration = timestamp - self.state_start_time
                
                # Create sit-to-stand event
                event = STSEvent(
                    timestamp=timestamp,
                    event_type="sit_to_stand",
                    duration=duration,
                    max_pressure=self.transition_metrics["max_pressure"],
                    peak_velocity=self.transition_metrics["peak_velocity"],
                    frame=frame_bool.copy()
                )
                self.events.append(event)
                self.state_start_time = timestamp
                self.transition_metrics = {"max_pressure": total_activity, "peak_velocity": cop_velocity}
                
        elif self.state == STSState.STANDING:
            # Check for transition to RETURNING
            if zone_activity > total_activity * 0.3 and total_activity > 0:
                self.state = STSState.RETURNING
                self.state_start_time = timestamp
                self.transition_metrics = {"max_pressure": total_activity, "peak_velocity": cop_velocity}
                
        elif self.state == STSState.RETURNING:
            # Check for transition to SITTING
            if zone_activity > total_activity * 0.7 and total_activity > 0:
                self.state = STSState.SITTING
                duration = timestamp - self.state_start_time
                
                # Create stand-to-sit event
                event = STSEvent(
                    timestamp=timestamp,
                    event_type="stand_to_sit",
                    duration=duration,
                    max_pressure=self.transition_metrics["max_pressure"],
                    peak_velocity=self.transition_metrics["peak_velocity"],
                    frame=frame_bool.copy()
                )
                self.events.append(event)
                self.state_start_time = timestamp
                self.transition_metrics = {"max_pressure": total_activity, "peak_velocity": cop_velocity}
        
        return event
    
    def get_metrics(self, window_sec=60):
        """
        Get metrics for sit-to-stand performance over a time window.
        
        Args:
            window_sec (float): Time window in seconds to analyze
            
        Returns:
            dict: Dictionary of STS metrics
        """
        if not self.events or not self.history:
            return {
                "sts_count": 0,
                "avg_duration_s": 0,
                "avg_velocity": 0,
                "symmetry_score": 100
            }
        
        # Get current timestamp
        current_time = self.history[-1][0]
        
        # Filter events in the time window
        recent_events = [
            e for e in self.events 
            if e.timestamp >= current_time - window_sec
        ]
        
        # Filter sit-to-stand events
        sts_events = [e for e in recent_events if e.event_type == "sit_to_stand"]
        
        # Count
        sts_count = len(sts_events)
        
        if sts_count == 0:
            return {
                "sts_count": 0,
                "avg_duration_s": 0,
                "avg_velocity": 0,
                "symmetry_score": 100
            }
        
        # Calculate metrics
        durations = [e.duration for e in sts_events]
        avg_duration = sum(durations) / len(durations)
        
        velocities = [1.0 / e.duration for e in sts_events]  # Simplified velocity metric
        avg_velocity = sum(velocities) / len(velocities)
        
        # Calculate CoP symmetry (lateral deviation) during transitions
        symmetry_values = []
        for event in sts_events:
            cop_x, cop_y = calc_cop(event.frame)
            cols = event.frame.shape[1]
            center_x = cols / 2
            # Normalize deviation to 0-100 scale where 100 is perfect symmetry
            deviation = abs(cop_x - center_x) / center_x
            symmetry = 100 * (1 - min(deviation, 1.0))
            symmetry_values.append(symmetry)
            
        symmetry_score = sum(symmetry_values) / len(symmetry_values) if symmetry_values else 100
        
        return {
            "sts_count": sts_count,
            "avg_duration_s": avg_duration,
            "avg_velocity": avg_velocity,
            "symmetry_score": symmetry_score
        }

def detect_sts(frame_bool, chair_zone=(slice(8, 12), slice(5, 10))):
    """
    Simple function to detect if a sit-to-stand transition is occurring.
    
    Args:
        frame_bool (np.ndarray): Binary array where True indicates active sensors
        chair_zone (tuple): Tuple of slice objects defining the chair zone
        
    Returns:
        bool: True if a sit-to-stand transition is likely occurring
    """
    # Calculate activity inside and outside chair zone
    zone_activity = np.sum(frame_bool[chair_zone])
    total_activity = np.sum(frame_bool)
    outside_activity = total_activity - zone_activity
    
    # No activity case
    if total_activity == 0:
        return False
    
    # Check bilateral activity pattern
    # - Some activity in chair zone (but not all)
    # - Some activity outside chair zone
    # - Not too concentrated in either region
    zone_percentage = zone_activity / total_activity if total_activity > 0 else 0
    
    # This pattern suggests a transition: some weight still in chair, some weight shifted forward
    return (0.2 < zone_percentage < 0.7 and 
            outside_activity > 0 and 
            total_activity > 5)  # Minimum activity threshold 