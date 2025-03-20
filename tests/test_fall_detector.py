import pytest
import numpy as np
import json
from pathlib import Path
from src.detector.fall_detector import FallDetector, FallEvent
import yaml

@pytest.fixture
def config():
    """Load test configuration."""
    with open('config/config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    return config['detector']

@pytest.fixture
def detector(config):
    """Create a detector instance for testing."""
    return FallDetector(config)

@pytest.fixture
def sample_frame():
    """Create a sample frame with a typical fall pattern."""
    frame = np.zeros((36, 36))  # 12x12 feet with 4-inch resolution
    # Simulate fall impact pattern
    frame[12:18, 12:16] = 1
    return frame

def create_frame_message(frame, timestamp=1234567890123):
    """Create a frame message in the correct format."""
    return json.dumps({
        "timestamp": timestamp,
        "frame": frame.tolist()
    })

def test_fall_detection_simple(detector, sample_frame):
    """Test basic fall detection with a clear fall pattern."""
    # Initial standing position
    standing_frame = np.zeros((36, 36))
    standing_frame[12:14, 12:13] = 1
    
    # Process standing frame
    detector.process_frame(create_frame_message(standing_frame))
    
    # Process fall impact frame multiple times to simulate stability
    event = None
    for i in range(6):  # Process 6 frames (more than stability_frames)
        event = detector.process_frame(
            create_frame_message(sample_frame, 
                               timestamp=1234567890123 + i*100)
        )
    
    assert event is not None
    assert isinstance(event, FallEvent)
    assert event.confidence > 0.7
    assert event.impact_area > 0

def test_no_detection_on_walking(detector):
    """Test that walking patterns don't trigger fall detection."""
    # Simulate footstep
    frame = np.zeros((36, 36))
    frame[12:14, 12:13] = 1
    
    event = detector.process_frame(create_frame_message(frame))
    assert event is None

def test_impact_area_bounds(detector):
    """Test fall detection with different impact areas."""
    # Too small impact
    small_frame = np.zeros((36, 36))
    small_frame[12:14, 12:14] = 1  # 2x2 sensors
    
    event = detector.process_frame(create_frame_message(small_frame))
    assert event is None
    
    # Too large impact
    large_frame = np.zeros((36, 36))
    large_frame[12:24, 12:24] = 1  # 12x12 sensors
    
    event = detector.process_frame(create_frame_message(large_frame))
    assert event is None

def test_confidence_calculation(detector, sample_frame):
    """Test confidence score calculation."""
    # Process multiple frames to simulate a fall
    for i in range(6):
        event = detector.process_frame(
            create_frame_message(sample_frame, 
                               timestamp=1234567890123 + i*100)
        )
        
        if event:
            assert 0 <= event.confidence <= 1
            # Check confidence components
            assert event.impact_area > 0
            assert event.pre_fall_velocity >= 0

def test_invalid_input_handling(detector):
    """Test handling of invalid input data."""
    # Invalid JSON
    event = detector.process_frame("invalid json")
    assert event is None
    
    # Missing fields
    event = detector.process_frame(json.dumps({"timestamp": 1234567890123}))
    assert event is None
    
    # Invalid frame dimensions
    small_frame = np.zeros((5, 5))
    event = detector.process_frame(create_frame_message(small_frame))
    assert event is None

def test_sequence_requirements(detector, sample_frame):
    """Test that fall detection requires sustained activation."""
    # Single impact frame shouldn't trigger detection
    event = detector.process_frame(create_frame_message(sample_frame))
    assert event is None
    
    # Multiple frames with gaps shouldn't trigger detection
    for i in range(6):
        if i % 2 == 0:
            frame = sample_frame
        else:
            frame = np.zeros_like(sample_frame)
            
        event = detector.process_frame(
            create_frame_message(frame, 
                               timestamp=1234567890123 + i*100)
        )
        assert event is None
