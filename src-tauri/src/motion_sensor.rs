use rppal::gpio::Gpio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

const PIR_PIN: u8 = 26;

pub fn start(running: Arc<AtomicBool>) -> bool {
    let gpio = match Gpio::new() {
        Ok(g) => g,
        Err(e) => {
            eprintln!("Failed to initialize GPIO: {}", e);
            return false;
        }
    };

    let pin = match gpio.get(PIR_PIN) {
        Ok(p) => p.into_input(),
        Err(e) => {
            eprintln!("Failed to get GPIO pin {}: {}", PIR_PIN, e);
            return false;
        }
    };

    println!("Sensor initialised . . .");
    thread::sleep(Duration::from_secs(2));
    println!("Active");

    while running.load(Ordering::SeqCst) {
        if pin.is_high() {
            println!("Object detected!");
            thread::sleep(Duration::from_millis(300));
            return true;
        }

        thread::sleep(Duration::from_millis(50));
    }

    false
}