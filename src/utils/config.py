import os
import yaml
from pathlib import Path

class Config:
    def __init__(self):
        self.config_dir = Path(__file__).parent.parent.parent / 'config'
        self.mode = os.getenv('MODE', 'default')
        self.data = {}
        self.load_configs()
        
    def load_configs(self):
        """Load all relevant configuration files based on mode."""
        # Load main config
        main_config_path = self.config_dir / 'config.yaml'
        if main_config_path.exists():
            with open(main_config_path, 'r') as f:
                self.data.update(yaml.safe_load(f))
        
        # Load mode-specific configs
        if self.mode == 'PT':
            pt_config_path = self.config_dir / 'pt_topics.yaml'
            if pt_config_path.exists():
                with open(pt_config_path, 'r') as f:
                    self.data.update(yaml.safe_load(f))
        
    def get(self, key, default=None):
        """Get a configuration value."""
        return self.data.get(key, default)
    
    def __getitem__(self, key):
        """Allow dictionary-like access to configuration."""
        return self.data[key]
    
    def __contains__(self, key):
        """Check if a key exists in the configuration."""
        return key in self.data

# Create a singleton instance
config = Config() 