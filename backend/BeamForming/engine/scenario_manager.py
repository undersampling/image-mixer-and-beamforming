import json
import shutil
from pathlib import Path
from typing import Dict, List, Optional
from .simulator import BeamformingSimulator

class ScenarioManager:
    """Manages scenario files with defaults and current copies."""
    
    def __init__(self):
        """Initialize scenario manager with directory paths."""
        engine_dir = Path(__file__).parent
        simulator_dir = engine_dir.parent
        project_dir = simulator_dir.parent
        
        self._defaults_dir = simulator_dir / 'scenarios' / 'defaults'
        self._current_dir = simulator_dir / 'scenarios' / 'current'
        
        self._defaults_dir.mkdir(parents=True, exist_ok=True)
        self._current_dir.mkdir(parents=True, exist_ok=True)
        
        self._ensure_current_exists()
    
    def _ensure_current_exists(self) -> None:
        """Copy defaults to current if current has no JSON files."""
        current_json_files = list(self._current_dir.glob('*.json'))
        
        if not current_json_files:
            for default_file in self._defaults_dir.glob('*.json'):
                shutil.copy2(default_file, self._current_dir / default_file.name)
    
    def _validate_scenario(self, data: dict) -> bool:
        """Validate scenario data structure."""
        required_fields = ['id', 'name', 'medium', 'arrays']
        for field in required_fields:
            if field not in data:
                return False
        return True
    
    def get_scenario_list(self) -> List[Dict]:
        """Get list of available scenarios."""
        scenarios = []
        for json_file in self._current_dir.glob('*.json'):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    scenarios.append({
                        'id': data.get('id', json_file.stem),
                        'name': data.get('name', 'Unnamed Scenario'),
                        'description': data.get('description', ''),
                        'category': data.get('category', 'general'),
                    })
            except (json.JSONDecodeError, IOError):
                continue
        return scenarios
    
    def load_scenario(self, scenario_id: str) -> Dict:
        """Load scenario from current directory."""
        scenario_file = self._current_dir / f"{scenario_id}.json"
        
        if not scenario_file.exists():
            raise FileNotFoundError(f"Scenario '{scenario_id}' not found")
        
        with open(scenario_file, 'r') as f:
            return json.load(f)
    
    def save_scenario(self, scenario_id: str, config: dict) -> bool:
        """Save scenario to current directory."""
        if not self._validate_scenario(config):
            return False
        
        scenario_file = self._current_dir / f"{scenario_id}.json"
        
        with open(scenario_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        return True
    
    def reset_scenario(self, scenario_id: str) -> Dict:
        """Reset scenario to default."""
        default_file = self._defaults_dir / f"{scenario_id}.json"
        current_file = self._current_dir / f"{scenario_id}.json"
        
        if not default_file.exists():
            raise FileNotFoundError(f"Default scenario '{scenario_id}' not found")
        
        # Copy default to current
        shutil.copy2(default_file, current_file)
        
        # Return the reset config
        with open(current_file, 'r') as f:
            return json.load(f)
    
    def reset_all_scenarios(self) -> bool:
        """Reset all scenarios to defaults."""
        try:
            for current_file in self._current_dir.glob('*.json'):
                current_file.unlink()
            
            for default_file in self._defaults_dir.glob('*.json'):
                shutil.copy2(default_file, self._current_dir / default_file.name)
            
            return True
        except Exception:
            return False
    
    def create_simulator(self, scenario_id: str) -> BeamformingSimulator:
        """Load scenario and create configured simulator."""
        config = self.load_scenario(scenario_id)
        return BeamformingSimulator(config)