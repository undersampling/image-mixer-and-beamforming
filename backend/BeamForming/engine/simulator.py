"""
BeamformingSimulator class - Optimized for Real-Time and Web APIs
"""
import numpy as np
from typing import Dict, List, Optional, Any
from .phased_array import PhasedArray

class BeamformingSimulator:
    """Main simulator managing multiple phased arrays and calculations."""
    
    # Media speeds (m/s)
    MEDIA_SPEEDS = {
        'air': 343,
        'water': 1480,
        'soft_tissue': 1540,
        'muscle': 1580,
        'fat': 1450,
        'bone': 3500,
    }
    
    def __init__(self, config: dict = None):
        """
        Initialize simulator.
        Args:
            config: Optional configuration dictionary
        """
        self._arrays: Dict[str, PhasedArray] = {}
        self._medium = {'name': 'air', 'speed': 343}
        self._visualization = {
            'x_range': [-1, 1],
            'y_range': [0, 2],
            'resolution': 100
        }
        self._is_dirty = True
        self._cached_results = None
        
        if config:
            self._load_from_config(config)
    
    def _load_from_config(self, config: dict) -> None:
        """Load configuration into simulator."""
        if 'medium' in config:
            self.set_medium(config['medium'].get('name', 'air'),
                          config['medium'].get('speed'))
        
        if 'visualization' in config:
            viz = config['visualization']
            self.set_visualization_params(
                viz.get('x_range', [-1, 1]),
                viz.get('y_range', [0, 2]),
                viz.get('resolution', 100)
            )
        
        if 'arrays' in config:
            for array_config in config['arrays']:
                self.add_array(array_config)
    
    def _get_medium_speed(self, medium_name: str) -> float:
        """Get speed for known medium."""
        return self.MEDIA_SPEEDS.get(medium_name, self.MEDIA_SPEEDS['air'])
    
    def _calculate_interference_map(self) -> Dict:
        """Vectorized calculation of interference map (field intensity over space)."""
        x_min, x_max = self._visualization['x_range']
        y_min, y_max = self._visualization['y_range']
        resolution = self._visualization['resolution']
        
        # Generate Grid using float32 for performance
        x_coords = np.linspace(x_min, x_max, resolution, dtype=np.float32)
        y_coords = np.linspace(y_min, y_max, resolution, dtype=np.float32)
        X, Y = np.meshgrid(x_coords, y_coords)
        
        # Initialize total field map (complex)
        total_field_map = np.zeros_like(X, dtype=np.complex64)
        
        # Sum fields from all arrays
        for array in self._arrays.values():
            # PASS THE FULL GRID TO THE ARRAY
            total_field_map += array.get_field_at_points(X, Y)
        
        # Convert to intensity (magnitude squared)
        intensity_map = np.abs(total_field_map) ** 2
        
        return {
            'map': intensity_map.tolist(), # Convert to Python list for JSON
            'x_coords': x_coords.tolist(),
            'y_coords': y_coords.tolist(),
        }
    
    def _calculate_beam_profiles(self) -> Dict:
        """Vectorized calculation of beam profiles."""
        # Create angles array
        angles = np.linspace(-np.pi/2, np.pi/2, 181, dtype=np.float32)
        angles_deg = np.degrees(angles)
        
        individual_patterns = {}
        
        # FIX: Ensure combined pattern is FLOAT, not COMPLEX.
        # JSON cannot serialize complex numbers.
        combined_pattern = np.zeros(len(angles), dtype=np.float32)
        
        for array_id, array in self._arrays.items():
            # Use vectorized method
            pattern = array.get_array_factor_vectorized(angles)
            
            # Pattern is magnitude (abs), so it is already real/float.
            # Convert to list immediately for safety.
            individual_patterns[array_id] = pattern.tolist()
            
            combined_pattern += pattern
            
        return {
            'angles': angles_deg.tolist(),
            'individual': individual_patterns,
            'combined': combined_pattern.tolist(),
        }
    
    def _mark_dirty(self) -> None:
        """Mark simulator as needing recalculation."""
        self._is_dirty = True
        self._cached_results = None
    
    def add_array(self, config: dict) -> str:
        """Add a new array to the simulator."""
        medium_speed = self._medium['speed']
        array = PhasedArray(config, medium_speed)
        self._arrays[array.id] = array
        self._mark_dirty()
        return array.id
    
    def remove_array(self, array_id: str) -> bool:
        """Remove an array from the simulator."""
        if array_id in self._arrays:
            del self._arrays[array_id]
            self._mark_dirty()
            return True
        return False
    
    def update_array(self, array_id: str, updates: dict) -> bool:
        """Update array parameters."""
        if array_id not in self._arrays:
            return False
        
        # Remove old array and create new one with updated config
        old_array = self._arrays[array_id]
        old_config = old_array.to_dict()
        old_config.update(updates)
        
        medium_speed = self._medium['speed']
        self._arrays[array_id] = PhasedArray(old_config, medium_speed)
        self._mark_dirty()
        return True
    
    def set_medium(self, medium_name: str, custom_speed: float = None) -> None:
        """Set propagation medium."""
        if custom_speed is not None:
            speed = custom_speed
        else:
            speed = self._get_medium_speed(medium_name)
        
        self._medium = {'name': medium_name, 'speed': speed}
        
        # Update all arrays with new medium speed
        for array_id in self._arrays:
            array = self._arrays[array_id]
            config = array.to_dict()
            medium_speed = self._medium['speed']
            self._arrays[array_id] = PhasedArray(config, medium_speed)
        
        self._mark_dirty()
    
    def set_visualization_params(self, x_range: List[float], y_range: List[float], resolution: int) -> None:
        """Update visualization settings."""
        self._visualization = {
            'x_range': x_range,
            'y_range': y_range,
            'resolution': resolution
        }
        self._mark_dirty()
    
    def calculate(self) -> Dict:
        """Calculate all results (with caching)."""
        if not self._is_dirty and self._cached_results is not None:
            return self._cached_results
        
        if len(self._arrays) == 0:
            return {
                'interference_map': {'map': [], 'x_coords': [], 'y_coords': []},
                'beam_profiles': {'angles': [], 'individual': {}, 'combined': []},
                'array_positions': [],
            }
        
        interference_map = self._calculate_interference_map()
        beam_profiles = self._calculate_beam_profiles()
        
        # Get array positions
        array_positions = []
        for array_id, array in self._arrays.items():
            positions = array.get_element_positions()
            array_positions.append({
                'id': array_id,
                'positions': positions.tolist(),
            })
        
        results = {
            'interference_map': interference_map,
            'beam_profiles': beam_profiles,
            'array_positions': array_positions,
        }
        
        self._cached_results = results
        self._is_dirty = False
        return results
    
    def get_results(self) -> Dict:
        """Get cached results or calculate."""
        return self.calculate()
    
    def to_dict(self) -> dict:
        """Full serialization."""
        return {
            'medium': self._medium,
            'visualization': self._visualization,
            'arrays': [array.to_dict() for array in self._arrays.values()],
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'BeamformingSimulator':
        """Create simulator from dictionary."""
        return cls(data)