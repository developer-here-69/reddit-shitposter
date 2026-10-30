import pytest
from src.human_motion import _cubic_bezier, HumanAgent
from src.browser_poster import PROFILES_DIR, SESSIONS_DIR

def test_cubic_bezier_endpoints():
    assert _cubic_bezier(0, 10, 20, 100, 0.0) == 0.0
    assert _cubic_bezier(0, 10, 20, 100, 1.0) == 100.0

def test_cubic_bezier_midpoint():
    val = _cubic_bezier(0, 50, 50, 100, 0.5)
    assert 40 < val < 60

def test_directories_exist():
    assert PROFILES_DIR.exists()
    assert SESSIONS_DIR.exists()
