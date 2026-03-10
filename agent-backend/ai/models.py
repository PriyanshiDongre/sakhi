from pydantic import BaseModel

class LocationInput(BaseModel):
    lat: float
    lng: float
    stopped: bool
    danger_score: float