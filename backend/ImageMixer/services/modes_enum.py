from enum import Enum


class Mode(Enum):
    MAGNITUDE = "Magnitude"
    PHASE = "Phase"
    REAL = "Real"
    IMAGINARY = "Imaginary"
    MAGNITUDE_PHASE = "Magnitude / Phase"
    REAL_IMAGINARY = "Real / Imaginary"


class RegionMode(Enum):
    OUTER = "outer"
    INNER = "inner"
    FULL = "full"

