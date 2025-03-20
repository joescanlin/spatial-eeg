import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras import layers, models
import logging

# Setup logging
logging.basicConfig(
    filename='fall_detector.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class FallDetector:
    def __init__(self, sequence_length=10):
        """Initialize the fall detector.
        
        Args:
            sequence_length: Number of frames to consider for each prediction
        """
        self.sequence_length = sequence_length
        self.grid_height = 15
        self.grid_width = 12
        self.model = None
        self.model_path = None
        
    def load_dataset(self, data_dir):
        """Load and preprocess all recorded sequences from the data directory.
        
        Args:
            data_dir: Directory containing recorded sequence JSON files
        
        Returns:
            X: Array of sequences, shape (n_samples, sequence_length, height, width)
            y: Array of labels, shape (n_samples,)
        """
        sequences = []
        labels = []
        
        for filename in os.listdir(data_dir):
            if not filename.startswith('recorded_sequences_') or not filename.endswith('.json'):
                continue
                
            filepath = os.path.join(data_dir, filename)
            logging.info(f"Loading sequences from {filepath}")
            
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                # Process each sequence in the file
                for sequence in data['sequences']:
                    # Extract frames and convert to numpy array
                    frames = [np.array(frame['frame'], dtype=np.float32) 
                            for frame in sequence['frames']]
                    
                    # Create sliding windows of sequence_length frames
                    for i in range(len(frames) - self.sequence_length + 1):
                        window = frames[i:i + self.sequence_length]
                        sequences.append(window)
                        
                        # Convert label to binary (1 for fall, 0 for others)
                        labels.append(1 if sequence['label'] == 'fall' else 0)
                
            except Exception as e:
                logging.error(f"Error loading {filepath}: {e}")
                continue
        
        X = np.array(sequences)
        y = np.array(labels)
        
        logging.info(f"Loaded {len(sequences)} sequences: {np.sum(y)} falls, {len(y) - np.sum(y)} non-falls")
        return X, y
    
    def build_model(self):
        """Build and compile the CNN-LSTM model for fall detection."""
        input_shape = (self.sequence_length, self.grid_height, self.grid_width, 1)
        
        model = models.Sequential([
            # CNN layers to extract spatial features
            layers.TimeDistributed(
                layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
                input_shape=input_shape
            ),
            layers.TimeDistributed(layers.MaxPooling2D((2, 2))),
            layers.TimeDistributed(layers.Conv2D(64, (3, 3), activation='relu', padding='same')),
            layers.TimeDistributed(layers.MaxPooling2D((2, 2))),
            
            # Flatten spatial features
            layers.TimeDistributed(layers.Flatten()),
            
            # LSTM layers to analyze temporal patterns
            layers.LSTM(64, return_sequences=True),
            layers.LSTM(32),
            
            # Dense layers for classification
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
        )
        
        self.model = model
        logging.info("Model built successfully")
        return model
    
    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32):
        """Train the model on the provided dataset.
        
        Args:
            X_train: Training sequences
            y_train: Training labels
            X_val: Validation sequences
            y_val: Validation labels
            epochs: Number of training epochs
            batch_size: Batch size for training
        """
        if self.model is None:
            self.build_model()
        
        # Reshape input to include channel dimension
        X_train = X_train.reshape(X_train.shape + (1,))
        X_val = X_val.reshape(X_val.shape + (1,))
        
        # Train the model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=5,
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ModelCheckpoint(
                    'models/fall_detector_best',
                    monitor='val_loss',
                    save_best_only=True,
                    save_format='tf'
                )
            ]
        )
        
        return history
    
    def evaluate(self, X_test, y_test):
        """Evaluate the model on test data.
        
        Args:
            X_test: Test sequences
            y_test: Test labels
        """
        X_test = X_test.reshape(X_test.shape + (1,))
        predictions = self.model.predict(X_test)
        predictions_binary = (predictions > 0.5).astype(int)
        
        # Print classification report
        report = classification_report(y_test, predictions_binary)
        logging.info("\nClassification Report:\n" + report)
        
        # Print confusion matrix
        cm = confusion_matrix(y_test, predictions_binary)
        logging.info("\nConfusion Matrix:\n" + str(cm))
        
        return report, cm
    
    def save_model(self, filepath):
        """Save the trained model in TensorFlow SavedModel format."""
        if self.model is not None:
            self.model.save(filepath, save_format='tf')
            logging.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load a trained model from SavedModel format."""
        try:
            self.model = models.load_model(filepath)
            self.model_path = filepath
            logging.info(f"Model loaded from {filepath}")
        except Exception as e:
            logging.error(f"Failed to load model from {filepath}: {e}")
            raise
