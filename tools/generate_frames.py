#!/usr/bin/env python3
"""Genera le sei cornici minimali, aperte e distribuibili del progetto."""

from pathlib import Path

import ezdxf

FRAMES = {
    "A4_100": (19.5, 23.5),
    "A4_200": (39.0, 47.0),
    "A4_500": (97.5, 117.5),
    "A3_100": (26.0, 40.5),
    "A3_200": (52.0, 81.0),
    "A3_500": (130.0, 202.5),
}


def make_frame(path: Path, width: float, height: float) -> None:
    """Scrive un DXF R12 minimale, leggibile da QCAD; coordinate in metri."""
    doc = ezdxf.new("R12")
    doc.layers.add("RIQUADRO", color=7)
    doc.modelspace().add_polyline2d(
        [(0, 0), (width, 0), (width, height), (0, height)],
        close=True,
        dxfattribs={"layer": "RIQUADRO"},
    )
    doc.saveas(path)


def main() -> None:
    target = Path(__file__).parents[1] / "scripts/Misc/StudioDocfa/StudioDocfaCornice/Frames"
    target.mkdir(parents=True, exist_ok=True)
    for name, (width, height) in FRAMES.items():
        make_frame(target / f"{name}.dxf", width, height)


if __name__ == "__main__":
    main()
