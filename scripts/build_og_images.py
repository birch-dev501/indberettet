#!/usr/bin/env python3
"""Tegn delingsbilleder. Formodede bivirkninger, ikke et bevis for årsag."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og"
W, H = 1200, 630
PAPER = (244, 240, 230)
TEAL = (17, 78, 73)
INK = (28, 25, 21)
MUTED = (94, 88, 78)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("Mangler DejaVu eller Liberation. Installer fonts-dejavu-core.")


def card(title: str, lines: list[str], destination: Path) -> None:
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 28, H), fill=TEAL)
    draw.text((72, 70), "Indberettet", font=font(28, True), fill=TEAL)
    draw.text((72, 150), title[:42], font=font(64, True), fill=INK)
    y = 260
    for line in lines:
        draw.text((72, y), line, font=font(36), fill=INK)
        y += 52
    draw.text((72, 540), "Formodede bivirkninger. Ikke bevis for årsag.", font=font(24), fill=MUTED)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG")


def danish(number: int) -> str:
    return f"{number:,}".replace(",", ".")


def main() -> None:
    index = json.loads((ROOT / "data" / "index.json").read_text(encoding="utf-8"))
    companies = json.loads((ROOT / "data" / "companies.json").read_text(encoding="utf-8"))
    card("Formodede bivirkninger i Danmark", ["Åbne tal fra Lægemiddelstyrelsen"], OUT / "default.png")
    for item in index["substances"]:
        card(
            item["name"],
            [
                f"{danish(item['reports'])} indberetninger",
                f"{danish(item['seriousReports'])} alvorlige · {danish(item['fatalReports'])} ved dødsfald",
            ],
            OUT / "stof" / f"{item['slug']}.png",
        )
    for company in companies["companies"]:
        reports = sum(item["reports"] for item in company["substances"])
        serious = sum(item["seriousReports"] for item in company["substances"])
        fatal = sum(item["fatalReports"] for item in company["substances"])
        card(
            company["label"][:42],
            [
                f"{danish(reports)} indberetninger",
                f"{danish(serious)} alvorlige · {danish(fatal)} ved dødsfald",
            ],
            OUT / "firma" / f"{company['slug']}.png",
        )
    print(f"Delingsbilleder: {1 + len(index['substances']) + len(companies['companies'])}")


if __name__ == "__main__":
    main()
