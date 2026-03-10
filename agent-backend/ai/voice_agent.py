import speech_recognition as sr
import pyttsx3
import queue
import threading

engine = pyttsx3.init()
speech_queue = queue.Queue()


def speaker_loop():
    while True:
        text = speech_queue.get()
        if text is None:
            break

        print("Agent:", text)
        engine.say(text)
        engine.runAndWait()


def speak(text):
    speech_queue.put(text)


def listen():

    r = sr.Recognizer()

    with sr.Microphone() as source:
        print("Listening...")
        audio = r.listen(source)

    try:
        command = r.recognize_google(audio)
        print("User:", command)
        return command.lower()

    except:
        return ""


def conversation_loop():

    speak("Hello. I am your safety assistant.")

    while True:

        command = listen()

        if "help" in command:
            speak("Sending emergency alert.")

        elif "fake call" in command:
            speak("Okay. Initiating fake call.")
            speak("Hello beta, where are you? I am coming to pick you.")

        elif "stop" in command:
            speak("Monitoring stopped.")
            break

        else:
            speak("I am monitoring your safety.")


def start_voice_agent():
    threading.Thread(target=speaker_loop, daemon=True).start()
    conversation_loop()

def process_voice_command(command):

    if "help" in command:
        return "I am sending emergency alerts now. Stay calm."

    if "no" in command:
        return "Okay. I will continue monitoring you."

    if "yes" in command:
        return "Please stay where you are. Help is on the way."

    return "I am monitoring your safety."