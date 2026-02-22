# Specification: Implement AI Prioritization suggestions

## Overview
This track implements the core logic for the AI-powered prioritization system. It leverages the existing LLM integration to analyze tasks and suggest a "Do This Now" action based on urgency, estimated duration, and current capacity.

## User Stories
- As a user with ADHD, I want the system to tell me exactly what to do next so I can avoid decision paralysis.
- As a user, I want to see why a task was suggested so I can trust the AI's recommendation.
- As a user, I want to easily dismiss or override an AI suggestion if it doesn't match my current energy level.

## Requirements
- Backend endpoint to fetch the "Do This Now" suggestion.
- LLM prompt engineering to weight urgency higher than traditional priority.
- Frontend display component for the AI suggestion at the top of the task list.
- Simple "Accept" or "Dismiss" actions for the suggestion.
