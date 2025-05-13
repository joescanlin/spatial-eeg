# PT Analytics Documentation

This document describes the physical therapy analytics module, which processes pressure sensor data to extract clinically relevant metrics for gait, balance, and functional assessment.

## Key Metrics and Formulas

### Gait Metrics

#### Cadence
Cadence is measured in steps per minute (SPM).

```
cadence_spm = (number of heel strikes / time window in minutes) 
```

#### Stride Length
Distance between consecutive footfalls of the same foot, measured in inches.

```
stride_len_in = |COP_x(heel strike n+2) - COP_x(heel strike n)| × pixel_size_in
```

#### Cadence Variability (CV)
Coefficient of variation of step times, representing gait stability.

```
cadence_cv = σ(step_times) / μ(step_times)
```
- σ is the standard deviation
- μ is the mean
- Normal values: < 0.05 (lower is better)
- Values > 0.10 indicate high variability

#### Double Support Percentage
Percentage of gait cycle spent with both feet on the ground.

```
dbl_support_pct = (time_both_feet_on_ground / total_gait_cycle_time) × 100
```
- Typical values: 20-25% for normal walking
- Values > 30% indicate cautious gait

#### Symmetry Index
Measure of left/right symmetry in step length (100% = perfect symmetry).

```
symmetry_idx_pct = 100 × (1 - |left_step_length - right_step_length| / (left_step_length + right_step_length))
```

### Balance Metrics

#### Sway Path
Total distance traveled by the center of pressure (COP) during static stance.

```
sway_path_cm = Σ |COP(t) - COP(t-1)| × 2.54
```
- Units: centimeters (cm)
- Conversion from inches to cm: 1 inch = 2.54 cm

#### Sway Velocity
Rate of COP movement during static stance.

```
sway_vel_cm_s = sway_path_cm / time_period
```
- Units: centimeters per second (cm/s)

#### Sway Area
Area of the convex hull containing all COP positions during measurement period.

```
sway_area_cm2 = ConvexHull(COP_points) × (2.54)²
```
- Units: square centimeters (cm²)

### Turning Metrics

#### Turn Angle
Cumulative angle turned during walking.

```
turning_angle_deg = Σ |θₙ|
```
Where θₙ is the angle between consecutive movement vectors:
```
θ = arccos((v₁·v₂) / (|v₁|×|v₂|))
```

#### Turning Speed
Rate of angular change during turning.

```
turning_speed_deg_s = turning_angle_deg / time_period
```

### Functional Assessment Metrics

#### Sit-to-Stand (STS) Detection
The STS transition is detected using weight shift patterns between the chair zone and standing zone.

```
sts_detected = (0.2 < chair_zone_activity_ratio < 0.7) && (outside_activity > 0)
```

#### Active Area Ratio
Proportion of active sensors relative to a reference template.

```
active_area_ratio = active_sensor_count / reference_template_size
```

## Metrics JSON Schema Example

```json
{
  "ts": "2023-10-15T14:32:45.213Z",
  
  "/* Gait Metrics */": null,
  "cadence_spm": 112,            /* Steps per minute */
  "stride_len_in": 27.5,         /* Stride length in inches */
  "cadence_cv": 0.03,            /* Cadence coefficient of variation (0-1) */
  "symmetry_idx_pct": 96.2,      /* Symmetry index (0-100%) */
  "dbl_support_pct": 22.8,       /* Double support percentage */
  
  "/* Balance Metrics */": null,
  "sway_path_cm": 14.2,          /* COP path length in cm */
  "sway_vel_cm_s": 2.8,          /* COP velocity in cm/s */
  "sway_area_cm2": 8.5,          /* Sway area in cm² */
  
  "/* Turning Metrics */": null,
  "turning_angle_deg": 85,       /* Total turning angle in degrees */
  "turning_speed_deg_s": 42.5,   /* Turning speed in degrees/second */
  
  "/* Load Distribution */": null,
  "left_pct": 0.48,              /* Left side load percentage */
  "right_pct": 0.52,             /* Right side load percentage */
  "ant_pct": 0.45,               /* Anterior (front) load percentage */
  "post_pct": 0.55,              /* Posterior (back) load percentage */
  
  "/* Functional Metrics */": null,
  "active_area_pct": 0.12,       /* Active area percentage */
  "sts_count": 2,                /* Number of sit-to-stand transitions */
  "avg_duration_s": 1.8,         /* Average STS duration in seconds */
  "symmetry_score": 92.5         /* STS symmetry score (0-100) */
}
```

## Clinical Interpretation Guidelines

### Gait Parameters

| Metric | Normal Range | Clinical Significance |
|--------|--------------|----------------------|
| Cadence | 100-120 spm | <90: slow gait, >130: festinating gait |
| Stride Length | 25-30 inches | <20: shuffling, limited mobility |
| Cadence CV | <0.05 | >0.10: unstable gait, fall risk |
| Double Support | 20-25% | >30%: cautious gait pattern |
| Symmetry Index | >90% | <80%: significant asymmetry |

### Balance Parameters

| Metric | Normal Range | Clinical Significance |
|--------|--------------|----------------------|
| Sway Velocity | <3 cm/s | >4 cm/s: increased fall risk |
| Sway Area | <10 cm² | >15 cm²: balance impairment |

### Functional Parameters

| Metric | Normal Range | Clinical Significance |
|--------|--------------|----------------------|
| STS Duration | 1.5-2.5s | >3s: muscle weakness or balance issues |
| STS Symmetry | >90% | <80%: compensatory strategies 