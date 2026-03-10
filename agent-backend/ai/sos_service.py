def send_sos(lat, lon):

    message = f"""
    🚨 SOS ALERT

    Possible danger detected.

    Location:
    https://maps.google.com/?q={lat},{lon}
    """

    print("Sending SMS to parents...")
    print(message)

    print("Sending SMS to police...")
    print(message)