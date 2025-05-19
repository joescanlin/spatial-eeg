import numpy as np
from collections import deque
from scipy.spatial import ConvexHull

# Constants
IN_TO_CM = 2.54  # conversion from inches to centimeters
PIXEL_SIZE_IN = 4  # default pixel size in inches

class BalanceTracker:
    """
    Tracks balance and sway metrics based on Center of Pressure (CoP) movements.
    
    This class analyzes the path and velocity of CoP movement to quantify
    balance performance metrics including sway path length, velocity, and area.
    """
    
    def __init__(self, window_sec=5, fps=30):
        """
        Initialize the balance tracker.
        
        Args:
            window_sec (float): Time window in seconds to analyze
            fps (int): Frames per second of the input data
        """
        self.fps = fps
        self.window_size = int(window_sec * fps)
        self.window = deque(maxlen=self.window_size)
        self.pixel_size_in = PIXEL_SIZE_IN
        
    def update(self, cop_x, cop_y, ts):
        """
        Update the balance tracker with a new CoP position.
        
        Args:
            cop_x (float): x-coordinate of Center of Pressure
            cop_y (float): y-coordinate of Center of Pressure
            ts (float): Timestamp in seconds
        """
        # Scale CoP coordinates by pixel size to get inches
        scaled_x = cop_x * self.pixel_size_in
        scaled_y = cop_y * self.pixel_size_in
        
        # Add to window
        self.window.append((scaled_x, scaled_y, ts))
    
    def compute(self):
        """
        Compute balance and sway metrics from the collected CoP data.
        
        Returns:
            dict: Dictionary containing sway metrics:
                - sway_path_cm: Total path length of CoP movement in cm
                - sway_vel_cm_s: Velocity of CoP movement in cm/s
                - sway_area_cm2: Area of the convex hull of CoP positions in cm²
        """
        # Need at least 2 points for path length and velocity
        if len(self.window) < 2:
            return {
                "sway_path_cm": 0,
                "sway_vel_cm_s": 0,
                "sway_area_cm2": 0
            }
        
        # Extract CoP positions and timestamps
        positions = np.array([(x, y) for x, y, _ in self.window])
        timestamps = np.array([ts for _, _, ts in self.window])
        
        # Calculate path length (sum of distances between consecutive points)
        path = np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)) * IN_TO_CM
        
        # Calculate time span
        time_span = timestamps[-1] - timestamps[0]
        
        # Calculate velocity (path length / time)
        vel = path / time_span if time_span > 0 else 0
        
        # Calculate area of convex hull (requires at least 3 points)
        area = 0
        if len(positions) > 3:
            try:
                hull = ConvexHull(positions)
                area = hull.volume * IN_TO_CM**2  # ConvexHull.volume is actually the area in 2D
            except Exception as e:
                # Handle case where points might be collinear
                pass
                
        return {
            "sway_path_cm": path,
            "sway_vel_cm_s": vel,
            "sway_area_cm2": area
        }
    
    def reset(self):
        """Clear all collected data to start fresh."""
        self.window.clear()
    
    @property
    def xy(self):
        """Return array of CoP positions for calculation."""
        return np.array([(x, y) for x, y, _ in self.window])
        
    def is_stable(self, threshold_cm_s=2.0):
        """
        Determine if the current balance is stable based on sway velocity.
        
        Args:
            threshold_cm_s (float): Velocity threshold for stability in cm/s
            
        Returns:
            bool: True if sway velocity is below threshold
        """
        metrics = self.compute()
        return metrics["sway_vel_cm_s"] < threshold_cm_s 