import unittest
import numpy as np
import time

from src.pt_analytics.features.sts import STSDetector

class TestSitToStand(unittest.TestCase):
    """Tests for detecting sit-to-stand transitions."""
    
    def setUp(self):
        """Set up the test with a new STS detector."""
        self.sts_detector = STSDetector(fps=30)
        
    def test_five_sit_stand_cycles(self):
        """Test that 5 sit-stand cycles are correctly detected with expected timing."""
        # Create synthetic frame data for sit-to-stand transitions
        # We'll simulate a 12x15 grid (rows x cols)
        rows, cols = 12, 15
        
        # Define chair zone
        chair_zone = (slice(8, 12), slice(5, 10))
        
        # Start with a baseline timestamp
        base_time = time.time()
        current_time = base_time
        
        # Target transition timing (each full cycle ~10 seconds)
        sit_to_stand_duration = 2.0  # seconds to stand up
        standing_duration = 3.0      # seconds standing
        stand_to_sit_duration = 2.0  # seconds to sit down
        sitting_duration = 3.0       # seconds sitting
        
        # Create 5 complete sit-to-stand cycles
        for cycle in range(5):
            # Phase 1: Initially sitting
            current_time += 0.5  # Small delay before starting movement
            frame = np.zeros((rows, cols), dtype=bool)
            # Add sitting pattern (mostly in chair zone)
            frame[chair_zone] = True
            metrics = self.sts_detector.update(frame, current_time, chair_zone)
            
            # Phase 2: Begin standing up (weight shifts forward)
            # Generate several frames during the sit-to-stand transition
            transition_frames = 10  # Number of frames during transition
            for i in range(transition_frames):
                current_time += sit_to_stand_duration / transition_frames
                frame = np.zeros((rows, cols), dtype=bool)
                
                # Gradually shift weight from chair to standing position
                chair_weight = 1.0 - (i / transition_frames)
                standing_weight = i / transition_frames
                
                # Chair zone (reducing)
                if chair_weight > 0:
                    frame[chair_zone] = np.random.random(frame[chair_zone].shape) < chair_weight
                
                # Standing position (increasing)
                stand_zone = (slice(5, 8), slice(6, 9))
                if standing_weight > 0:
                    frame[stand_zone] = np.random.random(frame[stand_zone].shape) < standing_weight
                
                metrics = self.sts_detector.update(frame, current_time, chair_zone)
            
            # Phase 3: Standing
            current_time += standing_duration
            frame = np.zeros((rows, cols), dtype=bool)
            # Add standing pattern (feet only, outside chair zone)
            stand_zone = (slice(5, 8), slice(6, 9))
            frame[stand_zone] = True
            metrics = self.sts_detector.update(frame, current_time, chair_zone)
            
            # Phase 4: Begin sitting down
            # Generate several frames during the stand-to-sit transition
            transition_frames = 10  # Number of frames during transition
            for i in range(transition_frames):
                current_time += stand_to_sit_duration / transition_frames
                frame = np.zeros((rows, cols), dtype=bool)
                
                # Gradually shift weight from standing to chair
                standing_weight = 1.0 - (i / transition_frames)
                chair_weight = i / transition_frames
                
                # Standing position (reducing)
                if standing_weight > 0:
                    stand_zone = (slice(5, 8), slice(6, 9))
                    frame[stand_zone] = np.random.random(frame[stand_zone].shape) < standing_weight
                
                # Chair zone (increasing)
                if chair_weight > 0:
                    frame[chair_zone] = np.random.random(frame[chair_zone].shape) < chair_weight
                
                metrics = self.sts_detector.update(frame, current_time, chair_zone)
            
            # Phase 5: Sitting again
            current_time += sitting_duration
            frame = np.zeros((rows, cols), dtype=bool)
            # Add sitting pattern (mostly in chair zone)
            frame[chair_zone] = True
            metrics = self.sts_detector.update(frame, current_time, chair_zone)
        
        # Get final metrics after all cycles
        final_metrics = self.sts_detector.get_metrics()
        
        # Verify 5 sit-to-stand repetitions were detected
        self.assertEqual(final_metrics['sts_count'], 5, 
                        f"Expected 5 STS repetitions, got {final_metrics['sts_count']}")
        
        # Verify average time is close to expected (10 ± 1 seconds)
        # Note: We're checking the sit-to-stand duration, not the full cycle time
        self.assertGreater(final_metrics['avg_duration_s'], 1.5,
                          f"Expected average STS duration > 1.5s, got {final_metrics['avg_duration_s']}s")
        self.assertLess(final_metrics['avg_duration_s'], 2.5,
                       f"Expected average STS duration < 2.5s, got {final_metrics['avg_duration_s']}s")
        
        # Print results for verification
        print(f"Detected {final_metrics['sts_count']} sit-to-stand transitions")
        print(f"Average duration: {final_metrics['avg_duration_s']:.2f}s")
        print(f"Symmetry score: {final_metrics['symmetry_score']:.1f}")

if __name__ == '__main__':
    unittest.main() 