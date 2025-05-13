import numpy as np
from src.utils.config import config

def calc_cop(frame_bool) -> tuple[float, float]:
    """
    Calculate the Center of Pressure (CoP) coordinates from a binary frame.
    
    Args:
        frame_bool (np.ndarray): Binary array where True indicates active sensors
        
    Returns:
        tuple[float, float]: (x, y) coordinates of the center of pressure
    """
    # Get dimensions from config
    R = config.get("SENSOR_ROWS", 12)
    C = config.get("SENSOR_COLS", 15)
    
    # Count active pixels
    active_count = np.sum(frame_bool)
    
    # If no active pixels, return center of grid
    if active_count == 0:
        return C / 2, R / 2
    
    # Calculate CoP using weighted average
    y_indices, x_indices = np.where(frame_bool)
    cop_x = np.mean(x_indices)
    cop_y = np.mean(y_indices)
    
    return cop_x, cop_y

def split_load(frame_bool) -> dict:
    """
    Calculate load distribution across quadrants of the sensor frame.
    
    Args:
        frame_bool (np.ndarray): Binary array where True indicates active sensors
        
    Returns:
        dict: Percentages of load in left/right and anterior/posterior regions
    """
    # Get dimensions from config
    R = config.get("SENSOR_ROWS", 12)
    C = config.get("SENSOR_COLS", 15)
    
    # Calculate total active sensors
    total = np.sum(frame_bool)
    
    # If no active sensors, return even distribution
    if total == 0:
        return {
            "left_pct": 0.5,
            "right_pct": 0.5,
            "ant_pct": 0.5,
            "post_pct": 0.5
        }
    
    return {
        "left_pct": np.sum(frame_bool[:, :C//2]) / total,
        "right_pct": np.sum(frame_bool[:, C//2:]) / total,
        "ant_pct": np.sum(frame_bool[:R//2, :]) / total,
        "post_pct": np.sum(frame_bool[R//2:, :]) / total
    }

def active_area_ratio(frame_bool, template_pixels=150) -> float:
    """
    Calculate the ratio of active sensor area to a template area.
    
    Args:
        frame_bool (np.ndarray): Binary array where True indicates active sensors
        template_pixels (int): The reference number of pixels to compare against
        
    Returns:
        float: Ratio of active pixels to template pixels
    """
    active_pixels = np.sum(frame_bool)
    return active_pixels / template_pixels 