import math
import os
import struct
import wave

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

PDF_PATH = os.path.join(ASSETS_DIR, "sample_redacted.pdf")
WAV_PATH = os.path.join(ASSETS_DIR, "sample_audio.wav")


def _build_pdf_bytes() -> bytes:
    content_stream_data = (
        b"BT "
        b"/F1 12 Tf "
        b"100 750 Td "
        b"(OpenBron Test Document - Page 1) Tj "
        b"0 -20 Td "
        b"(This is a sample PDF for ingestion testing.) Tj "
        b"ET"
    )

    objects_raw: list[bytes] = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
        (
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R "
            b"/MediaBox [0 0 612 792] "
            b"/Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> >> "
            b">>\nendobj"
        ),
        (
            b"4 0 obj\n<< /Length "
            + str(len(content_stream_data)).encode()
            + b" >>\nstream\n"
            + content_stream_data
            + b"\nendstream\nendobj"
        ),
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    ]

    lines = [b"%PDF-1.4"]
    object_offsets: list[int] = []

    for obj_bytes in objects_raw:
        object_offsets.append(sum(len(line) + 1 for line in lines))
        lines.append(obj_bytes)

    xref_offset = sum(len(line) + 1 for line in lines)

    num_objects = len(objects_raw) + 1
    xref_lines = [
        b"xref",
        b"0 " + str(num_objects).encode(),
        b"%010d %05d %c \r\n" % (0, 65535, ord("f")),
    ]
    for offset in object_offsets:
        xref_lines.append(b"%010d %05d %c \r\n" % (offset, 0, ord("n")))

    lines.extend(xref_lines)

    trailer_lines = [
        b"trailer",
        b"<< /Size " + str(num_objects).encode() + b" /Root 1 0 R >>",
        b"startxref",
        str(xref_offset).encode(),
        b"%%EOF",
    ]
    lines.extend(trailer_lines)

    return b"\n".join(lines)


def generate_pdf(output_path: str) -> None:
    if os.path.exists(output_path):
        print(f"SKIP: {output_path} already exists")
        return
    data = _build_pdf_bytes()
    with open(output_path, "wb") as f:
        f.write(data)
    size_kb = os.path.getsize(output_path) / 1024
    print(f"CREATED: {output_path} ({size_kb:.1f} KB)")


def generate_wav(output_path: str) -> None:
    if os.path.exists(output_path):
        print(f"SKIP: {output_path} already exists")
        return

    sample_rate = 44100
    duration = 1.0
    frequency = 440.0
    amplitude = 0.5
    num_samples = int(sample_rate * duration)

    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        value = int(amplitude * 32767.0 * math.sin(2.0 * math.pi * frequency * t))
        samples.append(value)

    with wave.open(output_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack("<" + "h" * num_samples, *samples))

    size_kb = os.path.getsize(output_path) / 1024
    print(f"CREATED: {output_path} ({size_kb:.1f} KB)")


def main() -> None:
    generate_pdf(PDF_PATH)
    generate_wav(WAV_PATH)
    print("Done.")


if __name__ == "__main__":
    main()
