import unittest
import numpy as np
import time
import math

from src.pt_analytics.features.gait import GaitDetector
from src.pt_analytics.features.load import calc_cop

class TestTurning(unittest.TestCase):
    """Tests for detecting turning movements."""
    
    def setUp(self):
        """Set up the test with a new gait detector."""
        self.gait_detector = GaitDetector(fps=30, stride_px_thresh=3)
        
    def test_90_degree_turn(self):
        """Test that a 90-degree turn is correctly detected and measured."""
        # Create synthetic frame data for a walking pattern with a 90° turn
        # We'll simulate a 12x15 grid (rows x cols)
        rows, cols = 12, 15
        
        # Start with a baseline timestamp
        base_time = time.time()
        current_time = base_time
        
        # First walk straight forward (bottom to top of grid)
        # This establishes the initial direction
        step_duration = 0.4  # 400ms per step
        
        # Generate 5 straight steps
        straight_steps = []
        for i in range(5):
            row = 9 - i  # Moving from bottom to top
            
            # Alternate between left and right feet
            if i % 2 == 0:
                col = 6  # Left foot
            else:
                col = 8  # Right foot
                
            straight_steps.append((row, col))
            
        # Generate turn steps (90° turn to the right)
        # After the turn, we'll be walking from left to right
        turn_steps = []
        
        # Step 1 (pivoting on left foot)
        turn_steps.append((4, 6))   # Left foot position
        
        # Step 2 (right foot steps to the right)
        turn_steps.append((4, 10))  # Right foot position after turn
        
        # Step 3-5 (continue walking to the right)
        for i in range(3):
            row = 4
            col = 6 + (i+2) * 2  # Moving from left to right
            
            # Alternate between left and right feet
            if i % 2 == 0:
                col -= 1  # Left foot
            else:
                col += 1  # Right foot
                
            turn_steps.append((row, col))
            
        # Combine all steps
        all_steps = straight_steps + turn_steps
        
        # Process each step
        for i, (row, col) in enumerate(all_steps):
            # Create empty frame
            frame = np.zeros((rows, cols), dtype=bool)
            
            # Add foot shape (3x3 grid)
            r_start, r_end = max(0, row-1), min(rows, row+2)
            c_start, c_end = max(0, col-1), min(cols, col+2)
            frame[r_start:r_end, c_start:c_end] = True
            
            # Update time
            current_time += step_duration
            
            # Process frame
            metrics = self.gait_detector.update(frame, current_time)
            
        # After the turn sequence, check the turning metrics
        self.assertIsNotNone(metrics)
        self.assertIn('turning_angle_deg', metrics)
        
        # The total turning angle should be approximately 90 degrees
        # Allow for some tolerance in the measurement (±20 degrees)
        self.assertGreater(metrics['turning_angle_deg'], 70, 
                          f"Expected turning angle > 70°, got {metrics['turning_angle_deg']}°")
        self.assertLess(metrics['turning_angle_deg'], 110, 
                       f"Expected turning angle < 110°, got {metrics['turning_angle_deg']}°")
        
        # Check turning speed is reasonable
        self.assertIn('turning_speed_deg_s', metrics)
        self.assertGreater(metrics['turning_speed_deg_s'], 0)
        
        # Print the actual values for verification
        print(f"90° turn produced turning angle: {metrics['turning_angle_deg']:.1f}°")
        print(f"Turn speed: {metrics['turning_speed_deg_s']:.1f}°/s")

if __name__ == '__main__':
    unittest.main() 