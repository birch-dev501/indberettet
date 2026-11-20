# For agenter

## Kontrakt for byggeren

JOB: build and fix Indberettet per GitHub issues and VISION.md, delivering anonymous git bundles.

SOURCES: Lægemiddelstyrelsen data in data/, cited papers stored with exact table/row, the issue's Done-tjek.

JUDGMENT: done = verify exit 0 + raw evidence for every Done-tjek item + independent /interrogate review of the exact diff (data reviewer mandatory when numbers change).

OUTPUT: commits ending 'Fixes #N', a bundle on top of public main, a handoff.

FORBIDDEN: pushing to the public repo; any personal name, email, account or home path in commits or files; API keys or calls to paid APIs from the site or CI; publishing or claiming done without review; dropping a review finding without reporting it.



[VISION.md](VISION.md) er nordstjernen. Læs den før du ændrer siden.

Ved selvkritik og ved `/interrogate` skal hver ændring holdes op mod principperne der. En ændring der bryder visionen, skal tilpasses, afvises, eller følges af en bevidst ændring af VISION.md. Skriv afvigelsen i reviewet, ikke kun i en kommentar.

Før et commit: tjek at teksten er på dansk, at tal har en offentlig kilde, at udenlandske tal er mærket, og at der ikke er persondata eller sporing. Kør `npm run verify`, når ændringen kan ses i browseren.

## Arbejdsloop

Arbejdsloopet står i [projekt-workflow](.cursor/skills/projekt-workflow/SKILL.md).

Før et issue bliver implementeret, kør `/blast-radius` på den planlagte ændring. Skriv i issuet eller i commit-beskeden, hvad ændringen ellers kan ødelægge, og hvordan det blev tjekket.

Ny eller ændret dansk tekst på siden køres gennem `/unslop` før commit. Det gælder teksten i brugerfladen, forklaringer, overskrifter og metabeskrivelser. Teksten skal være nøgtern og faktuel og passe med VISION.md.

Et fund fra review får et issue, før nogen retter det. Commit-beskeden slutter med `Fixes #N`.

Et tal fra en artikel, en tabel eller et register ligger i koden med tabel, række eller side. En reviewer tjekker tallet mod originalen, før siden bygges. Sensitivitet og specificitet, og andre par, kommer fra samme række.

`npm run verify` tjekker reglerne for data. Et kort firmanavn kræver en ordgrænse, og et tvetydigt præfiks får ingen adresse. En tekst, der siger ét stof, står kun ved det ene stofs tal. En Bayes-tabel passer med den angivne sensitivitet og specificitet, når cellerne er afrundet.

Et review, hvis diff rører tal, data eller beregninger, har en reviewer på data og statistik. Det gælder også en lille ændring.

Efter hver reviewrunde køres `/correct`. Gentagne fejltyper rettes på det højeste niveau, der virker: arkitektur, typer, lint eller CI, verify, tests. Dokumentation er sidst.

En kort observation eller en sag udefra bliver et præcist issue via [issue-fra-observation](.cursor/skills/issue-fra-observation/SKILL.md).

Brug [typesafe-ai](.cursor/skills/typesafe-ai/SKILL.md), når koden kalder TypeSafe eller Jev: vurderinger kommer fra Jev, og beslutningerne bliver i koden. Ingen kode må kalde TypeSafe fra den offentlige side eller fra CI. API-nøglen må aldrig ligge i repoet eller i Actions-secrets.
