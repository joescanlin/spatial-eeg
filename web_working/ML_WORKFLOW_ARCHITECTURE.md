# ML Workflow Architecture: Repeatable Pipeline for Specialized Sensor Models

## **Overview: Universal Sensor-to-Intelligence Pipeline**

This document outlines our standardized machine learning workflow that transforms raw sensor grid data into specialized intelligence models. We've successfully deployed this pipeline for **Fall Detection** and are currently implementing it for **Soft Biometrics**, establishing a repeatable pattern for all future sensor-based use cases.

---

## **The Universal ML Pipeline**

```
Raw Sensor Data → Feature Engineering → CNN Training → Keras Models → Production Deployment
      ↓                    ↓                ↓            ↓              ↓
   Grid Frames      Temporal Sequences   Supervised ML   .h5 Files   Real-time Inference
```

**Key Insight**: While each use case has different objectives, the underlying ML architecture and deployment pipeline remains consistent, enabling rapid development of new specialized models.

---

## **Current Implementation Status**

| Use Case | Data Collection | Model Training | Production Deployment | Status |
|----------|----------------|----------------|----------------------|---------|
| **Fall Detection** | ✅ Complete | ✅ Complete | ✅ Live in Production | **DEPLOYED** |
| **Soft Biometrics** | 🔄 In Progress | ⏳ Planned | ⏳ Planned | **DEVELOPMENT** |
| **Future Use Cases** | ⏳ TBD | ⏳ TBD | ⏳ TBD | **PIPELINE READY** |

---

## **Phase-by-Phase Implementation**

### **Phase 1: Data Collection & Validation**

#### **Fall Detection (Completed ✅)**
```python
# Collected supervised training data
fall_dataset = {
    'sensor_sequences': np.array([48, 12, sequence_length]),  # 48x12 grid over time
    'labels': np.array([0, 1]),  # Binary: no-fall, fall
    'metadata': {
        'fall_types': ['forward', 'backward', 'sideways'],
        'participant_demographics': demographics_data,
        'environmental_conditions': conditions_data
    }
}
```

#### **Soft Biometrics (Current Phase 🔄)**
```python
# Currently collecting training data via baseline predictions
softbio_dataset = {
    'sensor_sequences': np.array([15, 12, sequence_length]),  # 15x12 focused gait region
    'baseline_predictions': baseline_model_outputs,  # Rule-based initial predictions
    'ground_truth': voluntary_demographics,  # Self-reported during sessions
    'metadata': {
        'gait_quality': quality_flags,
        'session_conditions': environment_data,
        'participant_consent': privacy_flags
    }
}

# Data collection strategy
def collect_training_sample():
    """Every demo session generates potential training data"""
    session_data = process_sensor_session()
    baseline_pred = rule_based_model.predict(session_data)

    # Optional ground truth collection
    if participant_consents():
        ground_truth = collect_demographics()
        save_training_sample(session_data, baseline_pred, ground_truth)
```

---

### **Phase 2: CNN Model Development**

#### **Shared Architecture Pattern**
```python
def create_specialized_cnn(input_shape, num_outputs, output_type='classification'):
    """Universal CNN architecture for sensor grid analysis"""

    model = tf.keras.Sequential([
        # Spatial feature extraction
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),

        # Temporal pattern recognition
        tf.keras.layers.Conv1D(128, 3, activation='relu'),
        tf.keras.layers.GlobalMaxPooling1D(),

        # Decision layers
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.3),
    ])

    # Specialized output heads
    if output_type == 'classification':
        model.add(tf.keras.layers.Dense(num_outputs, activation='sigmoid'))
        model.compile(optimizer='adam', loss='binary_crossentropy')
    elif output_type == 'regression':
        model.add(tf.keras.layers.Dense(num_outputs, activation='linear'))
        model.compile(optimizer='adam', loss='mse')
    elif output_type == 'multi_target':
        # Multiple specialized heads for complex outputs
        model.compile(optimizer='adam', loss=['mse', 'binary_crossentropy', 'sparse_categorical_crossentropy'])

    return model
```

