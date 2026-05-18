"""
UIMS Timetable Constraint Solver
FastAPI microservice wrapping Google OR-Tools for timetable generation.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as solver_router
from app.config import settings

app = FastAPI(
    title="UIMS Timetable Solver",
    description="Constraint-based timetable generation using Google OR-Tools",
    version="1.0.0",
    docs_url="/solver/docs",
    openapi_url="/solver/openapi.json",
)

# CORS — allow NestJS backend to call the solver
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.api_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include solver routes
app.include_router(solver_router, prefix="/solver")


@app.get("/solver/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "uims-solver",
        "version": "1.0.0",
    }
