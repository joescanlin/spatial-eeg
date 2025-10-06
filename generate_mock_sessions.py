#!/usr/bin/env python3
"""
Generate realistic mock session data for research subjects.
Creates directory structure with floor sensor and EEG data files.
"""

import json
import csv
import os
from datetime import datetime, timedelta
import random
import math

# Base directory for session data
DATA_DIR = "session_data"

# Research subjects from mockResearchData.ts
SUBJECTS = [
    {"id": 1, "name": "Margaret_Thompson", "sessions": 5, "flooring": "Textured_Grid"},
    {"id": 2, "name": "Robert_Chen", "sessions": 4, "flooring": "High_Contrast_Stripes"},
    {"id": 3, "name": "Dorothy_Williams", "sessions": 6, "flooring": "Smooth_Monochrome"},
    {"id": 4, "name": "James_Anderson", "sessions": 3, "flooring": "Directional_Arrows"},
    {"id": 5, "name": "Patricia_Martinez", "sessions": 5, "flooring": "Organic_Patterns"}
]

FLOORING_PATTERNS = [
    "Textured Grid Pattern",
    "High-Contrast Stripes",
    "Smooth Monochrome",
    "Directional Arrows",
    "Organic Patterns"
]

def generate_footstep_pattern(step_num, grid_width=12, grid_height=15):
    """
    Generate a realistic footstep pattern on the floor grid.
    Each pixel is a 4"x4" boolean on/off switch (0 or 1 only).
    """
    # Create empty grid (all switches off)
    grid = [[0 for _ in range(grid_width)] for _ in range(grid_height)]

    # Simulate foot position (alternating left/right)
    is_left_foot = step_num % 2 == 0

    # Foot lands in middle-ish area, moving forward
    foot_center_x = 4 if is_left_foot else 7  # Left or right side
    foot_center_y = 7 + (step_num % 3)  # Move slightly forward

    # Create foot contact pattern (footprint shape)
    # Adult foot is approximately 10-11 inches long, 3-4 inches wide
    # Each pixel is 4"x4", so footprint covers ~3x2-3 pixels
    for y in range(max(0, foot_center_y - 2), min(grid_height, foot_center_y + 3)):
        for x in range(max(0, foot_center_x - 1), min(grid_width, foot_center_x + 2)):
            # Activate pixels where foot makes contact
            distance = abs(x - foot_center_x) + abs(y - foot_center_y)
            if distance <= 2:  # Foot contact area
                grid[y][x] = 1  # Switch ON
            elif distance == 3 and random.random() > 0.6:
                grid[y][x] = 1  # Occasional edge contact

    return grid

def generate_floor_frames(session_num, num_frames=2700):
    """
    Generate frame-by-frame floor sensor data.
    For a 45-minute session at ~1 FPS, we get ~2700 frames.
    """
    frames = []
    steps_taken = 0

    for i in range(num_frames):
        # Every ~30 frames (30 seconds), take a step
        if i % 30 == 0 and steps_taken < 90:  # ~90 steps per session
            frame = generate_footstep_pattern(steps_taken)
            steps_taken += 1
        else:
            # Empty frame (no contact)
            frame = [[0 for _ in range(12)] for _ in range(15)]

        frames.append({"frame": frame})

    return frames

def generate_floor_metadata(session_num, flooring_pattern):
    """Generate floor sensor metadata JSON with frame-by-frame data"""
    timestamp_str = datetime.now().isoformat()

    # Generate frame-by-frame data
    frames = generate_floor_frames(session_num, num_frames=2700)

    return {
        "metadata": {
            "grid_width": 12,
            "grid_height": 15,
            "pixel_resolution": 4,
            "timestamp": timestamp_str,
            "session_number": session_num,
            "flooring_pattern": flooring_pattern,
            "duration_seconds": 45 * 60,  # 45 minutes
            "total_sequences": 1,
            "frame_rate_hz": 1.0  # 1 frame per second
        },
        "sequences": [
            {
                "label": "gait_trial",
                "timestamp": timestamp_str,
                "frames": frames
            }
        ],
        "summary_metrics": {
            "avg_cadence_spm": round(70 + random.uniform(-10, 20), 2),
            "avg_symmetry_pct": round(75 + random.uniform(-15, 20), 2),
            "avg_step_length_cm": round(55 + random.uniform(-5, 10), 2),
            "avg_stance_time_ms": round(650 + random.uniform(-50, 100), 2),
            "gait_variability": round(5 + random.uniform(-2, 3), 2),
            "balance_score": round(0.75 + random.uniform(-0.1, 0.2), 3),
            "cop_area_cm2": round(6 + random.uniform(-2, 4), 2),
            "sway_velocity_cm_s": round(4 + random.uniform(-1, 2), 2),
            "stability_score_pct": round(75 + random.uniform(-10, 20), 2),
            "total_steps": len([f for f in frames if any(any(row) for row in f["frame"])])
        }
    }

