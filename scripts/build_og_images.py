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


def wrap(text: str, face: ImageFont.ImageFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if face.getlength(trial) <= width:
            current = trial
            continue
        if current:
            lines.append(current)
        current = word
    if current:
        lines.append(current)
    return lines


def title_block(title: str, width: int) -> tuple[ImageFont.ImageFont, list[str]]:
    for size in (56, 44, 36, 28, 22):
        face = font(size, True)
        lines = wrap(title, face, width)
        if len(lines) <= 3 and all(face.getlength(line) <= width for line in lines):
            return face, lines
    face = font(22, True)
    return face, wrap(title, face, width)


def card(title: str, lines: list[str], destination: Path) -> None:
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 28, H), fill=TEAL)
    draw.text((72, 64), "Indberettet", font=font(28, True), fill=TEAL)
    face, title_lines = title_block(title, W - 120)
    y = 130
    for line in title_lines:
        draw.text((72, y), line, font=face, fill=INK)
        y += int(face.size * 1.15)
    y += 18
    body = font(32)
    for line in lines:
        for wrapped in wrap(line, body, W - 120):
            draw.text((72, y), wrapped, font=body, fill=INK)
            y += 42
    draw.text((72, 548), "Formodede bivirkninger. Ikke bevis for årsag.", font=font(24), fill=MUTED)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG")


def company_lines(company: dict) -> list[str]:
    rows = company.get("substances") or []
    if not rows:
        return ["Ingen bivirkningsoversigt er knyttet til firmaet."]
    reports = sum(int(item["reports"]) for item in rows)
    serious = sum(int(item["seriousReports"]) for item in rows)
    fatal = sum(int(item["fatalReports"]) for item in rows)
    if len(rows) == 1:
        lead = f"Tal for {rows[0].get('name') or 'stoffet'}. Ikke for firmaet."
    else:
        lead = "Tilsammen for de stoffer, der har en oversigt. Ikke for firmaet."
    return [
        lead,
        f"{danish(reports)} indberetninger",
        f"{danish(serious)} alvorlige · {danish(fatal)} ved dødsfald",
    ]


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
        card(company["label"], company_lines(company), OUT / "firma" / f"{company['slug']}.png")
    print(f"Delingsbilleder: {1 + len(index['substances']) + len(companies['companies'])}")


if __name__ == "__main__":
    main()
