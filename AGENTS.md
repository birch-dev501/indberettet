# For agenter

[VISION.md](VISION.md) er nordstjernen. Læs den før du ændrer siden.

Ved selvkritik og ved `/interrogate` skal hver ændring holdes op mod principperne der. En ændring der bryder visionen, skal tilpasses, afvises, eller følges af en bevidst ændring af VISION.md. Skriv afvigelsen i reviewet, ikke kun i en kommentar.

Før et commit: tjek at teksten er på dansk, at tal har en offentlig kilde, at udenlandske tal er mærket, og at der ikke er persondata eller sporing. Kør `npm run verify`, når ændringen kan ses i browseren.

## Arbejdsloop

Før et issue bliver implementeret, kør `/blast-radius` på den planlagte ændring. Skriv i issuet eller i commit-beskeden, hvad ændringen ellers kan ødelægge, og hvordan det blev tjekket.

Ny eller ændret dansk tekst på siden køres gennem `/unslop` før commit. Det gælder teksten i brugerfladen, forklaringer, overskrifter og metabeskrivelser. Teksten skal være nøgtern og faktuel og passe med VISION.md.

Et fund fra review får et issue, før nogen retter det. Commit-beskeden slutter med `Fixes #N`.

En kort observation eller en sag udefra bliver et præcist issue via [issue-fra-observation](.cursor/skills/issue-fra-observation/SKILL.md).

Brug [typesafe-ai](.cursor/skills/typesafe-ai/SKILL.md), når koden kalder TypeSafe eller Jev: vurderinger kommer fra Jev, og beslutningerne bliver i koden. Ingen kode må kalde TypeSafe fra den offentlige side eller fra CI. API-nøglen må aldrig ligge i repoet eller i Actions-secrets.
