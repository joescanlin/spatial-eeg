import unittest
import numpy as np
from datetime import datetime, timedelta
import time

from src.pt_analytics.features.gait import GaitDetector

class TestGaitVariability(unittest.TestCase):
    """Tests for detecting variability in gait patterns."""
    
    def setUp(self):
        """Set up the test with a new gait detector."""
        self.gait_detector = GaitDetector(fps=30, stride_px_thresh=3)
        
    def test_high_variability_in_irregular_steps(self):
        """Test that irregular step patterns result in high cadence variability."""
        # Create synthetic frame data
        # We'll simulate a 12x15 grid (rows x cols)
        rows, cols = 12, 15
        
        # Start with a baseline timestamp
        base_time = time.time()
        
        # Simulate regular steps first to establish baseline
        for i in range(10):
            # Create empty frame
            frame = np.zeros((rows, cols), dtype=bool)
            
            # Add footprint (single foot)
            if i % 2 == 0:  # Left foot
                foot_col = 4
            else:  # Right foot
                foot_col = 10
                
            # Add foot shape
            foot_row = 6
            frame[foot_row-1:foot_row+2, foot_col-1:foot_col+2] = True
            
            # Process frame with consistent timing (regular steps)
            timestamp = base_time + i * 0.5  # 0.5s between steps (regular cadence)
            self.gait_detector.update(frame, timestamp)
            
        # Reset detector for the irregular steps test
        self.gait_detector = GaitDetector(fps=30, stride_px_thresh=3)
            
        # Now simulate irregular steps with variable timing
        # This should result in high cadence variability
        irregular_intervals = [0.3, 0.7, 0.2, 0.9, 0.4, 0.8, 0.3, 0.6, 0.5, 0.7]
        current_time = base_time
        
        for i in range(len(irregular_intervals)):
            # Create empty frame
            frame = np.zeros((rows, cols), dtype=bool)
            
            # Add footprint (alternating feet)
            if i % 2 == 0:
                foot_col = 4  # Left foot
            else:
                foot_col = 10  # Right foot
                
            # Add foot shape
            foot_row = 6
            frame[foot_row-1:foot_row+2, foot_col-1:foot_col+2] = True
            
            # Increase time by irregular interval
            current_time += irregular_intervals[i]
            
            # Process frame with variable timing
            metrics = self.gait_detector.update(frame, current_time)
        
        # After several irregular steps, check the cadence variability
        self.assertIsNotNone(metrics)
        self.assertIn('cadence_cv', metrics)
        
        # Cadence variability should be above 0.05 (5%) for irregular steps
        self.assertGreater(metrics['cadence_cv'], 0.05, 
                          f"Expected cadence variability > 0.05, got {metrics['cadence_cv']}")
        
        # Print the actual value for verification
        print(f"Irregular steps produced cadence variability: {metrics['cadence_cv']:.3f}")

if __name__ == '__main__':
    unittest.main() 