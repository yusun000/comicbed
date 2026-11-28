#!/usr/bin/env python3

from pathlib import Path
import zlib

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "testdata/pdf/xobject"
OUTPUT.mkdir(parents=True, exist_ok=True)

WIDTH = 240
HEIGHT = 360

# Four different colors allow detection of clipping,
# rotation and mirroring.
pixels = bytearray()

for y in range(HEIGHT):
    for x in range(WIDTH):
        if y < HEIGHT // 2:
            color = (255, 0, 0) if x < WIDTH // 2 else (0, 255, 0)
        else:
            color = (0, 0, 255) if x < WIDTH // 2 else (255, 255, 0)

        pixels.extend(color)


def stream(dictionary, data):
    return (
        b"<< " + dictionary +
        b" /Length " + str(len(data)).encode() +
        b" >>\nstream\n" + data + b"\nendstream"
    )


def make_pdf(name, content, rotate=0, annotation=False, page_height=180):
    objects = []

    def add(data):
        if isinstance(data, str):
            data = data.encode("ascii")

        objects.append(data)

    add("<< /Type /Catalog /Pages 2 0 R >>")

    add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")

    page = (
        "<< /Type /Page /Parent 2 0 R "
        "/MediaBox [0 0 120 %d] " % page_height +
        "/Resources << "
        "/XObject << /Im0 5 0 R >> "
        "/Font << /F1 6 0 R >> "
        ">> /Contents 4 0 R "
    )

    if rotate:
        page += "/Rotate %d " % rotate

    if annotation:
        page += "/Annots [7 0 R] "

    add(page + ">>")

    add(stream(b"", content.encode("ascii")))

    add(stream(
        b"/Type /XObject /Subtype /Image "
        b"/Width 240 /Height 360 "
        b"/ColorSpace /DeviceRGB "
        b"/BitsPerComponent 8 "
        b"/Filter /FlateDecode",
        zlib.compress(bytes(pixels))
    ))

    add(
        "<< /Type /Font /Subtype /Type1 "
        "/BaseFont /Helvetica >>"
    )

    if annotation:
        add(
            "<< /Type /Annot /Subtype /Text "
            "/Rect [10 10 30 30] "
            "/Contents (Test annotation) /F 4 >>"
        )

    result = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for i, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result.extend(("%d 0 obj\n" % i).encode())
        result.extend(obj)
        result.extend(b"\nendobj\n")

    xref = len(result)

    result.extend(
        ("xref\n0 %d\n" % len(offsets)).encode()
    )

    result.extend(b"0000000000 65535 f \n")

    for offset in offsets[1:]:
        result.extend(
            ("%010d 00000 n \n" % offset).encode()
        )

    result.extend(
        (
            "trailer\n"
            "<< /Size %d /Root 1 0 R >>\n"
            "startxref\n%d\n%%%%EOF\n"
            % (len(offsets), xref)
        ).encode()
    )

    path = OUTPUT / (name + ".pdf")
    path.write_bytes(result)
    print(path.name, len(result), "bytes")


full = "q 120 0 0 180 0 0 cm /Im0 Do Q"

make_pdf("full-page", full)

make_pdf(
    "full-clip",
    "q Q q 0 0 120 180 re W n "
    "/RelativeColorimetric ri " + full + " Q"
)

make_pdf(
    "partial-clip",
    "q Q q 0 0 60 180 re W n "
    "/RelativeColorimetric ri " + full + " Q"
)

make_pdf(
    "margin",
    "q 100 0 0 150 10 15 cm /Im0 Do Q"
)

make_pdf(
    "multiple-images",
    full + " q 30 0 0 45 0 0 cm /Im0 Do Q"
)

make_pdf(
    "text-overlay",
    full + " BT /F1 18 Tf 10 80 Td (TEST) Tj ET"
)

make_pdf("rotated-page", full, rotate=90)

make_pdf(
    "mirrored-image",
    "q -120 0 0 180 120 0 cm /Im0 Do Q"
)

make_pdf("annotation", full, annotation=True)

make_pdf(
    "aspect-mismatch",
    full.replace("180", "150"), page_height=150
)


print("Generated fixtures in:", OUTPUT)
