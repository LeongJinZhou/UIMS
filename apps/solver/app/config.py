"""
Application configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Solver service configuration."""

    # API URL (NestJS backend)
    api_url: str = "http://localhost:3000"

    # Solver parameters
    solver_time_limit_seconds: int = 300  # Max time for solver to run
    solver_num_workers: int = 4           # Parallel search workers

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_prefix = "SOLVER_"
        env_file = "../../.env"


settings = Settings()
