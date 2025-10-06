# Technical Brief: Scanalytics Demo App

## 1. Repo Map
- `web_working/` - Main web application directory
  - `src/` - React/TypeScript source code
  - `config.yaml` - MQTT and visualization configuration
  - `server.py` - Python backend server
- `src/` - Core Python backend
  - `backend/` - FastAPI backend services
  - `pt_analytics/` - Physical therapy analytics services
  - `utils/` - Shared utilities
- `scripts/` - Utility scripts for monitoring and testing
- `models/` - ML model definitions
- `tests/` - Test suite
- `docs/` - Documentation

## 2. Sensor Frame Ingestion
- **MQTT Client**: `src/utils/mqtt_client.py`
- **Broker Settings**:
  - URL: `169.254.100.100:1883`
  - Topics:
    - `sensors/floor/raw` - Raw sensor data
    - `controller/networkx/frame/rft` - Frame data
    - `pt/metrics` - PT metrics
    - `pt/exercise/status` - Exercise status
    - `pt/exercise/type` - Exercise type
- **Payload Structure**: JSON format with frame data
- **Timestamp Source**: Server-side timestamp if not provided in payload

## 3. Coordinate & Grid Config
- **Grid Dimensions**:
  - Rows: 12
  - Columns: 15
  - Cell Size: 4 inches (10.16 cm)
- **Coordinate Mapping**:
  - World X = (col - GRID_WIDTH/2 + 0.5) * SENSOR_SIZE
  - World Z = (row - GRID_HEIGHT/2 + 0.5) * SENSOR_SIZE
  - Defined in `web_working/src/components/3d/SensorGrid.tsx`

## 4. Session Handling
- **Start/Stop**: 
  - REST API endpoints in `src/backend/routes/sessions.py`
  - POST `/sessions/` to start
  - POST `/sessions/{id}/stop` to end
- **Session ID**: 
  - Generated as UUID on session creation
  - Stored in `SessionCache` singleton
  - Propagated via MQTT messages

## 5. UI Data Flow
- **Tech Stack**:
  - React + TypeScript
  - Vite for build
  - Three.js for 3D visualization
  - MQTT over WebSocket for real-time data
- **Components**:
  - `SensorGrid.tsx` - 3D grid visualization
  - `GridDisplay.tsx` - 2D grid display
  - `BalanceTrainingGuide.tsx` - Training UI
- **Data Flow**:
  - MQTT → WebSocket → React components
  - Server-sent events for grid updates

## 6. Persistence Layer
- **Database**: PostgreSQL with asyncpg
- **Schemas**:
  - `pt_sessions` - Session metadata
  - `pt_metric_samples` - Time-series metrics
  - `pt_patients` - Patient information
- **Models**: Defined in `src/backend/db/models.py`

## 7. Build & Runtime
- **Language Versions**:
  - Python 3.x
  - Node.js (latest LTS)
- **Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `JWT_SECRET` - Authentication secret
  - `MQTT_BROKER` - MQTT broker host
  - `MQTT_PORT` - MQTT broker port
- **Start Commands**:
  ```bash
  # Install dependencies
  pip install -r requirements.txt
  npm install
  
  # Start development servers
  npm start  # Runs both frontend and backend
  ```

## 8. Known Limitations
- No explicit TODO/FIXME comments found in codebase
- Current limitations:
  - Single MQTT broker configuration
  - No horizontal scaling support
  - Limited error recovery for MQTT disconnections
  - No built-in data retention policies 