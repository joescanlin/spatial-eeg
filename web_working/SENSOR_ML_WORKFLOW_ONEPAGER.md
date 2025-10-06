# Sensor ML Workflow - One Page Architecture

## **Universal Pipeline: Sensor Data → Specialized Intelligence Models**

```
Sensor Grid → MQTT → Flask Backend → Keras Model → SSE Stream → React Frontend
   15×12        |      (server.py)      (.h5 file)     (/api/*)    (Component)
   @ 10Hz       |         ↓                ↓            ↓           ↓
                |    ML Processing    Real-time      Frontend   Live Updates
                |                   Predictions    Subscription
                |
        Topic: controller/networkx/frame/rft
```

---

## **Backend Integration Pattern (server.py)**

```python
# 1. Load trained model at startup
def init_models():
    global fall_model, softbio_model
    fall_model = tf.keras.models.load_model('models/fall_detector_v2.h5')
    softbio_model = tf.keras.models.load_model('models/soft_biometrics_v1.h5')  # Future

# 2. Process sensor frames in MQTT handler
def on_mqtt_message(client, userdata, message):
    sensor_frame = parse_sensor_data(message.payload)

    # Run specialized models
    fall_pred = fall_model.predict(sensor_frame[:48, :])        # Full grid
    softbio_pred = softbio_model.predict(sensor_frame[:15, :])  # Gait region

    # Push to SSE queues
    fall_queue.put({'fall_probability': fall_pred})
    softbio_queue.put({'demographics': softbio_pred})

# 3. SSE endpoints for real-time streaming
@app.route('/api/fall-stream')
def fall_stream():
    return Response(stream_sse(fall_queue), mimetype='text/plain')

@app.route('/api/softbio-stream')
def softbio_stream():
    return Response(stream_sse(softbio_queue), mimetype='text/plain')
```

---

## **Frontend Integration Pattern (React)**

```typescript
// 1. Custom hook for SSE connection
function useModelStream(endpoint: string) {
    const [data, setData] = useState([]);

    useEffect(() => {
        const eventSource = new EventSource(`/api/${endpoint}`);
        eventSource.onmessage = (event) => {
            const prediction = JSON.parse(event.data);
            setData(prev => [...prev.slice(-1000), prediction]); // Keep last 1000
        };
        return () => eventSource.close();
    }, [endpoint]);

    return data;
}

// 2. Component subscribes to model predictions
function ModelDashboard() {
    const fallPredictions = useModelStream('fall-stream');
    const softbioPredictions = useModelStream('softbio-stream');

    return (
        <div className="grid grid-cols-2">
            <FallDetectionPanel data={fallPredictions} />
            <SoftBioPanel data={softbioPredictions} />
        </div>
    );
}
```

---

## **New Model Development Checklist**

### **Step 1: Model Development**
```bash
# Train your specialized Keras model
python train_new_model.py --use-case posture_analysis
# Output: models/posture_analysis_v1.h5
```

### **Step 2: Backend Integration (server.py)**
```python
# Add model loading
posture_model = tf.keras.models.load_model('models/posture_analysis_v1.h5')

# Add MQTT processing
posture_pred = posture_model.predict(sensor_frame)
posture_queue.put({'posture_score': posture_pred})

# Add SSE endpoint
@app.route('/api/posture-stream')
def posture_stream():
    return Response(stream_sse(posture_queue), mimetype='text/plain')
```

### **Step 3: Frontend Integration**
```typescript
// Add component
function PosturePanel() {
    const predictions = useModelStream('posture-stream');
    return <div>Posture Score: {predictions.latest?.posture_score}</div>;
}

// Add to main dashboard
<PosturePanel />
```

---

## **Current Implementations**

| Model | Status | Backend Route | Frontend Component | Data Flow |
|-------|--------|---------------|-------------------|-----------|
| **Fall Detection** | ✅ Production | `/api/fall-stream` | `FallDetectionPanel` | 48×12 → CNN → Alert |
| **Soft Biometrics** | 🔄 Development | `/api/softbio-stream` | `SoftBioPanel` | 15×12 → CNN → Demographics |
| **Your New Model** | ⏳ Template | `/api/newmodel-stream` | `NewModelPanel` | Custom → CNN → Predictions |

---

## **Architecture Benefits**

### **For Engineers**
- **Same pattern everywhere**: Load model → Process frame → Stream results
- **Hot-swappable models**: Update .h5 file, restart server
- **Parallel development**: Multiple models can be added independently
- **Unified logging**: All predictions logged through same Flask infrastructure

### **For Deployment**
- **Single server**: All models run in same Flask process
- **Real-time streaming**: All frontends get live updates via SSE
- **Scalable**: Add new models without changing core architecture
- **Debuggable**: Single log stream shows all model predictions

---

## **Key Files**

```
web_working/
├── server.py                 # Main backend with model integration
├── models/
│   ├── fall_detector_v2.h5   # Production model
│   └── soft_biometrics_v1.h5 # Future model
└── src/
    ├── hooks/
    │   └── useModelStream.ts  # Universal SSE hook
    └── components/
        ├── FallDetectionPanel.tsx
        └── SoftBioPanel.tsx
```

---

## **Quick Start: Adding Your Model**

1. **Train**: `model.save('models/your_model_v1.h5')`
2. **Backend**: Add 5 lines to `server.py` (load, predict, queue, route)
3. **Frontend**: Create component using `useModelStream('your-model-stream')`
4. **Deploy**: Restart server, refresh frontend

**Result**: Real-time predictions streaming to your UI in ~30 minutes of integration work.