import argparse
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

def main():
    p = argparse.ArgumentParser(
        description="Sign a build artifact for Tauri updater (Ed25519)."
    )
    p.add_argument("key", help="Path to updater_private.pem")
    p.add_argument("artifact", help="Path to the .deb you want to sign")
    p.add_argument(
        "--out",
        "-o",
        default="signature.b64",
        help="Output file for base64 signature (default: signature.b64)",
    )
    args = p.parse_args()

    with open(args.key, "rb") as f:
        priv = serialization.load_pem_private_key(f.read(), password=None)

    if not isinstance(priv, Ed25519PrivateKey):
        raise SystemExit("Private key is not Ed25519")

    with open(args.artifact, "rb") as f:
        data = f.read()

    sig = priv.sign(data)
    b64 = base64.b64encode(sig).decode("ascii")

    with open(args.out, "w") as f:
        f.write(b64)

    print("Wrote base64 signature to", args.out)

if __name__ == "__main__":
    main()
    
# python sign_new_build.py updater_private.pem builds/ordering_system_0.1.0_arm64.deb