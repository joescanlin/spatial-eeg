import numpy as np
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime
import curses
from typing import List, Tuple, Optional, NamedTuple
import yaml
from pathlib import Path
import logging
import sys
from enum import Enum
from typing import List, Tuple, Optional, Dict
import math

logger = logging.getLogger(__name__)

class PlaybackState(Enum):
    PLAYING = "playing"
    PAUSED = "paused"
    FINISHED = "finished"

class Direction(NamedTuple):
    symbol: str
    angle: float

class MovementTracker:
    def __init__(self):
        self.last_position: Optional[Tuple[int, int]] = None
        self.last_timestamp: Optional[float] = None
        self.current_direction: Optional[Direction] = None
        self.current_speed: float = 0.0
        
    def update(self, position: Tuple[int, int], timestamp: float) -> None:
        if self.last_position and self.last_timestamp:
            dx = position[0] - self.last_position[0]
            dy = position[1] - self.last_position[1]
            
            # Calculate direction
            angle = math.atan2(dy, dx)
            self.current_direction = self._get_direction(angle)
            
            # Calculate speed (in sensors per second)
            distance = math.sqrt(dx*dx + dy*dy)
            time_delta = timestamp - self.last_timestamp
            self.current_speed = distance / time_delta if time_delta > 0 else 0
            
        self.last_position = position
        self.last_timestamp = timestamp
        
    def _get_direction(self, angle: float) -> Direction:
        """Convert angle to cardinal direction with symbol."""
        directions = [
            Direction("→", 0),
            Direction("↗", math.pi/4),
            Direction("↑", math.pi/2),
            Direction("↖", 3*math.pi/4),
            Direction("←", math.pi),
            Direction("↙", -3*math.pi/4),
            Direction("↓", -math.pi/2),
            Direction("↘", -math.pi/4)
        ]
        
        # Normalize angle to 0-2π
        angle = angle % (2*math.pi)
        
        # Find closest direction
        closest = min(directions, 
                     key=lambda d: abs(angle - d.angle))
        return closest

class PlaybackController:
    def __init__(self):
        self.state = PlaybackState.PLAYING
        self.speed_multiplier = 1.0
        self.frame_index = 0
        self.total_frames = 0
        self.start_time = time.time()
        self.elapsed_time = 0
        self.paused_time = 0
        self.last_frame_time = 0
        
    def adjust_speed(self, increment: float) -> None:
        """Adjust playback speed within bounds."""
        self.speed_multiplier = max(0.1, min(5.0, 
                                  self.speed_multiplier + increment))
    
    def toggle_pause(self) -> None:
        """Toggle between playing and paused states."""
        if self.state == PlaybackState.PLAYING:
            self.state = PlaybackState.PAUSED
            self.paused_time = time.time()
        else:
            if self.state == PlaybackState.PAUSED:
                # Adjust start time to account for pause duration
                pause_duration = time.time() - self.paused_time
                self.start_time += pause_duration
            self.state = PlaybackState.PLAYING
    
    def update_frame(self, is_last_frame: bool = False) -> None:
        """Update frame counter and timing information."""
        self.frame_index += 1
        self.last_frame_time = time.time()
        if is_last_frame:
            self.state = PlaybackState.FINISHED
        
        if self.state != PlaybackState.PAUSED:
            self.elapsed_time = time.time() - self.start_time

    def reset(self, total_frames: int) -> None:
        """Reset controller for new playback."""
        self.state = PlaybackState.PLAYING
        self.frame_index = 0
        self.total_frames = total_frames
        self.start_time = time.time()
        self.elapsed_time = 0
        self.paused_time = 0
        self.last_frame_time = 0

class ScenarioType(Enum):
    WALK_STRAIGHT = "walk_straight"
    WALK_CIRCLE = "walk_circle"
    WALK_RANDOM = "walk_random"
    SUDDEN_FALL = "sudden_fall"
    STUMBLE_FALL = "stumble_fall"
    SLOW_FALL = "slow_fall"
    WALK_THEN_FALL = "walk_then_fall"
    SIT_THEN_FALL = "sit_then_fall"
    MULTIPLE_PEOPLE = "multiple_people"

class Movement:
    def __init__(self, position: Tuple[int, int], duration: float = 0.1):
        self.position = position
        self.duration = duration  # Time to hold this position in seconds

