use rppal::gpio::{Gpio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

const PIR_PIN: u8 = 26;

pub fn start(running: Arc<AtomicBool>) -> Result<bool, bool> {
    let gpio = match Gpio::new() {
        Ok(g) => g,
        Err(e) => {
            eprintln!("Failed to initialize GPIO: {}", e);
            return Err(false);
        }
    };

    let mut pin = match gpio.get(PIR_PIN) {
        Ok(p) => p.into_input(),
        Err(e) => {
            eprintln!("Failed to get GPIO pin {}: {}", PIR_PIN, e);
            return Err(false);
        }
    };

    println!("Sensor initialised . . .");

    thread::sleep(Duration::from_secs(5));
   
    println!("Active");

    while running.load(Ordering::SeqCst) {
        match pin.poll_interrupt(true, Some(Duration::from_millis(100))) {
            Ok(Some(_)) => {
                println!("Motion detected!");
                return Ok(true);
            },
            Ok(None) => {}
            Err(e) => {
                eprintln!("Error polling GPIO pin: {}", e);
                return Err(false);
            }
        }
    }
    Ok(true)
}
