"""
Simple cron job scheduler for scheduled tasks.
"""
import asyncio
import functools
import inspect
import logging
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Storage for registered jobs
_jobs: Dict[str, Dict] = {}

def job(interval: str, day: Optional[int] = None, hour: Optional[int] = None, minute: Optional[int] = 0):
    """
    Decorator to register a function as a scheduled job.
    
    Args:
        interval: Interval to run the job ('daily', 'weekly', 'monthly')
        day: Day of month for monthly jobs, day of week (0-6, 0 is Monday) for weekly jobs
        hour: Hour of the day to run the job (0-23)
        minute: Minute of the hour to run the job (0-59)
    """
    def decorator(func):
        job_name = func.__name__
        _jobs[job_name] = {
            'func': func,
            'interval': interval,
            'day': day,
            'hour': hour,
            'minute': minute,
            'last_run': None
        }
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Just call the function
            if inspect.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)
            
        return wrapper
    
    return decorator

def should_run_now(job_config: Dict) -> bool:
    """
    Check if a job should run now based on its schedule.
    
    Args:
        job_config: Job configuration
        
    Returns:
        bool: True if the job should run now
    """
    now = datetime.now()
    last_run = job_config.get('last_run')
    interval = job_config.get('interval')
    
    # If never run, run it
    if last_run is None:
        return True
    
    # Check interval
    if interval == 'daily':
        # Check if it's been a day
        next_run = last_run.replace(
            hour=job_config.get('hour', 0),
            minute=job_config.get('minute', 0),
            second=0,
            microsecond=0
        ) + timedelta(days=1)
        return now >= next_run
        
    elif interval == 'weekly':
        # Check if it's been a week and it's the right day
        days_since = (now.weekday() - last_run.weekday()) % 7
        if days_since == 0 and now.date() == last_run.date():
            # Same day, don't run again
            return False
            
        target_day = job_config.get('day', 0)  # Default to Monday
        return now.weekday() == target_day and now.hour >= job_config.get('hour', 0)
        
    elif interval == 'monthly':
        # Check if it's been a month and it's the right day
        target_day = job_config.get('day', 1)  # Default to 1st
        if now.day == target_day and (now.month != last_run.month or now.year != last_run.year):
            target_hour = job_config.get('hour', 0)
            return now.hour >= target_hour
            
    return False

async def run_job(job_name: str, job_config: Dict, *args, **kwargs):
    """
    Run a job and update its last run time.
    
    Args:
        job_name: Name of the job
        job_config: Job configuration
        args: Arguments to pass to the job
        kwargs: Keyword arguments to pass to the job
    """
    func = job_config['func']
    try:
        logger.info(f"Running job {job_name}")
        if inspect.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            func(*args, **kwargs)
        
        # Update last run time
        _jobs[job_name]['last_run'] = datetime.now()
        logger.info(f"Job {job_name} completed successfully")
        
    except Exception as e:
        logger.error(f"Error running job {job_name}: {str(e)}", exc_info=True)

async def run_due_jobs(*args, **kwargs):
    """
    Run all jobs that are due.
    
    Args:
        args: Arguments to pass to jobs
        kwargs: Keyword arguments to pass to jobs
    """
    for job_name, job_config in _jobs.items():
        if should_run_now(job_config):
            await run_job(job_name, job_config, *args, **kwargs)

async def scheduler(interval_seconds: int = 60, *args, **kwargs):
    """
    Run the scheduler in a loop.
    
    Args:
        interval_seconds: Interval to check for due jobs in seconds
        args: Arguments to pass to jobs
        kwargs: Keyword arguments to pass to jobs
    """
    while True:
        await run_due_jobs(*args, **kwargs)
        await asyncio.sleep(interval_seconds)

def get_registered_jobs() -> List[str]:
    """Get a list of all registered job names."""
    return list(_jobs.keys()) 