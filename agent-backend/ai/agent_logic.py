import time
import math
from collections import deque
from sos_service import send_sos
from voice_agent import speak


class SafetyAgent:

    def __init__(self, safe_route=None):

        self.location_history = deque()
        self.last_movement_time = time.time()
        self.safe_route = safe_route or []

    # ----------------------------
    # distance between two gps points
    # ----------------------------
    def calculate_distance(self, lat1, lon1, lat2, lon2):

        R = 6371000

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)

        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    # ----------------------------
    # distance from safest route
    # ----------------------------
    def distance_from_route(self, lat, lon):

        if not self.safe_route:
            return 0

        min_distance = float("inf")

        for rlat, rlon in self.safe_route:

            d = self.calculate_distance(lat, lon, rlat, rlon)

            if d < min_distance:
                min_distance = d

        return min_distance

    # ----------------------------
    # main monitoring logic
    # ----------------------------
    def update_location(self, lat, lon, stopped, danger_score):

        current_time = time.time()

        self.location_history.append((lat, lon, current_time))

        if len(self.location_history) < 2:
            return "Location recorded"

        prev_lat, prev_lon, prev_time = self.location_history[-2]

        distance = self.calculate_distance(prev_lat, prev_lon, lat, lon)

        time_diff = current_time - prev_time

        speed = 0 if time_diff == 0 else distance / time_diff

        # movement detection
        if speed > 0.3:
            self.last_movement_time = current_time
            status = "User moving"

        else:

            stopped_duration = current_time - self.last_movement_time

            if stopped_duration > 20:

                speak("You have stopped. Are you safe?")
                status = "User stopped"

            else:
                status = "Monitoring"

        # danger zone detection
        if danger_score > 0.7:

            speak("Warning. You are entering a dangerous area.")
            send_sos(lat, lon)

            status = "Dangerous location detected"

        # route deviation detection
        deviation = self.distance_from_route(lat, lon)

        if deviation > 50:

            speak("You are deviating from the safest route.")
            status = "Route deviation detected"

        if deviation > 100:

            speak("You are far from the safe route. Sending emergency alert.")
            send_sos(lat, lon)

        return f"{status} | Speed: {round(speed,2)} m/s | Deviation: {round(deviation,2)} m"