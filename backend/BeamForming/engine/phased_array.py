"""
PhasedArray class - Single phased array unit with full encapsulation.
"""
import numpy as np
from typing import List, Dict, Optional
from math import sin, cos, radians, sqrt


class PhasedArray:
    """Represents a single phased array antenna with configurable geometry."""
    
    def __init__(self, config: dict, medium_speed: float):
        """
        Initialize phased array from configuration.
        
        Args:
            config: Dictionary containing array configuration
            medium_speed: Speed of sound/wave in medium (m/s)
        """
        self._medium_speed = medium_speed
        self._validate_config(config)
        self._set_attributes(config)
        self._calculate_wavelengths()
        self._calculate_element_positions()
        self._calculate_phases()
    
    def _validate_config(self, config: dict) -> None:
        """Validate configuration and raise ValueError if invalid."""
        required_fields = ['id', 'name', 'type', 'num_elements', 'element_spacing', 
                          'frequencies', 'position', 'rotation']
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
        
        if config['type'] not in ['linear', 'curved']:
            raise ValueError("Array type must be 'linear' or 'curved'")
        
        if config['num_elements'] < 2:
            raise ValueError("Array must have at least 2 elements")
        
        if config['type'] == 'curved':
            if 'curvature_radius' not in config or 'arc_angle' not in config:
                raise ValueError("Curved arrays require curvature_radius and arc_angle")
    
    def _set_attributes(self, config: dict) -> None:
        """Set all attributes from config."""
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
        """Calculate wavelengths and wave numbers for all frequencies."""
        self._wavelengths = [self._medium_speed / f for f in self._frequencies]
        self._wave_numbers = [2 * np.pi / lam for lam in self._wavelengths]
    
    def _calculate_element_positions(self) -> None:
        """Calculate positions of all array elements."""
        positions = np.zeros((self._num_elements, 2))
        
        if self._array_type == 'linear':
            # Linear array along x-axis
            for i in range(self._num_elements):
                x_local = (i - (self._num_elements - 1) / 2) * self._element_spacing
                positions[i] = [x_local, 0.0]
        
        elif self._array_type == 'curved':
            # Curved array - arc from -arc_angle/2 to +arc_angle/2
            arc_rad = radians(self._arc_angle)
            for i in range(self._num_elements):
                angle_local = (i / (self._num_elements - 1) - 0.5) * arc_rad
                x_local = self._curvature_radius * sin(angle_local)
                y_local = self._curvature_radius * (1 - cos(angle_local))
                positions[i] = [x_local, y_local]
        
        # Apply rotation
        if self._rotation != 0:
            rot_rad = radians(self._rotation)
            cos_r = cos(rot_rad)
            sin_r = sin(rot_rad)
            rotation_matrix = np.array([[cos_r, -sin_r], [sin_r, cos_r]])
            positions = positions @ rotation_matrix.T
        
        # Apply translation
        positions[:, 0] += self._position['x']
        positions[:, 1] += self._position['y']
        
        self._element_positions = positions
    
    def _calculate_phases(self) -> None:
        """Calculate phase shifts for all elements."""
        if self._focus_point is not None:
            self._calculate_phases_for_focus()
        else:
            self._calculate_phases_for_steering()
        
        # Set uniform amplitudes (can be extended for tapering)
        self._element_amplitudes = np.ones(self._num_elements)
    
    def _calculate_phases_for_steering(self) -> None:
        """Calculate phases for beam steering."""
        # Use first frequency for phase calculation (or average if multiple)
        k = self._wave_numbers[0]
        steering_rad = radians(self._steering_angle)
        
        # Phase shift for steering: φ_n = -k * x_n * sin(θ)
        x_positions = self._element_positions[:, 0]
        self._element_phases = -k * x_positions * sin(steering_rad)
    
    def _calculate_phases_for_focus(self) -> None:
        """Calculate phases for focusing at a point."""
        k = self._wave_numbers[0]
        focus_x = self._focus_point['x']
        focus_y = self._focus_point['y']
        
        # Phase shift for focusing: φ_n = -k * distance_to_focus
        distances = np.sqrt(
            (self._element_positions[:, 0] - focus_x) ** 2 +
            (self._element_positions[:, 1] - focus_y) ** 2
        )
        self._element_phases = -k * distances
    
    def get_field_at_point(self, x: float, y: float) -> complex:
        """
        Calculate total field at a point from all elements.
        
        Args:
            x, y: Coordinates of point (meters)
        
        Returns:
            Complex field value
        """
        # Use first frequency (or combine for multi-frequency)
        k = self._wave_numbers[0]
        wavelength = self._wavelengths[0]
        
        total_field = 0.0 + 0.0j
        
        for i in range(self._num_elements):
            elem_x = self._element_positions[i, 0]
            elem_y = self._element_positions[i, 1]
            
            # Distance from element to point
            distance = sqrt((x - elem_x) ** 2 + (y - elem_y) ** 2)
            
            # Spherical wave: exp(j*(k*r - phase)) / r
            phase = k * distance + self._element_phases[i]
            amplitude = self._element_amplitudes[i] / (1.0 + distance)  # Attenuation
            
            total_field += amplitude * np.exp(1j * phase)
        
        return total_field
    
    def get_array_factor(self, angles: np.ndarray) -> np.ndarray:
        """
        Calculate array factor (beam pattern) for given angles.
        
        Args:
            angles: Array of angles in radians
        
        Returns:
            Array factor magnitude
        """
        k = self._wave_numbers[0]
        pattern = np.zeros(len(angles), dtype=complex)
        
        for i in range(self._num_elements):
            x_elem = self._element_positions[i, 0]
            phase_shift = k * x_elem * np.sin(angles) + self._element_phases[i]
            pattern += self._element_amplitudes[i] * np.exp(1j * phase_shift)
        
        return np.abs(pattern)
    
    def get_element_positions(self) -> np.ndarray:
        """Return copy of element positions."""
        return self._element_positions.copy()
    
    def update_steering_angle(self, angle: float) -> None:
        """Update steering angle and recalculate phases."""
        self._steering_angle = angle
        if self._focus_point is None:
            self._calculate_phases_for_steering()
    
    def update_focus_point(self, x: float, y: float) -> None:
        """Update focus point and recalculate phases."""
        self._focus_point = {'x': x, 'y': y}
        self._calculate_phases_for_focus()
    
    def update_frequencies(self, frequencies: List[float]) -> None:
        """Update frequencies and recalculate wavelengths."""
        self._frequencies = frequencies if isinstance(frequencies, list) else [frequencies]
        self._calculate_wavelengths()
        self._calculate_phases()
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            'id': self._id,
            'name': self._name,
            'type': self._array_type,
            'num_elements': self._num_elements,
            'element_spacing': self._element_spacing,
            'curvature_radius': self._curvature_radius if self._array_type == 'curved' else None,
            'arc_angle': self._arc_angle if self._array_type == 'curved' else None,
            'frequencies': self._frequencies,
            'position': self._position,
            'rotation': self._rotation,
            'steering_angle': self._steering_angle,
            'focus_point': self._focus_point,
        }
    
    @classmethod
    def from_dict(cls, data: dict, medium_speed: float) -> 'PhasedArray':
        """Create instance from dictionary."""
        return cls(data, medium_speed)
    
    # Properties
    @property
    def id(self) -> str:
        return self._id
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def num_elements(self) -> int:
        return self._num_elements
    
    @property
    def frequencies(self) -> List[float]:
        return self._frequencies.copy()
    
    @property
    def array_type(self) -> str:
        return self._array_type

