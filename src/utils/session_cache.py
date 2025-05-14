"""
Session cache for tracking active PT sessions.
"""
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SessionCache:
    """Singleton class for caching active sessions."""
    _instance = None
    _active_sessions: Dict[int, int] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionCache, cls).__new__(cls)
        return cls._instance
    
    def set_session_id(self, patient_id: int, session_id: int) -> None:
        """
        Register an active session for a patient.
        
        Args:
            patient_id: ID of the patient
            session_id: ID of the active session
        """
        self._active_sessions[patient_id] = session_id
        logger.info(f"Registered session {session_id} for patient {patient_id}")

    def end_session(self, patient_id: int) -> None:
        """
        End the active session for a patient.
        
        Args:
            patient_id: ID of the patient
        """
        if patient_id in self._active_sessions:
            session_id = self._active_sessions.pop(patient_id)
            logger.info(f"Ended session {session_id} for patient {patient_id}")
        else:
            logger.warning(f"No active session found for patient {patient_id}")

    def get_session_id(self, data: dict) -> Optional[int]:
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
        # Check if session_id is directly provided
        if 'session_id' in data:
            return data['session_id']
        
        # Check if patient_id is provided and has an active session
        if 'patient_id' in data and data['patient_id'] in self._active_sessions:
            return self._active_sessions[data['patient_id']]
        
        # Try to match on patient_id if it's nested
        if 'patient' in data and 'id' in data['patient']:
            patient_id = data['patient']['id']
            if patient_id in self._active_sessions:
                return self._active_sessions[patient_id]
        
        # If we can't determine the session, log a warning
        logger.warning(f"Could not determine session ID from data: {data}")
        return None

    def get_all_active_sessions(self) -> Dict[int, int]:
        """
        Get all active sessions.
        
        Returns:
            Dictionary mapping patient IDs to session IDs
        """
        return self._active_sessions.copy()
    
    def reset(self) -> None:
        """Reset the session cache (for testing)."""
        self._active_sessions.clear()
        logger.info("Session cache reset") 