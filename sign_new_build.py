import argparse
import base64
import pathlib

from cryptography.hazmat.primitives import serialization
from nacl.signing import SigningKey

def main():
    p = argparse.ArgumentParser(
        description="Sign a build artifact for Tauri updater (Ed25519)."
    )
    p.add_argument("key", help="Path to updater-key.pem")
    p.add_argument("artifact", help="Path to the build artifact to sign (e.g. .deb)")
    p.add_argument(
        "--out",
        default="signature.b64",
        help="Output file for base64 signature (default: signature.b64)",
    )
    args = p.parse_args()

    pem = pathlib.Path(args.key).read_bytes()
    priv = serialization.load_pem_private_key(pem, password=None)
    raw = priv.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )

    sk = SigningKey(raw)
    msg = pathlib.Path(args.artifact).read_bytes()
    sig = sk.sign(msg).signature
    out = base64.b64encode(sig).decode()

    pathlib.Path(args.out).write_text(out)
    print(f"wrote {args.out}")

if __name__ == "__main__":
    main()