#### **Fall Detection Implementation (Production ✅)**
```python
# Specialized for binary fall classification
fall_model = create_specialized_cnn(
    input_shape=(48, 12, 30),  # 48x12 grid, 30 frame sequences
    num_outputs=1,
    output_type='classification'
)

# Training pipeline
fall_model.fit(
    x=sensor_sequences,
    y=fall_labels,
    epochs=100,
    validation_split=0.2,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=10),
        tf.keras.callbacks.ModelCheckpoint('fall_detector_v2.h5')
    ]
)
```

#### **Soft Biometrics Implementation (Planned ⏳)**
```python
# Multi-target model for demographics prediction
softbio_model = tf.keras.Model(inputs=sensor_input, outputs=[
    height_head,    # Regression: continuous height in cm
    gender_head,    # Classification: binary gender probability
    age_head        # Classification: age group (4 classes)
])

softbio_model.compile(
    optimizer='adam',
    loss={
        'height': 'mse',
        'gender': 'binary_crossentropy',
        'age': 'sparse_categorical_crossentropy'
    },
    loss_weights={'height': 1.0, 'gender': 0.8, 'age': 0.6}
)

# Training pipeline (future)
softbio_model.fit(
    x=gait_sequences,
    y={'height': height_labels, 'gender': gender_labels, 'age': age_labels},
    epochs=150,
    validation_split=0.2
)

softbio_model.save('soft_biometrics_v1.h5')
```

---

### **Phase 3: Production Deployment**

#### **Unified Deployment Architecture**
```python
# server.py - Universal model integration pattern
class UniversalMLPipeline:
    def __init__(self, model_configs):
        self.models = {}
        for name, config in model_configs.items():
            self.models[name] = tf.keras.models.load_model(config['model_path'])

    def process_sensor_frame(self, sensor_data):
        """Process single frame through all specialized models"""
        results = {}

        # Route data to appropriate models based on requirements
        if 'fall_detection' in self.models:
            fall_region = sensor_data[:48, :]  # Full grid for fall detection
            fall_sequence = self.get_temporal_sequence(fall_region, length=30)
            results['fall_detection'] = self.models['fall_detection'].predict(fall_sequence)

        if 'soft_biometrics' in self.models:
            gait_region = sensor_data[:15, :]  # Focused region for gait analysis
            gait_sequence = self.get_temporal_sequence(gait_region, length=50)
            results['soft_biometrics'] = self.models['soft_biometrics'].predict(gait_sequence)

        return results

# Production server initialization
model_pipeline = UniversalMLPipeline({
    'fall_detection': {'model_path': 'models/fall_detector_v2.h5'},
    'soft_biometrics': {'model_path': 'models/soft_biometrics_v1.h5'},  # Future
    # 'posture_analysis': {'model_path': 'models/posture_v1.h5'},      # Future
    # 'activity_recognition': {'model_path': 'models/activity_v1.h5'}, # Future
})
```

#### **Real-time Inference Integration**
```python
# MQTT message handler with multiple model inference
def on_mqtt_message(client, userdata, message):
    sensor_frame = parse_sensor_data(message.payload)

    # Run all models on incoming sensor data
    predictions = model_pipeline.process_sensor_frame(sensor_frame)

    # Route predictions to appropriate SSE streams
    if 'fall_detection' in predictions:
        fall_queue.put({
            'fall_probability': predictions['fall_detection'],
            'timestamp': time.time()
        })

    if 'soft_biometrics' in predictions:
        softbio_queue.put({
            'height_cm': predictions['soft_biometrics']['height'],
            'gender_prob': predictions['soft_biometrics']['gender'],
            'age_class': predictions['soft_biometrics']['age'],
            'timestamp': time.time()
        })
```

---

## **Repeatable Workflow Template**

### **For Any New Use Case**

