"""
Media Configuration - Single Source of Truth for propagation speeds.

This module centralizes all media/propagation definitions to follow DRY principle.
Both views.py and simulator.py should import from here.
"""

# Acoustic wave speeds (m/s) - for HIFU, ultrasound, sonar (medical applications)
ACOUSTIC_MEDIA = {
    'air': 343,           # Speed of sound in air
    'water': 1480,        # Speed of sound in water
    'soft_tissue': 1540,  # Average speed in human soft tissue
    'muscle': 1580,       # Speed in muscle tissue
    'fat': 1450,          # Speed in fat tissue
    'bone': 3500,         # Speed in bone
}

# Electromagnetic wave speeds (m/s) - for 5G, WiFi, Radar (wireless applications)
ELECTROMAGNETIC_MEDIA = {
    'air': 300000000,         # Speed of light
    'water': 33333333,        # ~c/9
    'soft_tissue': 40000000,  # ~c/7.5
    'muscle': 42857143,       # ~c/7
    'fat': 85714286,          # ~c/3.5
    'bone': 75000000,         # c/4
}

# Default media for each category
DEFAULT_CATEGORY = 'medical'  # acoustic speeds
DEFAULT_MEDIUM = 'air'

def get_media_list(category: str = 'medical') -> list:
    """
    Get list of media dictionaries for API response.
    
    Args:
        category: 'wireless' for electromagnetic, 'medical' for acoustic
    
    Returns:
        List of dicts with 'name' and 'speed' keys
    """
    if category == 'wireless':
        media_dict = ELECTROMAGNETIC_MEDIA
    else:
        media_dict = ACOUSTIC_MEDIA
    
    return [{'name': name, 'speed': speed} for name, speed in media_dict.items()]


def get_medium_speed(medium_name: str, category: str = 'medical') -> float:
    """
    Get speed for a specific medium.
    
    Args:
        medium_name: Name of the medium (air, water, soft_tissue, etc.)
        category: 'wireless' for electromagnetic, 'medical' for acoustic
    
    Returns:
        Speed in m/s
    """
    if category == 'wireless':
        media_dict = ELECTROMAGNETIC_MEDIA
    else:
        media_dict = ACOUSTIC_MEDIA
    
    # Return the speed, or default to air if not found
    return media_dict.get(medium_name, media_dict[DEFAULT_MEDIUM])


def get_media_speeds(category: str = 'medical') -> dict:
    """
    Get the full media speeds dictionary.
    
    Args:
        category: 'wireless' for electromagnetic, 'medical' for acoustic
    
    Returns:
        Dictionary mapping medium names to speeds
    """
    if category == 'wireless':
        return ELECTROMAGNETIC_MEDIA.copy()
    else:
        return ACOUSTIC_MEDIA.copy()
