from fastapi import FastAPI
from models import LocationInput
from agent_logic import SafetyAgent
from fastapi.middleware.cors import CORSMiddleware
from voice_agent import process_voice_command
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
agent = SafetyAgent()


@app.get("/")
def home():
    return {"message": "Sakhi Safety AI Running"}


@app.post("/location/update")
def update_location(data: LocationInput):

    result = agent.update_location(
        data.lat,
        data.lng,
        data.stopped,
        data.danger_score
    )

    # Trigger voice agent
    if "Dangerous location detected" in result:
        return {
            "action": "start_voice_agent",
            "message": "You are in a high risk area. Are you safe?"
        }

    if "User stopped in location" in result:
        return {
            "action": "start_voice_agent",
            "message": "You have stopped for a long time. Do you need help?"
        }

    return {
        "action": "monitoring",
        "message": result
    }


@app.post("/voice/command")
def voice_command(command: str):

    command = command.lower()

    if "help" in command:
        return {"response": "Emergency alert triggered"}

    if "fake call" in command:
        return {"response": "Starting fake call"}

    return {"response": "Monitoring your safety"}