class Scenario:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.movements: List[Movement] = []
        
    def add_movement(self, position: Tuple[int, int], duration: float = 0.1):
        self.movements.append(Movement(position, duration))
        return self

class FloorSensorSimulator:
    def __init__(self, width_feet: int = 12, length_feet: int = 12):
        self.resolution = 3  # 3 sensors per foot (4-inch resolution)
        self.rows = width_feet * self.resolution
        self.cols = length_feet * self.resolution
        self.frame = np.zeros((self.rows, self.cols), dtype=int)
        self.sample_rate = 0.1  # 10Hz sample rate
        self.scenarios = self._initialize_scenarios()
        self.playback = PlaybackController()
        self.movement_tracker = MovementTracker()

    def _initialize_scenarios(self) -> Dict[str, Scenario]:
        scenarios = {}  # Initialize dictionary
        
        # Straight walk across room - elderly pace
        walk_straight = Scenario(
            "walk_straight",
            "Elderly person walking slowly across the room with natural gait pattern"
        )
        # Slower steps with more pronounced side-to-side movement for stability
        for i in range(0, self.cols-2, 2):
            offset = 1 if (i//2) % 2 == 0 else -1
            walk_straight.add_movement((self.rows//2 + offset, i), 0.4)  # Increased from 0.1 to 0.4
            walk_straight.add_movement((self.rows//2 + offset, i), 0.2)  # Added pause between steps
        scenarios[ScenarioType.WALK_STRAIGHT.value] = walk_straight

        # Natural circular walk - elderly pace
        walk_circle = Scenario(
            "walk_circle",
            "Elderly person walking slowly in a circle with frequent small pauses"
        )
        center_x, center_y = self.rows//2, self.cols//2
        radius = min(self.rows, self.cols)//4
        for angle in range(0, 360, 15):  # Increased step angle for fewer steps
            x = center_x + int(radius * np.cos(np.radians(angle)))
            y = center_y + int(radius * np.sin(np.radians(angle)))
            # Longer step duration with slight variations
            duration = 0.4 + np.random.normal(0, 0.05)
            walk_circle.add_movement((x, y), duration)
            # Add occasional pause for stability
            if angle % 45 == 0:
                walk_circle.add_movement((x, y), 0.3)
        scenarios[ScenarioType.WALK_CIRCLE.value] = walk_circle

        # Slow walk with pause then sudden fall
        walk_then_fall = Scenario(
            "walk_then_fall",
            "Elderly person walking slowly, pausing, then falling forward"
        )
        # Slower walking pattern
        for i in range(0, self.cols//2, 2):
            walk_then_fall.add_movement((self.rows//2, i), 0.4)  # Increased duration
            walk_then_fall.add_movement((self.rows//2, i), 0.2)  # Added stability pause
        
        # Extended pause (showing fatigue)
        pause_pos = (self.rows//2, self.cols//2)
        for _ in range(4):
            walk_then_fall.add_movement(pause_pos, 0.5)
        
        # Fall sequence
        fall_pos = (self.rows//2, self.cols//2)
        # Initial instability
        walk_then_fall.add_movement((fall_pos[0]-1, fall_pos[1]), 0.3)
        walk_then_fall.add_movement((fall_pos[0]-2, fall_pos[1]), 0.3)
        # Forward fall
        for i in range(3):
            x_spread = 3 + i
            y_spread = 2 + i
            fall_frame_pos = (fall_pos[0], fall_pos[1])
            walk_then_fall.add_movement(fall_frame_pos, 0.2)
        # Impact and longer settling period
        for i in range(8):  # Increased post-fall frames
            walk_then_fall.add_movement(fall_frame_pos, 0.4)
        scenarios[ScenarioType.WALK_THEN_FALL.value] = walk_then_fall

        # Stumble and fall with realistic elderly movement
        stumble_fall = Scenario(
            "stumble_fall",
            "Elderly person stumbling with slower attempted recovery before falling"
        )
        start_x, start_y = self.rows//2, self.cols//3
        
        # Slower initial walking
        stumble_fall.add_movement((start_x, start_y), 0.4)
        # Initial stumble
        stumble_fall.add_movement((start_x+1, start_y+1), 0.3)
        stumble_fall.add_movement((start_x-1, start_y+1), 0.3)  # Slow recovery attempt
        # Second stumble
        stumble_fall.add_movement((start_x+2, start_y+2), 0.3)
        stumble_fall.add_movement((start_x, start_y+2), 0.4)    # Another slow recovery
        # Final loss of balance
        stumble_fall.add_movement((start_x+2, start_y+3), 0.2)
        stumble_fall.add_movement((start_x+3, start_y+3), 0.2)
        # Fall progression
        for i in range(3):
            x_offset = 4 + i
            y_offset = 3 + i//2
            stumble_fall.add_movement((start_x+x_offset, start_y+y_offset), 0.3)
        # Impact and extended settling
        for i in range(8):  # Increased post-fall frames
            stumble_fall.add_movement((start_x+6, start_y+4), 0.4)
        scenarios[ScenarioType.STUMBLE_FALL.value] = stumble_fall

        # Slow collapse (like fainting)
        slow_fall = Scenario(
            "slow_fall",
            "Elderly person slowly collapsing with very gradual descent"
        )
        start_x, start_y = self.rows//2, self.cols//2
        
        # Extended initial standing showing instability
        for _ in range(3):
            slow_fall.add_movement((start_x, start_y), 0.5)
        # Slower swaying
        slow_fall.add_movement((start_x+1, start_y), 0.4)
        slow_fall.add_movement((start_x-1, start_y), 0.4)
        slow_fall.add_movement((start_x+1, start_y), 0.4)
        # Very gradual collapse
        for i in range(6):  # Increased collapse duration
            spread = i + 1
            duration = 0.5 + (i * 0.15)  # Even slower progression
            slow_fall.add_movement((start_x, start_y), duration)
        # Extended final position
        for _ in range(5):
            slow_fall.add_movement((start_x, start_y), 0.5)
        scenarios[ScenarioType.SLOW_FALL.value] = slow_fall

        # Random wandering at elderly pace
        random_walk = Scenario(
            "random_walk",
            "Elderly person slowly wandering with frequent pauses"
        )
        current_x = self.rows//4
        current_y = self.cols//4
        for _ in range(15):  # Reduced number of steps
            # Random step with boundaries
            next_x = current_x + np.random.randint(-2, 3)
            next_y = current_y + np.random.randint(-2, 3)
            # Keep within bounds
            next_x = max(2, min(next_x, self.rows-3))
            next_y = max(2, min(next_y, self.cols-3))
            random_walk.add_movement((next_x, next_y), 0.4)  # Slower steps
            # Add occasional pause
            if np.random.random() < 0.3:  # 30% chance of pausing
                random_walk.add_movement((next_x, next_y), 0.5)
            current_x, current_y = next_x, next_y
        scenarios[ScenarioType.WALK_RANDOM.value] = random_walk

        # Sitting then falling - elderly version
        sit_fall = Scenario(
            "sit_then_fall",
            "Elderly person slowly sitting down then falling sideways"
        )
        start_x, start_y = self.rows//2, self.cols//2
        # Initial standing with slight sway
        for _ in range(2):
            sit_fall.add_movement((start_x, start_y), 0.5)
        # Slow sitting motion
        for i in range(4):  # More intermediate positions
            sit_fall.add_movement((start_x+i//2, start_y), 0.4)
        # Settled sitting position
        for _ in range(3):
            sit_fall.add_movement((start_x+2, start_y), 0.5)
        # Gradual sideways fall
        for i in range(4):  # Slower fall
            sit_fall.add_movement((start_x+2, start_y+i//2), 0.3)
        # Extended final position
        for _ in range(6):
            sit_fall.add_movement((start_x+2, start_y+2), 0.4)
        scenarios[ScenarioType.SIT_THEN_FALL.value] = sit_fall

        return scenarios

    def simulate_scenario(self, scenario_name: str) -> List[dict]:
        """Simulate a specific scenario."""
        if scenario_name not in self.scenarios:
            raise ValueError(f"Unknown scenario: {scenario_name}")
            
        scenario = self.scenarios[scenario_name]
        frames = []
        final_fall_position = None
        last_position = None  # Track previous foot position
        
        # Find the final position for fall scenarios
        if scenario_name in [ScenarioType.STUMBLE_FALL.value, 
                           ScenarioType.WALK_THEN_FALL.value,
                           ScenarioType.SLOW_FALL.value,
                           ScenarioType.SIT_THEN_FALL.value]:
            for movement in reversed(scenario.movements):
                if movement.duration >= 0.4:
                    final_fall_position = movement.position
                    break
        
        for movement in scenario.movements:
            frame = np.zeros((self.rows, self.cols), dtype=int)
            x, y = movement.position
            
            # Update movement tracker
            self.movement_tracker.update((x, y), time.time())
            
            # Only show body blob if we're at the final fall position
            if (final_fall_position is not None and 
                movement.position == final_fall_position and 
                movement.duration >= 0.4):
                # Show full body blob at final position
                for i in range(3):
                    for j in range(15):
                        if 0 <= x+i < self.rows and 0 <= y+j < self.cols:
                            frame[x+i, y+j] = 1
            else:
                # Show current foot position
                if 0 <= x < self.rows and 0 <= y < self.cols:
                    frame[x, y] = 1
                    
                # Show previous foot position during walking
                if last_position is not None and movement.duration < 0.4:
                    last_x, last_y = last_position
                    if 0 <= last_x < self.rows and 0 <= last_y < self.cols:
                        frame[last_x, last_y] = 1  # Keep previous foot planted
            
            frames.append({
                "timestamp": int(time.time() * 1000),
                "frame": frame.tolist()
            })
            
            # Update last position if this was a proper step (not a pause)
            if movement.duration < 0.4:  # Only update for actual steps
                last_position = movement.position
            
            # Adjust sleep duration based on speed multiplier and playback state
            if self.playback.state == PlaybackState.PLAYING:
                adjusted_sleep = movement.duration / self.playback.speed_multiplier
                time.sleep(adjusted_sleep)
            else:  # PAUSED
                time.sleep(0.1)
            
        return frames

    def run_simulation(self, mqtt_broker: str, mqtt_port: int, scenario: str):
        """Run simulation and publish to MQTT."""
        client = mqtt.Client()
        visualizer = SensorVisualizer(self.rows, self.cols, scenario)
        
        try:
            client.connect(mqtt_broker, mqtt_port, 60)
            visualizer.start()
            
            config_path = Path(__file__).parent.parent.parent / 'config' / 'config.yaml'
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            while True:  # Main simulation loop
                frames = self.simulate_scenario(scenario)
                self.playback.reset(len(frames))
                
                frame_index = 0
                while frame_index < len(frames):
                    if self.playback.state == PlaybackState.PLAYING:
                        frame_data = frames[frame_index]
                        client.publish(config['mqtt']['raw_data_topic'], 
                                     json.dumps(frame_data))
                        
                        # Update visualizer with enhanced state information
                        visualizer.update(
                            frame_data=frame_data,
                            playback_state=self.playback,
                            movement_info=self.movement_tracker,
                            total_frames=len(frames)
                        )
                        
                        # Adjust sleep based on speed multiplier
                        base_duration = 0.1  # Base frame duration
                        adjusted_sleep = base_duration / self.playback.speed_multiplier
                        time.sleep(adjusted_sleep)
                        
                        frame_index += 1
                        self.playback.update_frame(frame_index == len(frames))
                    
                    # Handle user input
                    key = visualizer.get_key()
                    if key == ' ':  # Space bar
                        self.playback.toggle_pause()
                    elif key == '+':
                        self.playback.adjust_speed(0.1)
                        visualizer.show_message(f"Speed: {self.playback.speed_multiplier:.1f}x")
                    elif key == '-':
                        self.playback.adjust_speed(-0.1)
                        visualizer.show_message(f"Speed: {self.playback.speed_multiplier:.1f}x")
                    elif key == '0':
                        self.playback.speed_multiplier = 1.0
                        visualizer.show_message("Speed reset to 1.0x")
                    elif key == 'n' and self.playback.state == PlaybackState.PAUSED:
                        if frame_index < len(frames):
                            frame_index += 1
                    elif key == 'r':
                        frame_index = 0
                        self.playback.reset(len(frames))
                        visualizer.show_message("Replaying scenario...")
                    elif key == 'q':
                        return
                    
                    if self.playback.state == PlaybackState.PAUSED:
                        time.sleep(0.1)  # Reduce CPU usage while paused
                    
                visualizer.show_message("Press 'r' to replay, 'q' to quit")
                
        except KeyboardInterrupt:
            print("\nSimulation stopped by user")
        except Exception as e:
            print(f"Simulation error: {e}")
        finally:
            visualizer.stop()
            try:
                client.disconnect()
            except:
                pass

    def list_scenarios(self):
        """Print available scenarios with descriptions."""
        print("\nAvailable Scenarios:")
        print("-" * 50)
        for name, scenario in self.scenarios.items():
            print(f"\n{name}:")
            print(f"  {scenario.description}")
        print("\n")

class SensorVisualizer:
    def __init__(self, rows: int, cols: int, scenario_name: str):
        self.orig_rows = rows
        self.orig_cols = cols
        self.scenario_name = scenario_name
        self.stdscr = None
        self.scale = 1.0
        
    def start(self):
        """Initialize the curses visualization with auto-scaling."""
        try:
            self.stdscr = curses.initscr()
            curses.start_color()
            
            # Initialize color pairs
            curses.init_pair(1, curses.COLOR_RED, curses.COLOR_RED)    # Active sensors
            curses.init_pair(2, curses.COLOR_WHITE, curses.COLOR_BLACK)     # Grid/borders
            curses.init_pair(3, curses.COLOR_GREEN, curses.COLOR_BLACK)    # Status: Normal
            curses.init_pair(4, curses.COLOR_YELLOW, curses.COLOR_BLACK)   # Status: Warning
            curses.init_pair(5, curses.COLOR_RED, curses.COLOR_BLACK)      # Status: Critical
            curses.init_pair(6, curses.COLOR_CYAN, curses.COLOR_BLACK)     # Progress
            curses.init_pair(7, curses.COLOR_MAGENTA, curses.COLOR_BLACK)  # Highlights
            
            curses.noecho()
            curses.cbreak()
            self.stdscr.keypad(True)
            self.stdscr.nodelay(1)
            
            # Get terminal size
            term_rows, term_cols = self.stdscr.getmaxyx()
            
            # Calculate scaling factor
            rows_scale = (term_rows - 8) / self.orig_rows  # More space for status bars
            cols_scale = (term_cols - 6) / (self.orig_cols * 2)
            self.scale = min(rows_scale, cols_scale, 1.0)
            
            # Calculate scaled dimensions
            self.rows = max(10, int(self.orig_rows * self.scale))
            self.cols = max(20, int(self.orig_cols * self.scale))
            
        except Exception as e:
            if self.stdscr:
                self.stop()
            print(f"Failed to initialize visualization: {e}")
            sys.exit(1)

    def update(self, frame_data: dict, playback_state: PlaybackController, 
               movement_info: MovementTracker, total_frames: int):
        """Update visualization with enhanced state information."""
        try:
            if not self.stdscr:
                return
                
            self.stdscr.clear()
            frame = np.array(frame_data["frame"])
            
            # Draw header with scenario info
            self._draw_header(playback_state)
            
            # Draw main sensor grid
            self._draw_sensor_grid(frame)
            
            # Draw border (after grid but before status)
            self.draw_border()
            
            # Draw status bars
            self._draw_status_bars(playback_state, movement_info, total_frames)
            
            # Draw controls legend
            self._draw_controls()
            
            self.stdscr.refresh()
            
        except Exception as e:
            self.stop()
            print(f"Visualization error: {e}")
            sys.exit(1)

    def _draw_header(self, playback_state: PlaybackController):
        """Draw header with scenario and playback information."""
        status_color = curses.color_pair(3)  # Normal state
        if playback_state.state == PlaybackState.PAUSED:
            status_color = curses.color_pair(5)  # Paused state
        
        title = f" Scenario: {self.scenario_name} "
        speed = f"Speed: {playback_state.speed_multiplier:.1f}x"
        elapsed = time.strftime("%M:%S", time.gmtime(playback_state.elapsed_time))
        status = "⏸️ PAUSED" if playback_state.state == PlaybackState.PAUSED else "▶️ PLAYING"
        
        header = f"{title} | {speed} | Time: {elapsed} | {status}"
        self.stdscr.addstr(0, 0, header, status_color | curses.A_BOLD)

    def _draw_status_bars(self, playback_state: PlaybackController, 
                         movement_info: MovementTracker, total_frames: int):
        """Draw progress and status bars."""
        # Progress bar
        progress = playback_state.frame_index / total_frames
        bar_width = 40
        filled = int(bar_width * progress)
        progress_bar = f"[{'='*filled}{'-'*(bar_width-filled)}] {progress*100:.0f}%"
        
        # Movement info
        direction = movement_info.current_direction.symbol if movement_info.current_direction else "·"
        speed = f"{movement_info.current_speed:.1f}"
        
        status_line = f"Progress: {progress_bar} | Direction: {direction} | Speed: {speed} units/s"
        self.stdscr.addstr(self.rows + 3, 0, status_line, curses.color_pair(6))

    def _draw_controls(self):
        """Draw controls legend."""
        controls = (
            "Controls: Space: ⏯️  | +/-: 🕒 | R: 🔄 | N: ⏭️  | Q: ❌"
        )
        self.stdscr.addstr(self.rows + 5, 0, controls, curses.color_pair(4))
    
    def draw_border(self):
        """Draw a border around the visualization area."""
        try:
            # Characters for border
            ULCORNER = '╔'
            LLCORNER = '╚'
            URCORNER = '╗'
            LRCORNER = '╝'
            HORIZONTAL = '═'
            VERTICAL = '║'
            
            # Draw corners
            self.stdscr.addstr(1, 2, ULCORNER, curses.color_pair(2))
            self.stdscr.addstr(self.rows + 2, 2, LLCORNER, curses.color_pair(2))
            self.stdscr.addstr(1, self.cols * 2 + 3, URCORNER, curses.color_pair(2))
            self.stdscr.addstr(self.rows + 2, self.cols * 2 + 3, LRCORNER, curses.color_pair(2))
            
            # Draw horizontal borders
            for j in range(3, self.cols * 2 + 3):
                self.stdscr.addstr(1, j, HORIZONTAL, curses.color_pair(2))
                self.stdscr.addstr(self.rows + 2, j, HORIZONTAL, curses.color_pair(2))
            
            # Draw vertical borders
            for i in range(2, self.rows + 2):
                self.stdscr.addstr(i, 2, VERTICAL, curses.color_pair(2))
                self.stdscr.addstr(i, self.cols * 2 + 3, VERTICAL, curses.color_pair(2))
                
        except curses.error:
            pass

    def _downsample_frame(self, frame: np.ndarray, target_shape: Tuple[int, int]) -> np.ndarray:
        """Downsample frame to target shape while preserving active sensors."""
        if frame.shape == target_shape:
            return frame
            
        rows_scale = frame.shape[0] / target_shape[0]
        cols_scale = frame.shape[1] / target_shape[1]
        
        downsampled = np.zeros(target_shape, dtype=int)
        
        for i in range(target_shape[0]):
            for j in range(target_shape[1]):
                row_start = int(i * rows_scale)
                row_end = int((i + 1) * rows_scale)
                col_start = int(j * cols_scale)
                col_end = int((j + 1) * cols_scale)
                
                region = frame[row_start:row_end+1, col_start:col_end+1]
                downsampled[i, j] = 1 if np.any(region == 1) else 0
        
        return downsampled
        
    def _draw_sensor_grid(self, frame: np.ndarray):
        """Draw the sensor grid with active sensors highlighted."""
        try:
            # Downsample frame if needed
            if frame.shape != (self.rows, self.cols):
                frame = self._downsample_frame(frame, (self.rows, self.cols))
            
            # Draw sensor grid
            for i in range(self.rows):
                for j in range(self.cols):
                    if frame[i, j]:
                        char = '  '  # Full block for active sensors
                        color = curses.color_pair(1) | curses.A_BOLD
                    else:
                        char = '· '  # Dots for inactive sensors
                        color = curses.color_pair(2)
                    try:
                        self.stdscr.addstr(i + 2, j * 2 + 3, char, color)
                    except curses.error:
                        pass
                    
        except curses.error:
            pass
            
    def get_key(self) -> Optional[str]:
        """Get a keypress from the user."""
        try:
            key = self.stdscr.getch()
            if key == -1:
                return None
            return chr(key)
        except:
            return None
            
    def show_message(self, message: str):
        """Show a message at the bottom of the screen."""
        try:
            self.stdscr.addstr(self.rows + 6, 0, message.ljust(self.cols * 2), 
                             curses.color_pair(7))
            self.stdscr.refresh()
        except curses.error:
            pass
        
    def stop(self):
        """Clean up and close the visualization."""
        if self.stdscr:
            try:
                curses.nocbreak()
                self.stdscr.keypad(False)
                curses.echo()
                curses.endwin()
            except:
                pass
            self.stdscr = None

if __name__ == "__main__":
    simulator = FloorSensorSimulator(12, 12)
    simulator.list_scenarios()
    print("Run with: python scripts/run_simulator.py --scenario <scenario_name>")