import numpy as np
from typing import List, Dict, Optional
from math import sin, cos, radians

"""
PhasedArray class - Optimized for Vectorization
"""
class PhasedArray:
    """Represents a single phased array antenna with configurable geometry."""
    
    def __init__(self, config: dict, medium_speed: float):
        self._medium_speed = medium_speed
        self._validate_config(config)
        self._set_attributes(config)
        self._calculate_wavelengths()
        self._calculate_element_positions()
        self._calculate_phases()
    
    def _validate_config(self, config: dict) -> None:
        required_fields = ['id', 'name', 'type', 'num_elements', 'element_spacing', 
                          'frequencies', 'position', 'rotation']
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
    
    def _set_attributes(self, config: dict) -> None:
        self._id = config['id']
        self._name = config['name']
        self._array_type = config['type']
        self._num_elements = config['num_elements']
        self._element_spacing = config['element_spacing']
        self._curvature_radius = config.get('curvature_radius', 0.0)
        self._arc_angle = config.get('arc_angle', 0.0)
        self._frequencies = config['frequencies'] if isinstance(config['frequencies'], list) else [config['frequencies']]
        self._position = config['position']
        self._rotation = config.get('rotation', 0.0)
        self._steering_angle = config.get('steering_angle', 0.0)
        self._focus_point = config.get('focus_point', None)
    
    def _calculate_wavelengths(self) -> None:
        # Store as numpy array for speed
        self._wavelengths = np.array([self._medium_speed / f for f in self._frequencies], dtype=np.float32)
        self._wave_numbers = (2 * np.pi / self._wavelengths).astype(np.float32)
    
    def _calculate_element_positions(self) -> None:
        positions = np.zeros((self._num_elements, 2), dtype=np.float32)
        
        if self._array_type == 'linear':
            # Vectorized linear placement
            indices = np.arange(self._num_elements, dtype=np.float32)
            x_local = (indices - (self._num_elements - 1) / 2) * self._element_spacing
            positions[:, 0] = x_local
        
        elif self._array_type == 'curved':
            # Vectorized curved placement
            arc_rad = radians(self._arc_angle)
            indices = np.arange(self._num_elements, dtype=np.float32)
            angle_local = (indices / (self._num_elements - 1) - 0.5) * arc_rad
            positions[:, 0] = self._curvature_radius * np.sin(angle_local)
            positions[:, 1] = self._curvature_radius * (1 - np.cos(angle_local))
        
        # Apply rotation
        if self._rotation != 0:
            rot_rad = radians(self._rotation)
            cos_r, sin_r = cos(rot_rad), sin(rot_rad)
            rotation_matrix = np.array([[cos_r, -sin_r], [sin_r, cos_r]], dtype=np.float32)
            positions = positions @ rotation_matrix.T
        
        # Apply translation
        positions[:, 0] += self._position['x']
        positions[:, 1] += self._position['y']
        
        self._element_positions = positions
    
    def _calculate_phases(self) -> None:
        if self._focus_point is not None:
            self._calculate_phases_for_focus()
        else:
            self._calculate_phases_for_steering()
        
        self._element_amplitudes = np.ones(self._num_elements, dtype=np.float32)
    
    def _calculate_phases_for_steering(self) -> None:
        k = self._wave_numbers[0]
        steering_rad = radians(self._steering_angle)
        # Vectorized phase calc
        x_positions = self._element_positions[:, 0]
        self._element_phases = -k * x_positions * sin(steering_rad)
    
    def _calculate_phases_for_focus(self) -> None:
        k = self._wave_numbers[0]
        focus_x = self._focus_point['x']
        focus_y = self._focus_point['y']
        # Vectorized distance calc
        distances = np.sqrt(
            (self._element_positions[:, 0] - focus_x) ** 2 +
            (self._element_positions[:, 1] - focus_y) ** 2
        )
        self._element_phases = -k * distances

    # --- NEW OPTIMIZED METHODS ---

    def get_field_at_points(self, X: np.ndarray, Y: np.ndarray) -> np.ndarray:
        """
        Calculates field for the entire meshgrid X, Y simultaneously.
        """
        k = self._wave_numbers[0]
        
        # Reshape elements for broadcasting: [NumElements, 1, 1]
        elem_x = self._element_positions[:, 0].reshape(-1, 1, 1)
        elem_y = self._element_positions[:, 1].reshape(-1, 1, 1)
        phases = self._element_phases.reshape(-1, 1, 1)
        amplitudes = self._element_amplitudes.reshape(-1, 1, 1)
        
        # Reshape Grid for broadcasting: [1, Height, Width]
        grid_x = X[np.newaxis, :, :]
        grid_y = Y[np.newaxis, :, :]
        
        # Calculate Distances [NumElements, Height, Width]
        # This is the heavy lifting, done in C via NumPy
        dist_sq = (grid_x - elem_x)**2 + (grid_y - elem_y)**2
        distances = np.sqrt(dist_sq)
        
        # Calculate Phase term
        # NEGATIVE sign for proper beamforming: waves should converge constructively
        total_phase = -k * distances + phases
        
        # Calculate Amplitude with attenuation
        # Using 1/(1+r) to avoid division by zero at element location
        attn_amp = amplitudes / (1.0 + distances)
        
        # Sum contributions from all elements
        # exp(1j * phi) -> complex field
        field_contributions = attn_amp * np.exp(1j * total_phase)
        total_field = np.sum(field_contributions, axis=0)
        
        return total_field

    def get_array_factor_vectorized(self, angles: np.ndarray) -> np.ndarray:
        """
        Calculates array factor for all angles simultaneously.
        """
        k = self._wave_numbers[0]
        
        # Elements: [NumElements, 1]
        elem_x = self._element_positions[:, 0].reshape(-1, 1)
        phases = self._element_phases.reshape(-1, 1)
        amplitudes = self._element_amplitudes.reshape(-1, 1)
        
        # Angles: [1, NumAngles]
        angles_row = angles.reshape(1, -1)
        
        # Phase shifts [NumElements, NumAngles]
        phase_shifts = k * elem_x * np.sin(angles_row) + phases
        
        # Sum over elements
        field_sum = np.sum(amplitudes * np.exp(1j * phase_shifts), axis=0)
        
        return np.abs(field_sum)

    # Bridge method for compatibility (optional, purely if you still check single points)
    def get_field_at_point(self, x: float, y: float) -> complex:
        return self.get_field_at_points(np.array([[x]]), np.array([[y]]))[0,0]

    def to_dict(self) -> dict:
        return {
            'id': self._id,
            'name': self._name,
            'type': self._array_type,
            'num_elements': self._num_elements,
            'element_spacing': self._element_spacing,
            'curvature_radius': self._curvature_radius if self._array_type == 'curved' else None,
            'arc_angle': self._arc_angle if self._array_type == 'curved' else None,
            'frequencies': self._frequencies if isinstance(self._frequencies, list) else self._frequencies.tolist(),
            'position': self._position,
            'rotation': self._rotation,
            'steering_angle': self._steering_angle,
            'focus_point': self._focus_point,
        }

    # Properties need to return standard python types for JSON serialization usually
    @property
    def id(self) -> str: return self._id
    @property
    def name(self) -> str: return self._name
    @property
    def num_elements(self) -> int: return self._num_elements
    @property
    def array_type(self) -> str: return self._array_type
    def get_element_positions(self) -> np.ndarray: return self._element_positions.copy()
    def update_steering_angle(self, angle: float): 
        self._steering_angle = angle
        if self._focus_point is None: self._calculate_phases_for_steering()
    def update_focus_point(self, x, y):
        self._focus_point = {'x': x, 'y': y}
        self._calculate_phases_for_focus()
    def update_frequencies(self, freqs):
        self._frequencies = freqs
        self._calculate_wavelengths()
        self._calculate_phases()

