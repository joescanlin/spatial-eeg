Purpose

This application fuses EEG brainwave signals (via Emotiv Insight) with our smart flooring sensors (capturing cognitive and behavioral spatial patterns).
The main objective is to assist researchers in understanding how geriatric subjects react to different flooring patterns.

By linking brain activity to observed movement and navigation behaviors, the system provides objective evidence for identifying, testing, and defending flooring designs that improve safety, comfort, and well-being in senior living and care settings.

⸻

Core Goals
	1.	Multimodal Session Capture
	•	Collect synchronized data streams:
	•	EEG signals (cognitive and emotional state markers).
	•	Floor path reconstructions (gait, navigation patterns, fall risk indicators).
	2.	Research-Grade Data Export
	•	Unified, timestamp-aligned session files (Parquet/CSV + JSON metadata).
	•	Structured for statistical analysis, machine learning, and publication-ready research.
	3.	Real-Time Feedback for Observation
	•	Visualization panels show:
	•	Live path reconstruction (mobility & spatial orientation).
	•	Live EEG traces or simplified cognitive state metrics.
	•	Updates with <100 ms latency, allowing researchers to observe live reactions during trials.
	4.	Defensible Flooring Design Insights
	•	Provide quantifiable evidence of how flooring texture, layout, and patterns affect:
	•	Stability
	•	Confidence in movement
	•	Cognitive load during navigation
	•	Support designers, architects, and clinicians in selecting patterns that best serve geriatric populations.

⸻

Key Components
	•	Floor Sensor Ingestion – MQTT events, path reconstruction, fall/step detection.
	•	EEG LSL Inlet – connects to EmotivPRO’s Lab Streaming Layer for raw EEG.
	•	Unified Session Writer – merges EEG + floor data into one synchronized file.
	•	Session Control API – start/stop sessions, health checks, marker injection.
	•	Research Visualization UI – side-by-side EEG + floor views for real-time observation.

⸻

Why It Matters
	•	For Researchers: Offers a rigorous tool to correlate neural signals with spatial behavior, providing evidence beyond self-reports.
	•	For Senior Living Designers: Empowers data-driven flooring choices that reduce fall risk and cognitive stress.
	•	For Healthcare Providers: Supplies defensible, objective outcomes that can be tied to patient safety and wellness initiatives.

⸻

Design Principles
	•	Research-first – data quality, synchronization, and schema stability are prioritized.
	•	Extensible – future streams (EMG, HRV, motion capture) can be added with minimal rework.
	•	Low latency, high fidelity – real-time UI is lightweight, but exported data retains full resolution.
	•	Compliance ready – export path, PHI handling, and schema versioning designed with HIPAA and IRB protocols in mind.