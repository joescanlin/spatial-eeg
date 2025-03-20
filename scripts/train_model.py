import os
import numpy as np
from sklearn.model_selection import train_test_split
from fall_detector import FallDetector
import matplotlib.pyplot as plt
import logging
from datetime import datetime

def plot_training_history(history):
    """Plot training metrics."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    # Plot accuracy
    ax1.plot(history.history['accuracy'], label='Training Accuracy')
    ax1.plot(history.history['val_accuracy'], label='Validation Accuracy')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    
    # Plot loss
    ax2.plot(history.history['loss'], label='Training Loss')
    ax2.plot(history.history['val_loss'], label='Validation Loss')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    
    plt.tight_layout()

def main():
    # Create necessary directories
    os.makedirs('models', exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    
    # Create timestamp for versioning
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Setup logging with versioned filename
    log_file = f'logs/training_{timestamp}.log'
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Initialize fall detector
    detector = FallDetector(sequence_length=10)
    
    # Load dataset
    X, y = detector.load_dataset('data')
    
    # Split dataset into train, validation, and test sets
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size=0.2, random_state=42)
    
    print(f"\nDataset splits:")
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print(f"Test samples: {len(X_test)}")
    
    # Build and train model
    detector.build_model()
    history = detector.train(X_train, y_train, X_val, y_val, epochs=50)
    
    # Plot training history with versioned filename
    plot_training_history(history)
    plt.savefig(f'logs/training_history_{timestamp}.png')
    plt.close()
    
    # Evaluate model
    report, cm = detector.evaluate(X_test, y_test)
    print("\nTest Set Evaluation:")
    print(report)
    print("\nConfusion Matrix:")
    print(cm)
    
    # Generate timestamp for model versioning
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = f'models/fall_detector_{timestamp}'  # SavedModel directory
    latest_path = 'models/fall_detector_final'  # SavedModel directory
    
    # Save the model with version
    detector.save_model(model_path)
    
    # Also save as latest for the predictor
    detector.save_model(latest_path)
    
    print(f"\nModel saved as:")
    print(f"1. Versioned: {model_path}")
    print(f"2. Latest: {latest_path}")
    print(f"\nTraining logs and plots saved in logs/ directory")

if __name__ == "__main__":
    main()
