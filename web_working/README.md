# FD SMS

## Dev Setup

### Setup Python

```sh
# Create venv
$ python -m venv .venv/
# Activate source
$ source .venv/bin/activate
# Install requirements
$ pip install -r requirements.txt
```

### Setup Node

```sh
npm i
```

### Basic Run Commands

```sh
# Start vite server
$ npm run dev
# Start python server
$ npm run server
# Starts python server and vite server
$ npm start
```

## Building Portfolio Globe Visualization

The application now includes a sophisticated 3D globe visualization for building portfolio data, inspired by GitHub's commit globe dashboard. This feature provides an interactive way to visualize and analyze buildings across the portfolio.

### Features

- **Interactive 3D Globe**: Buildings are displayed as nodes positioned around a central globe
- **Real-time Data Flows**: Animated particles show connections and data flow between buildings
- **Building Activity Events**: Visual indicators for various activities in different buildings
- **Metrics Dashboard**: Real-time metrics displayed in the corners of the visualization
- **Building Details**: Interactive panels showing detailed information on selected buildings
- **Orbital Rings**: Decorative elements that enhance the visual appeal of the globe

### Implementation

The visualization leverages Three.js and React Three Fiber for 3D rendering, with the following components:

- `GlobeVisualization.tsx`: Main component for the 3D globe visualization
- `BuildingNode`: Represents individual buildings in the 3D space
- `ConnectionFlow`: Renders animated connections between buildings
- `ActivityNode`: Shows real-time events with trails and animations
- `OrbitalRings`: Creates the orbital ring effect around the globe

### Usage

To view the building portfolio visualization:

1. Select "Portfolio Insights" from the main menu
2. The visualization will load with real-time (mock) data updates
3. Click on buildings to see detailed information
4. Use mouse/trackpad to rotate, zoom and interact with the globe

### Development

To enhance or modify the visualization:

- Building data is defined in `mockData.ts`
- Events are randomly generated in 2-second intervals
- Metrics are updated every 5 seconds
- Visual styling can be customized by modifying the materials and effects
