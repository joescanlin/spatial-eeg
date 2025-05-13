import unittest
import numpy as np
import time

from src.pt_analytics.features.gait import GaitDetector
from src.pt_analytics.features.load import calc_cop

class TestDoubleSupport(unittest.TestCase):
    """Tests for detecting double support phase in gait."""
    
    def setUp(self):
        """Set up the test with a new gait detector."""
        self.gait_detector = GaitDetector(fps=30, stride_px_thresh=3)
        
    def test_slow_walk_high_double_support(self):
        """Test that slow walking produces high double support percentage."""
        # Create synthetic frame data for a slow walk pattern
        # We'll simulate a 12x15 grid (rows x cols)
        rows, cols = 12, 15
        
        # Start with a baseline timestamp
        base_time = time.time()
        current_time = base_time
        
        # Simulate a slow walking pattern with prolonged double support
        # Each gait cycle phases:
        # 1. Right foot contact (heel strike)
        # 2. Double support with both feet
        # 3. Left foot off (toe off)
        # 4. Right foot single support
        # 5. Left foot contact (heel strike)
        # 6. Double support with both feet
        # 7. Right foot off (toe off)
        # 8. Left foot single support
        
        # Slow walk cycle timing (in seconds) - typical cycle is ~1s, slow is ~1.5-2s
        phase_durations = [
            0.2,  # Right heel strike to double support
            0.3,  # Double support duration
            0.2,  # Transition to right single support
            0.5,  # Right single support duration
            0.2,  # Left heel strike to double support
            0.3,  # Double support duration 
            0.2,  # Transition to left single support
            0.5   # Left single support duration
        ]
        
        # Repeat for multiple gait cycles
        for cycle in range(3):
            # 1. Right foot contact (heel strike)
            current_time += phase_durations[0]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot
            metrics = self.gait_detector.update(frame, current_time)
            
            # 2. Double support with both feet
            current_time += phase_durations[1]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot
            frame[6:9, 3:6] = True   # Left foot
            metrics = self.gait_detector.update(frame, current_time)
            
            # 3. Left foot off (toe off)
            current_time += phase_durations[2]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot only
            metrics = self.gait_detector.update(frame, current_time)
            
            # 4. Right foot single support
            current_time += phase_durations[3]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot only
            metrics = self.gait_detector.update(frame, current_time)
            
            # 5. Left foot contact (heel strike)
            current_time += phase_durations[4]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot
            frame[6:9, 3:6] = True   # Left foot
            metrics = self.gait_detector.update(frame, current_time)
            
            # 6. Double support with both feet
            current_time += phase_durations[5]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 8:11] = True  # Right foot
            frame[6:9, 3:6] = True   # Left foot
            metrics = self.gait_detector.update(frame, current_time)
            
            # 7. Right foot off (toe off)
            current_time += phase_durations[6]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 3:6] = True   # Left foot only
            metrics = self.gait_detector.update(frame, current_time)
            
            # 8. Left single support
            current_time += phase_durations[7]
            frame = np.zeros((rows, cols), dtype=bool)
            frame[6:9, 3:6] = True   # Left foot only
            metrics = self.gait_detector.update(frame, current_time)
            
        # After several gait cycles, check the double support percentage
        self.assertIsNotNone(metrics)
        self.assertIn('dbl_support_pct', metrics)
        
        # Double support percentage should be above 30% for slow walking
        # In normal walking it's typically 20-25%, in slow walking it's higher
        self.assertGreater(metrics['dbl_support_pct'], 30, 
                          f"Expected double support > 30%, got {metrics['dbl_support_pct']}%")
        
        # Print the actual value for verification
        print(f"Slow walking produced double support percentage: {metrics['dbl_support_pct']:.1f}%")
        
        # Calculate theoretical double support based on our timing
        theoretical_ds = ((phase_durations[1] + phase_durations[5]) / 
                         sum(phase_durations)) * 100
        print(f"Theoretical double support based on timing: {theoretical_ds:.1f}%")

if __name__ == '__main__':
    unittest.main() 