def generate_eeg_frames(session_num, flooring_pattern, num_samples=21600):
    """
    Generate frame-by-frame EEG data at 8 Hz (performance metrics rate).
    For a 45-minute session at 8 Hz, we get 21,600 samples.
    """
    is_effective = flooring_pattern in ["Textured Grid Pattern", "High-Contrast Stripes", "Directional Arrows"]

    base_focus = 75 if is_effective else 65
    base_stress = 30 if is_effective else 40
    base_attention = 72 if is_effective else 65

    samples = []
    base_time = datetime.now().timestamp()

    for i in range(num_samples):
        t = base_time + (i / 8.0)  # 8 Hz sampling rate
        progress = i / num_samples

        # Add some realistic variation
        focus = base_focus + math.sin(i * 0.01) * 10 + random.uniform(-3, 3)
        stress = base_stress + math.sin(i * 0.015 + 1) * 8 + random.uniform(-2, 2)
        attention = base_attention + math.sin(i * 0.008 + 2) * 12 + random.uniform(-4, 4)

        samples.append({
            "time": round(t, 3),
            "met": [  # Performance metrics array
                round(max(0, min(100, focus + random.uniform(-2, 2))), 2),  # engagement
                round(max(0, min(100, stress)), 2),  # stress
                round(max(0, min(100, 60 - stress * 0.5)), 2),  # relaxation
                round(max(0, min(100, focus * 0.9)), 2),  # excitement
                round(max(0, min(100, attention * 0.85)), 2),  # interest
                round(max(0, min(100, focus)), 2),  # focus
            ]
        })

    return samples

def generate_eeg_metadata(session_num, flooring_pattern):
    """Generate EEG metadata JSON with frame-by-frame data"""
    is_effective = flooring_pattern in ["Textured Grid Pattern", "High-Contrast Stripes", "Directional Arrows"]

    # Generate frame-by-frame samples
    samples = generate_eeg_frames(session_num, flooring_pattern, num_samples=21600)

    return {
        "metadata": {
            "device": "Emotiv Insight",
            "channels": ["AF3", "AF4", "T7", "T8", "Pz"],
            "sample_rate_hz": 128,
            "performance_metrics_rate_hz": 8,
            "session_number": session_num,
            "flooring_pattern": flooring_pattern,
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": 45 * 60,
            "total_samples": len(samples)
        },
        "performance_metrics": {
            "description": "8 Hz performance metrics stream (met)",
            "metrics": ["engagement", "stress", "relaxation", "excitement", "interest", "focus"],
            "samples": samples
        },
        "cognitive_metrics_summary": {
            "avg_focus": round((75 if is_effective else 65) + random.uniform(-5, 10), 2),
            "avg_stress": round((30 if is_effective else 40) + random.uniform(-5, 10), 2),
            "avg_attention": round((72 if is_effective else 65) + random.uniform(-5, 10), 2),
            "avg_engagement": round((68 if is_effective else 60) + random.uniform(-5, 10), 2),
            "avg_cognitive_load": round((42 if is_effective else 50) + random.uniform(-5, 10), 2),
            "avg_relaxation": round((58 if is_effective else 50) + random.uniform(-5, 10), 2)
        },
        "band_power_summary": {
            "theta": {
                "avg_power_uv2": round(0.25 + random.uniform(0, 0.15), 3),
                "description": "4-8 Hz, associated with relaxation and meditation"
            },
            "alpha": {
                "avg_power_uv2": round(0.35 + random.uniform(0, 0.2), 3),
                "description": "8-12 Hz, associated with relaxed alertness"
            },
            "beta_low": {
                "avg_power_uv2": round(0.15 + random.uniform(0, 0.1), 3),
                "description": "12-16 Hz, associated with active thinking"
            },
            "beta_high": {
                "avg_power_uv2": round(0.12 + random.uniform(0, 0.08), 3),
                "description": "16-25 Hz, associated with intense focus"
            },
            "gamma": {
                "avg_power_uv2": round(0.10 + random.uniform(0, 0.05), 3),
                "description": "25-45 Hz, associated with high-level cognition"
            }
        },
        "contact_quality": {
            "overall_quality_pct": round(75 + random.uniform(0, 20), 2),
            "channels": {
                "AF3": random.choice([1, 2, 3, 4]),  # 1=poor, 4=excellent
                "AF4": random.choice([2, 3, 4]),
                "T7": random.choice([2, 3, 4]),
                "T8": random.choice([2, 3, 4]),
                "Pz": random.choice([1, 2, 3, 4])
            },
            "battery_level_pct": round(85 + random.uniform(-20, 15), 2)
        }
    }