```python
class NewUseCaseModel:
    """Template for developing new specialized sensor models"""

    def __init__(self, use_case_name):
        self.name = use_case_name
        self.data_collection_strategy = self.define_data_strategy()
        self.model_architecture = self.define_architecture()
        self.deployment_config = self.define_deployment()

    def define_data_strategy(self):
        """Phase 1: How will we collect training data?"""
        return {
            'sensor_region': (height, width),  # Which part of sensor grid
            'sequence_length': frames,         # How many frames needed
            'labeling_method': 'supervised|unsupervised|baseline_assisted',
            'collection_plan': 'controlled_study|passive_collection|simulation'
        }

    def define_architecture(self):
        """Phase 2: CNN architecture specialization"""
        return create_specialized_cnn(
            input_shape=self.data_collection_strategy['sensor_region'] + (sequence_length,),
            num_outputs=self.get_output_dimensions(),
            output_type=self.get_output_type()
        )

    def define_deployment(self):
        """Phase 3: Production integration"""
        return {
            'model_path': f'models/{self.name}_v1.h5',
            'sse_endpoint': f'/api/{self.name}-stream',
            'update_frequency': 'per_frame|every_500ms|on_event',
            'frontend_integration': f'{self.name}Panel.tsx'
        }
```

---

## **Future Use Cases Ready for This Pipeline**

### **Immediate Candidates**
```python
# Posture Analysis
posture_model = NewUseCaseModel('posture_analysis')
# Predict: sitting_posture, standing_balance, mobility_score

# Activity Recognition
activity_model = NewUseCaseModel('activity_recognition')
# Predict: walking, standing, sitting, lying_down, exercising

# Crowd Analytics
crowd_model = NewUseCaseModel('crowd_analytics')
# Predict: person_count, traffic_patterns, occupancy_zones

# Rehabilitation Monitoring
rehab_model = NewUseCaseModel('rehabilitation_monitoring')
# Predict: exercise_compliance, progress_metrics, risk_assessment
```

### **Advanced Applications**
```python
# Multi-person Tracking
tracking_model = NewUseCaseModel('person_tracking')
# Predict: individual_trajectories, interaction_patterns, dwell_times

# Behavioral Analytics
behavior_model = NewUseCaseModel('behavioral_analytics')
# Predict: wandering_risk, agitation_level, social_interaction

# Predictive Health
health_model = NewUseCaseModel('predictive_health')
# Predict: mobility_decline, fall_risk_trends, health_deterioration
```

---

## **Development Timeline Template**

| Phase | Duration | Deliverables | Success Metrics |
|-------|----------|--------------|------------------|
| **Data Collection** | 3-6 months | Training dataset, baseline model | 1000+ labeled samples |
| **Model Development** | 2-4 months | Trained Keras model, validation results | >85% accuracy on test set |
| **Integration** | 1-2 months | Production deployment, frontend UI | Real-time inference <100ms |
| **Optimization** | 1-3 months | Model refinement, performance tuning | Production-ready performance |

---

## **Key Success Factors**

### **Technical Consistency**
- **Same sensor hardware**: All models leverage existing sensor grid infrastructure
- **Same data pipeline**: Unified MQTT → Flask → SSE architecture
- **Same ML stack**: TensorFlow/Keras for all model development
- **Same deployment**: .h5 models loaded into production server

### **Operational Efficiency**
- **Reusable components**: Feature extraction, temporal windowing, model serving
- **Parallel development**: Multiple models can be developed simultaneously
- **Incremental deployment**: New models add to existing system without disruption
- **Unified monitoring**: All models share the same logging and monitoring infrastructure

### **Business Scalability**
- **Rapid prototyping**: Baseline models enable immediate demonstration
- **Data leverage**: Each deployment generates training data for future models
- **Customer validation**: Early deployments validate market demand before heavy ML investment
- **Technology moats**: Each successful model creates competitive differentiation

---

## **Conclusion: Sensor Intelligence Platform**

We're not just building individual models—we're building a **repeatable sensor intelligence platform**. The Fall Detection success proves the pipeline works. The Soft Biometrics development demonstrates the pattern's repeatability. Future specialized models will follow this same proven path, enabling rapid expansion into new use cases while leveraging our core sensor infrastructure and ML expertise.

**This standardized workflow transforms our sensor grid from a single-purpose fall detector into a universal platform for extracting actionable intelligence from human movement patterns.**