"""
Session cache for tracking active PT sessions.
"""
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Global cache mapping patient IDs to session IDs
# Structure: {patient_id: session_id}
_active_sessions: Dict[int, int] = {}

def register_session(patient_id: int, session_id: int) -> None:
    """
    Register an active session for a patient.
    
    Args:
        patient_id: ID of the patient
        session_id: ID of the active session
    """
    global _active_sessions
    _active_sessions[patient_id] = session_id
    logger.info(f"Registered session {session_id} for patient {patient_id}")

def end_session(patient_id: int) -> None:
    """
    End the active session for a patient.
    
    Args:
        patient_id: ID of the patient
    """
    global _active_sessions
    if patient_id in _active_sessions:
        session_id = _active_sessions.pop(patient_id)
        logger.info(f"Ended session {session_id} for patient {patient_id}")
    else:
        logger.warning(f"No active session found for patient {patient_id}")

def get_session_id(data: dict) -> Optional[int]:
    """
    Get the active session ID from the metric data.
    
    This function tries to determine the session ID using:
    1. Direct 'session_id' field if present
    2. Lookup via 'patient_id' field if present
    3. Lookup using other identifying information
    
    Args:
        data: Metric data containing identifying information
        
    Returns:
        Session ID if found, None otherwise
    """
    global _active_sessions
    
    # Check if session_id is directly provided
    if 'session_id' in data:
        return data['session_id']
    
    # Check if patient_id is provided and has an active session
    if 'patient_id' in data and data['patient_id'] in _active_sessions:
        return _active_sessions[data['patient_id']]
    
    # Try to match on patient_id if it's nested
    if 'patient' in data and 'id' in data['patient']:
        patient_id = data['patient']['id']
        if patient_id in _active_sessions:
            return _active_sessions[patient_id]
    
    # If we can't determine the session, log a warning
    logger.warning(f"Could not determine session ID from data: {data}")
    return None

def get_all_active_sessions() -> Dict[int, int]:
    """
    Get all active sessions.
    
    Returns:
        Dictionary mapping patient IDs to session IDs
    """
    return _active_sessions.copy() 