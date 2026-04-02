import time

try:
    import RPi.GPIO as GPIO
except ImportError:
    raise SystemExit("RPi.GPIO module not found. Install with: sudo apt install python3-rpi.gpio")

GPIO.setmode(GPIO.BOARD)
PIR_PIN = 7 

GPIO.setup(PIR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

print(f"PIR motion sensor test started on pin {PIR_PIN} (mode={GPIO.getmode()})")
print("Press Ctrl+C to exit")

try:
    if GPIO.input(PIR_PIN) is None:
        print("Error: PIR sensor not detected. Check wiring and pin number.")
        raise SystemExit(1)
    while True:
        motion = GPIO.input(PIR_PIN)
        if motion:
            print("Motion detected!")
        else:
            print("No motion")
        time.sleep(0.5)
except KeyboardInterrupt:
    print("\nExiting test")
finally:
    GPIO.cleanup()