def generate_combined_timeseries(session_num, flooring_pattern, num_samples=100):
    """Generate combined floor + EEG time-series CSV data"""
    is_effective = flooring_pattern in ["Textured Grid Pattern", "High-Contrast Stripes", "Directional Arrows"]

    base_time = datetime.now().timestamp()
    data = []

    for i in range(num_samples):
        t = base_time + i * 2.0  # 2 second intervals
        progress = i / num_samples

        # Floor metrics with some progression
        cadence = 70 + progress * 20 + math.sin(i * 0.3) * 3
        symmetry = 75 + progress * 15
        balance = 0.75 + progress * 0.15

        # EEG metrics based on flooring effectiveness
        focus = (75 if is_effective else 65) + progress * 5 + math.sin(i * 0.2) * 5
        stress = (30 if is_effective else 40) - progress * 5 + math.sin(i * 0.4) * 3
        attention = (72 if is_effective else 65) + progress * 8 + math.sin(i * 0.25) * 4
        cognitive_load = (42 if is_effective else 50) - progress * 8 + math.sin(i * 0.3) * 4

        data.append([
            f"{t:.3f}",
            f"{cadence:.2f}",
            f"{symmetry:.2f}",
            f"{65 + progress * 12:.2f}",  # step_length_symmetry
            f"{max(5, 15 - progress * 10):.2f}",  # stance_time_asymmetry
            f"{max(2, 8 - progress * 5):.2f}",  # gait_variability
            f"{balance:.3f}",
            f"{max(3, 7 - progress * 3):.2f}",  # cop_area
            f"{max(2, 5 - progress * 2):.2f}",  # sway_velocity
            f"{min(95, 65 + progress * 25):.2f}",  # stability_score
            f"{i * 10 + random.randint(0, 5)}",  # step_count
            f"{focus:.2f}",
            f"{stress:.2f}",
            f"{attention:.2f}",
            f"{cognitive_load:.2f}"
        ])

    return data

def create_session_data():
    """Create all mock session data"""
    # Create base directory
    os.makedirs(DATA_DIR, exist_ok=True)

    for subject in SUBJECTS:
        subject_dir = os.path.join(DATA_DIR, f"Subject_{subject['id']:03d}_{subject['name']}")
        os.makedirs(subject_dir, exist_ok=True)

        base_date = datetime(2025, 9, 1)

        for session_num in range(1, subject['sessions'] + 1):
            session_date = base_date + timedelta(days=(session_num - 1) * 7)
            session_dir = os.path.join(subject_dir, f"Session_{session_num:02d}_{session_date.strftime('%Y-%m-%d')}")
            os.makedirs(session_dir, exist_ok=True)

            # Choose flooring pattern (rotate through them or use subject's preferred)
            flooring_pattern = FLOORING_PATTERNS[(session_num - 1) % len(FLOORING_PATTERNS)]

            # Generate floor metadata
            floor_meta = generate_floor_metadata(session_num, flooring_pattern)
            with open(os.path.join(session_dir, "metadata_floor.json"), "w") as f:
                json.dump(floor_meta, f, indent=2)

            # Generate EEG metadata
            eeg_meta = generate_eeg_metadata(session_num, flooring_pattern)
            with open(os.path.join(session_dir, "metadata_eeg.json"), "w") as f:
                json.dump(eeg_meta, f, indent=2)

            # Generate combined time-series CSV
            timeseries = generate_combined_timeseries(session_num, flooring_pattern)
            with open(os.path.join(session_dir, "combined_timeseries.csv"), "w", newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'timestamp',
                    'cadence_spm',
                    'symmetry_pct',
                    'step_length_symmetry_pct',
                    'stance_time_asymmetry_pct',
                    'gait_variability',
                    'balance_score',
                    'cop_area_cm2',
                    'sway_velocity_cm_s',
                    'stability_score_pct',
                    'step_count',
                    'eeg_focus',
                    'eeg_stress',
                    'eeg_attention',
                    'eeg_cognitive_load'
                ])
                writer.writerows(timeseries)

            print(f"✓ Created {session_dir}")

    print(f"\n✅ Generated session data for {len(SUBJECTS)} subjects in {DATA_DIR}/")

if __name__ == "__main__":
    create_session_data()
