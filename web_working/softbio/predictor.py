from __future__ import annotations
import argparse
import json
import time
from typing import Dict, Any, List

import numpy as np

try:
    import paho.mqtt.client as mqtt
except Exception as e:
    mqtt = None  # allow import without paho for editors

from .feature_extractor import GaitFeatureExtractor
from .baseline_model import SoftBioBaseline
from .types import ActorFeatures

def load_cfg(path: str) -> Dict:
    import yaml
    with open(path, 'r') as f:
        full = yaml.safe_load(f)
    return full['softbio']

def _decode_frame(payload: Dict[str, Any]) -> np.ndarray:
    """Decode an incoming frame into a boolean HxW numpy array.

    Supported forms (agent may extend):
    - {'shape':[H,W], 'data': [[0/1,...],[...], ...]}
    - {'H':H, 'W':W, 'flat': '010010...'}  # string of 0/1 of length H*W
    - {'H':H, 'W':W, 'indices': [[y,x], ...]}  # list of active cells
    """
    if 'data' in payload and 'shape' in payload:
        H,W = payload['shape']
        arr = np.array(payload['data'], dtype=bool)
        assert arr.shape == (H,W)
        return arr
    if 'flat' in payload and 'H' in payload and 'W' in payload:
        H,W = int(payload['H']), int(payload['W'])
        s = payload['flat']
        assert len(s) == H*W
        arr = np.frombuffer(s.encode('ascii'), dtype='S1') != b'0'
        return arr.reshape((H,W))
    if 'indices' in payload and 'H' in payload and 'W' in payload:
        H,W = int(payload['H']), int(payload['W'])
        arr = np.zeros((H,W), dtype=bool)
        for y,x in payload['indices']:
            arr[int(y), int(x)] = True
        return arr
    raise ValueError('Unknown frame format')

class PredictorService:
    def __init__(self, cfg_path: str):
        self.cfg = load_cfg(cfg_path)
        g = self.cfg['grid']
        self.extractor = GaitFeatureExtractor(
            grid_w=int(g['width']), grid_h=int(g['height']), cell_m=float(g['cell_meters']), cfg=self.cfg
        )
        self.model = SoftBioBaseline(cfg=self.cfg)
        self.input_topic = self.cfg['input_topic']
        self.output_topic = self.cfg['output_topic']
        self.debug_topic = self.cfg['debug_topic']
        self.publish_interval = float(self.cfg.get('publish_interval_ms', 500))/1000.0
        self._last_pub: Dict[str, float] = {}

        if mqtt is None:
            raise RuntimeError("paho-mqtt not installed. `pip install paho-mqtt`")
        self.client = mqtt.Client()
        # Agent: set broker params from your existing env/config
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        client.subscribe(self.input_topic, qos=0)

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            frame = _decode_frame(payload)
            t = payload.get('ts', time.time())
            actors: List[ActorFeatures] = self.extractor.ingest_frame(frame, t)
            for af in actors:
                last = self._last_pub.get(af.track_id, 0.0)
                if time.time() - last < self.publish_interval:
                    continue
                pred = self.model.predict(af).to_dict()
                out = {
                    "ts": time.strftime('%Y-%m-%dT%H:%M:%S.', time.gmtime()) + f"{int((time.time()%1)*1000):03d}Z",
                    "track_id": af.track_id,
                    "pred": pred,
                    "features": {
                        "cadence_spm": af.cadence_spm,
                        "speed_mps": af.speed_mps,
                        "step_cv": af.step_cv,
                        "step_len_cv": af.step_len_cv,
                    }
                }
                self.client.publish(self.output_topic, json.dumps(out))
                self._last_pub[af.track_id] = time.time()
        except Exception as e:
            # minimal logging; agent: route to your logger
            err = {"error": str(e)}
            self.client.publish(self.debug_topic, json.dumps(err))

    def run(self, host=None, port=None, keepalive=None):
        # Use config values if not provided via CLI
        mqtt_cfg = self.cfg.get('mqtt', {})
        host = host or mqtt_cfg.get('host', 'localhost')
        port = port or mqtt_cfg.get('port', 1883)
        keepalive = keepalive or mqtt_cfg.get('keepalive', 60)

        print(f"Connecting to MQTT broker at {host}:{port}")
        self.client.connect(host, port, keepalive)
        self.client.loop_forever()

def main():
    ap = argparse.ArgumentParser(description="Soft Biometrics Predictor (MQTT→MQTT)")
    ap.add_argument("--config", default="softbio/config/softbio.yaml")
    ap.add_argument("--host", default=None)
    ap.add_argument("--port", type=int, default=None)
    args = ap.parse_args()

    srv = PredictorService(cfg_path=args.config)
    srv.run(host=args.host, port=args.port)

if __name__ == "__main__":
    main()
