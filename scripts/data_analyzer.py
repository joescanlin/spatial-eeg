import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from pathlib import Path
import seaborn as sns
from datetime import datetime
import pandas as pd
from typing import List, Dict, Any
import argparse

class DataAnalyzer:
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = Path(data_dir)
        self.recorded_sequences = []
        self.prediction_sequences = []
        
    def load_recorded_sequences(self, filename: str = None):
        """Load recorded sequences from a specific file or all files in the data directory."""
        if filename:
            path = self.data_dir / filename
            with open(path) as f:
                data = json.load(f)
                self.recorded_sequences.append(data)
        else:
            for file in self.data_dir.glob("recorded_sequences_*.json"):
                with open(file) as f:
                    data = json.load(f)
                    self.recorded_sequences.append(data)
    
    def animate_sequence(self, sequence_idx: int = 0, file_idx: int = 0):
        """Create an animated heatmap visualization of a sequence."""
        sequence = self.recorded_sequences[file_idx]["sequences"][sequence_idx]
        frames = sequence["frames"]
        fig, ax = plt.subplots(figsize=(8, 10))
        
        def update(frame_idx):
            ax.clear()
            frame_data = np.array(frames[frame_idx]["frame"])
            sns.heatmap(frame_data, ax=ax, cmap='YlOrRd', vmin=0, vmax=1)
            ax.set_title(f'Frame {frame_idx + 1}/{len(frames)}\nLabel: {sequence["label"]}')
        
        ani = animation.FuncAnimation(
            fig, update, frames=len(frames), 
            interval=100, repeat=True
        )
        plt.show()
        return ani
    
    def analyze_sequence_stats(self, sequence_idx: int = 0, file_idx: int = 0):
        """Analyze statistical properties of a sequence."""
        sequence = self.recorded_sequences[file_idx]["sequences"][sequence_idx]
        frames = sequence["frames"]
        
        # Convert frames to numpy array for analysis
        frame_arrays = np.array([frame["frame"] for frame in frames])
        
        stats = {
            "label": sequence["label"],
            "timestamp": sequence["timestamp"],
            "num_frames": len(frames),
            "mean_activation": np.mean(frame_arrays),
            "max_activation": np.max(frame_arrays),
            "std_activation": np.std(frame_arrays),
            "notes": sequence.get("notes", "No notes provided")
        }
        
        return pd.DataFrame([stats])
    
    def compare_sequences(self, recorded_seq: Dict[str, Any], predicted_seq: Dict[str, Any]):
        """Compare recorded and predicted sequences."""
        recorded_frames = np.array([frame["frame"] for frame in recorded_seq["frames"]])
        predicted_frames = np.array([frame["frame"] for frame in predicted_seq["frames"]])
        
        mse = np.mean((recorded_frames - predicted_frames) ** 2)
        correlation = np.corrcoef(recorded_frames.flatten(), predicted_frames.flatten())[0, 1]
        
        comparison = {
            "recorded_label": recorded_seq["label"],
            "predicted_label": predicted_seq["label"],
            "mse": mse,
            "correlation": correlation,
            "num_frames": len(recorded_frames)
        }
        
        return pd.DataFrame([comparison])

    def generate_summary_report(self):
        """Generate a summary report of all sequences."""
        all_stats = []
        
        for file_idx, data in enumerate(self.recorded_sequences):
            for seq_idx, sequence in enumerate(data["sequences"]):
                stats = self.analyze_sequence_stats(seq_idx, file_idx)
                stats["file_idx"] = file_idx
                stats["sequence_idx"] = seq_idx
                all_stats.append(stats)
        
        return pd.concat(all_stats, ignore_index=True)

def main():
    parser = argparse.ArgumentParser(description='Analyze fall detection data sequences')
    parser.add_argument('--data-dir', type=str, default='../data',
                      help='Directory containing sequence data')
    parser.add_argument('--file', type=str, default=None,
                      help='Specific file to analyze (optional)')
    parser.add_argument('--visualize', action='store_true',
                      help='Visualize sequences as animations')
    args = parser.parse_args()
    
    analyzer = DataAnalyzer(args.data_dir)
    analyzer.load_recorded_sequences(args.file)
    
    # Generate and display summary report
    summary = analyzer.generate_summary_report()
    print("\nSequence Summary Report:")
    print(summary.to_string())
    
    if args.visualize:
        print("\nPress Ctrl+C to stop the animation and move to the next sequence")
        for file_idx, data in enumerate(analyzer.recorded_sequences):
            for seq_idx in range(len(data["sequences"])):
                print(f"\nVisualizing sequence {seq_idx} from file {file_idx}")
                try:
                    analyzer.animate_sequence(seq_idx, file_idx)
                except KeyboardInterrupt:
                    plt.close()
                    continue

if __name__ == "__main__":
    main()
