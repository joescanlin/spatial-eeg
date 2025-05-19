import numpy as np
import gzip
from scipy.ndimage import median_filter

# Default sensor dimensions
SENSOR_ROWS = 12
SENSOR_COLS = 15

def parse_frame(frame_bytes: bytes, gzipped=True) -> np.ndarray:
    """
    Parse a binary frame received from sensors into a numpy array.
    
    Args:
        frame_bytes (bytes): The raw binary frame data
        gzipped (bool): Whether the data is gzip compressed
        
    Returns:
        np.ndarray: Binary array where True indicates active sensors
    """
    # Get sensor dimensions
    R = SENSOR_ROWS
    C = SENSOR_COLS
    
    # Decompress if gzipped
    data = gzip.decompress(frame_bytes) if gzipped else frame_bytes
    
    # Convert to binary numpy array
    frame = np.frombuffer(data, dtype=np.uint8).reshape(R, C) > 0
    
    # Apply median filter to reduce noise
    return median_filter(frame, size=3) 