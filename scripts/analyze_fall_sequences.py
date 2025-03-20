import os
import json
import numpy as np
import matplotlib.pyplot as plt
import logging
from datetime import datetime

def calculate_spatial_metrics(frame):
    """Calculate spatial metrics for a single frame."""
    # Convert frame to numpy array if it's not already
    frame = np.array(frame)
    
    # Find indices of activated sensors
    activated_indices = np.argwhere(frame)
    
    if len(activated_indices) == 0:
        return None
    
    # Bounding box metrics
    min_row, min_col = activated_indices.min(axis=0)
    max_row, max_col = activated_indices.max(axis=0)
    
    bbox_height = max_row - min_row + 1
    bbox_width = max_col - min_col + 1
    aspect_ratio = bbox_height / bbox_width if bbox_width > 0 else 1
    
    # Dispersion metrics
    row_variance = np.var(activated_indices[:, 0])
    col_variance = np.var(activated_indices[:, 1])
    total_variance = row_variance + col_variance
    
    return {
        "activated_sensors": len(activated_indices),
        "bbox_height": bbox_height,
        "bbox_width": bbox_width,
        "aspect_ratio": aspect_ratio,
        "row_variance": row_variance,
        "col_variance": col_variance,
        "total_variance": total_variance
    }

def analyze_fall_sequences(directory='data', output_dir='analysis_results'):
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Setup logging to capture terminal output
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(output_dir, f'fall_sequence_analysis_{timestamp}.log')
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(message)s',
                        handlers=[
                            logging.FileHandler(log_filename),
                            logging.StreamHandler()
                        ])
    
    # Collect all fall sequences
    fall_sequences = []
    
    # Possible fall-related labels
    fall_labels = ['fall', 'Fall', 'true_positive']
    
    # Iterate through JSON files in specified directory
    logging.info(f"Searching for fall sequences in {directory}")
    for filename in os.listdir(directory):
        if filename.endswith('.json'):
            filepath = os.path.join(directory, filename)
            
            logging.info(f"Examining file: {filepath}")
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # Handle different possible JSON structures
                if isinstance(data, dict):
                    sequences = data.get('sequences', [])
                elif isinstance(data, list):
                    sequences = data
                else:
                    logging.info(f"Unexpected data type in {filename}: {type(data)}")
                    continue
                
                # Print out all sequence labels for debugging
                logging.info("Sequences in this file:")
                for sequence in sequences:
                    # Handle different possible label locations
                    label = sequence.get('label', 
                                         sequence.get('tag', 
                                         sequence.get('type', 'unknown')))
                    logging.info(f"  Sequence label: {label}")
                    
                    # Check if this is a fall sequence
                    if label in fall_labels:
                        fall_sequences.append(sequence)
                    
                    # Also print frames to understand data structure
                    logging.info(f"  Number of frames: {len(sequence.get('frames', []))}")
    
    logging.info(f"Total Fall Sequences found: {len(fall_sequences)}")
    
    # If no fall sequences, print out more details
    if not fall_sequences:
        logging.info("No fall sequences found. Possible reasons:")
        logging.info("1. No sequences are tagged as fall")
        logging.info("2. Incorrect label name")
        logging.info("3. JSON structure might be different")
        return
    
    # Update frames extraction
    for sequence in fall_sequences:
        sequence_frames = [np.array(frame['frame']) for frame in sequence['frames']]
        sequence['frames'] = sequence_frames
    
    # Analyze spatial metrics for fall sequences
    fall_spatial_metrics = []
    
    for sequence in fall_sequences:
        sequence_metrics = []
        
        for frame in sequence['frames']:
            frame_metrics = calculate_spatial_metrics(frame)
            if frame_metrics:
                sequence_metrics.append(frame_metrics)
        
        if sequence_metrics:
            fall_spatial_metrics.append(sequence_metrics)
    
    # Print detailed sequence information
    logging.info("\nDetailed Fall Sequence Information:")
    for i, sequence in enumerate(fall_sequences, 1):
        logging.info(f"Sequence {i}:")
        logging.info(f"  Label: {sequence.get('label', 'unknown')}")
        logging.info(f"  Timestamp: {sequence.get('timestamp', 'N/A')}")
        logging.info(f"  Number of frames: {len(sequence['frames'])}")
        logging.info(f"  Notes: {sequence.get('notes', 'None')}")
    
    # Prepare data for visualization
    activated_sensors = []
    aspect_ratios = []
    total_variances = []
    
    for sequence_metrics in fall_spatial_metrics:
        for metrics in sequence_metrics:
            activated_sensors.append(metrics['activated_sensors'])
            aspect_ratios.append(metrics['aspect_ratio'])
            total_variances.append(metrics['total_variance'])
    
    # Create visualization
    plt.figure(figsize=(20, 5))  # Wider figure to accommodate statistics
    
    # Activated Sensors Distribution
    plt.subplot(141)
    plt.hist(activated_sensors, bins='auto', edgecolor='black')
    plt.title('Activated Sensors Distribution')
    plt.xlabel('Number of Activated Sensors')
    plt.ylabel('Frequency')
    
    # Aspect Ratio Distribution
    plt.subplot(142)
    plt.hist(aspect_ratios, bins='auto', edgecolor='black')
    plt.title('Aspect Ratio Distribution')
    plt.xlabel('Aspect Ratio')
    plt.ylabel('Frequency')
    
    # Total Variance Distribution
    plt.subplot(143)
    plt.hist(total_variances, bins='auto', edgecolor='black')
    plt.title('Total Variance Distribution')
    plt.xlabel('Total Variance')
    plt.ylabel('Frequency')
    
    # Prepare summary statistics text
    stats_text = (
        "Spatial Metrics Summary\n"
        "----------------------\n"
        "Activated Sensors Statistics:\n"
        f"  Mean: {np.mean(activated_sensors):.2f}\n"
        f"  Median: {np.median(activated_sensors):.2f}\n"
        f"  Std Dev: {np.std(activated_sensors):.2f}\n\n"
        "Aspect Ratio Statistics:\n"
        f"  Mean: {np.mean(aspect_ratios):.2f}\n"
        f"  Median: {np.median(aspect_ratios):.2f}\n"
        f"  Std Dev: {np.std(aspect_ratios):.2f}\n\n"
        "Total Variance Statistics:\n"
        f"  Mean: {np.mean(total_variances):.2f}\n"
        f"  Median: {np.median(total_variances):.2f}\n"
        f"  Std Dev: {np.std(total_variances):.2f}"
    )
    
    # Add statistics subplot
    plt.subplot(144)
    plt.axis('off')
    plt.text(0.1, 0.5, stats_text, va='center', ha='left', 
             fontsize=10, family='monospace', 
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    # Adjust layout and save
    plt.tight_layout()
    
    # Save figure with timestamp
    fig_filename = os.path.join(output_dir, f'fall_spatial_metrics_{timestamp}.pdf')
    plt.savefig(fig_filename, bbox_inches='tight')
    logging.info(f"\nAnalysis complete. Results saved:")
    logging.info(f"  Log file: {log_filename}")
    logging.info(f"  Visualization: {fig_filename}")
    
    return fall_sequences, fall_spatial_metrics

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze fall sequences and generate visualizations')
    parser.add_argument('--directory', type=str, default='data',
                      help='Directory containing sequence data')
    parser.add_argument('--output-dir', type=str, default='analysis_results',
                      help='Directory to save analysis results')
    
    args = parser.parse_args()
    analyze_fall_sequences(directory=args.directory, output_dir=args.output_dir)
