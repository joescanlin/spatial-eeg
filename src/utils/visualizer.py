import matplotlib.pyplot as plt
import numpy as np
from typing import List, Dict, Any
import json
from pathlib import Path
import pandas as pd
from datetime import datetime

class DataVisualizer:
    """Utility class for visualizing sensor data and detection results."""
    
    def __init__(self, output_dir: str = "visualizations"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def plot_frame_sequence(self, frames: List[Dict[str, Any]], 
                          start_idx: int = 0, num_frames: int = 5):
        """Plot a sequence of frames to show sensor activation patterns."""
        fig, axes = plt.subplots(1, num_frames, figsize=(4*num_frames, 4))
        
        for i, ax in enumerate(axes):
            if start_idx + i < len(frames):
                frame_data = frames[start_idx + i]
                frame = np.array(frame_data['frame'])
                
                ax.imshow(frame, cmap='Blues')
                ax.set_title(f"Frame {start_idx + i}\n"
                           f"t={frame_data['timestamp']}")
                ax.axis('off')
                
        plt.tight_layout()
        return fig
    
    def plot_activation_heatmap(self, frames: List[Dict[str, Any]]):
        """Create a heatmap showing cumulative sensor activations."""
        if not frames:
            return None
            
        cumulative = np.zeros_like(np.array(frames[0]['frame']), dtype=float)
        
        for frame_data in frames:
            frame = np.array(frame_data['frame'])
            cumulative += frame
            
        fig, ax = plt.subplots(figsize=(8, 8))
        im = ax.imshow(cumulative, cmap='YlOrRd')
        plt.colorbar(im)
        ax.set_title("Cumulative Sensor Activations")
        
        return fig
    
    def save_visualization(self, fig, filename: str):
        """Save visualization to file."""
        output_path = self.output_dir / filename
        fig.savefig(output_path)
        plt.close(fig)

class MetricsVisualizer:
    """Utility class for visualizing detection metrics and statistics."""
    
    def __init__(self):
        self.metrics_history = []
        
    def add_detection_event(self, event_data: Dict[str, Any]):
        """Add a detection event to the metrics history."""
        self.metrics_history.append({
            'timestamp': event_data['timestamp'],
            'confidence': event_data['confidence'],
            'impact_area': event_data['impact_area'],
            'velocity': event_data['velocity']
        })
    
    def plot_confidence_distribution(self):
        """Plot distribution of detection confidences."""
        if not self.metrics_history:
            return None
            
        confidences = [event['confidence'] for event in self.metrics_history]
        
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.hist(confidences, bins=20, range=(0, 1))
        ax.set_title('Distribution of Detection Confidences')
        ax.set_xlabel('Confidence')
        ax.set_ylabel('Frequency')
        
        return fig
    
    def plot_metrics_timeline(self):
        """Plot timeline of various metrics."""
        if not self.metrics_history:
            return None
            
        df = pd.DataFrame(self.metrics_history)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 12))
        
        # Confidence timeline
        ax1.plot(df['timestamp'], df['confidence'], 'b-')
        ax1.set_title('Detection Confidence Over Time')
        ax1.set_ylabel('Confidence')
        
        # Impact area timeline
        ax2.plot(df['timestamp'], df['impact_area'], 'g-')
        ax2.set_title('Impact Area Over Time')
        ax2.set_ylabel('Area (sq inches)')
        
        # Velocity timeline
        ax3.plot(df['timestamp'], df['velocity'], 'r-')
        ax3.set_title('Velocity Over Time')
        ax3.set_ylabel('Velocity (in/s)')
        
        plt.tight_layout()
        return fig

    def export_metrics(self, output_file: str):
        """Export metrics history to JSON file."""
        with open(output_file, 'w') as f:
            json.dump(self.metrics_history, f, indent=2)
