# Indberettet

Dansk site der viser formodede bivirkninger fra Lægemiddelstyrelsens åbne, interaktive bivirkningsoversigter. Tallene er indberetninger, ikke bevis for årsag og ikke en hyppighed.

Nordstjernen står i [VISION.md](VISION.md). Agenter læser den sammen med [AGENTS.md](AGENTS.md). Hver ændring tjekkes mod visionen.

## Kør lokalt

```bash
python3 scripts/ingest.py
npm install
npm run dev
```

Sitet lytter på [http://127.0.0.1:3847/indberettet/](http://127.0.0.1:3847/indberettet/). Stien `/indberettet` er GitHub Pages-projektstien og kan ændres med `NEXT_PUBLIC_BASE_PATH`.

`python3 scripts/ingest.py --dry-run` matcher produktlisten mod stofindekset uden at hente ZIP-filer.

## Data

Pipelinen gør fire ting:

1. Henter [listen over godkendte lægemidler](https://laegemiddelstyrelsen.dk/LinkArchive.ashx?id=0BD4960F0D7744E3BABC951431681ECC&lang=da).
2. Åbner [stofindekset](https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin/interaktive-bivirkningsoversigter/) og finder ZIP-stien for hvert stof. Filen ligger under `/upload/dap/data/`, ikke på den relative sti, HTML-siden viser.
3. Matcher aktive stoffer fra produktlisten til en oversigt. Semaglutide og COVID-19 vaccines hentes altid.
4. Validerer CSV-skemaet (de fem filer og hjælpeteksten) og skriver rensede tal i `data/substances/`.

Rå CSV for de to fremhævede stoffer ligger i `data/raw/`. Hjælpeteksten fra ZIP-filen ligger i `data/reference/`.

Hvis download eller format fejler for et showcase-stof, eller hvis en stor del af filerne bryder skemaet, afbrydes kørslen og den forrige `data/`-mappe bliver stående. En enkelt ødelagt ZIP beholder sidste gyldige fil for det stof og markeres som forældet.

## GitHub Pages

`npm run build` laver en statisk eksport i `out/` med `basePath` `/indberettet` og afsluttende skråstreg. Søgningen læser `generated/search.json`, som bygges fra de committede JSON-filer. Rå CSV er kun gemt for Semaglutide og COVID-19 vaccines. De øvrige stoffer ligger som renset JSON.

Kildekoden ligger på [github.com/birch-dev501/indberettet](https://github.com/birch-dev501/indberettet). Sitet udgives til [birch-dev501.github.io/indberettet](https://birch-dev501.github.io/indberettet/).

`.github/workflows/pages.yml` udgiver `out/` til GitHub Pages med `actions/deploy-pages` ved push til `main`. `.github/workflows/monthly-update.yml` kører den 2. i måneden kl. 05.30 UTC, kan startes med *Run workflow*, committer kun hvis data er ændret, og udgiver Pages i samme kørsel. Den månedlige kørsel bruger `GITHUB_TOKEN` med `contents: write`. Pages-jobbet bruger `pages: write` og `id-token: write`.

Grupper som Statiner (ATC C10AA) og Vacciner (ATC J07) står i `data/categories.json`. Hvem der hører til, regnes ud ved build fra ATC-koderne på den godkendte liste. Den månedlige kørsel bygger søgeindeks og sider igen, så nye præparater følger med.

Indberetningsraten bruger antal købende personer pr. ATC-kode og år fra Sundhedsdatastyrelsens Lægemiddelstatistikregister (primærsektor). `python3 scripts/fetch_medstat.py` henter tallene. Medstat.dk lukkede 5. november 2026; scriptet læser den offentlige afløser, Medicinsalg i primærsektoren. Fejler hentningen, beholdes sidste fil, og månedsjobbet kører videre. Vacciner og stoffer uden en entydig, tilstrækkelig nævner viser ingen rate.

Handelsnavne og indehavere kommer fra listen over godkendte lægemidler. Siden viser de hyppigste navne og samler firma-varianter, så Novo Nordisk A/S og Eli Lilly Nederland B.V. får hver deres side under `/firma`. Indberetningerne er stadig talt pr. aktivt stof.

Hverdagsnavne ligger i `data/plain-language.json`. `python3 scripts/build_plain_language.py` udfylder handelsnavne fra den godkendte liste og lægemiddelgruppen fra `data/atc-everyday.json`. Godkendte indikationer udfyldes ikke automatisk. Et felt med `needsReview: false` bliver stående. Sygdomsord til søgning står i `data/diseases.json` og peger kun på ATC-grupper.

Bøder på firmasiderne ligger i `data/violations.json` og kommer fra [Violation Tracker](https://violationtracker.goodjobsfirst.org/industry/pharmaceuticals) hos Good Jobs First. `python3 scripts/fetch_violations.py` prøver at hente siderne igen. Blokerer siden hentningen, beholdes den gemte fil.

Bivirkningstermer linker til en forklaring i `data/term-links.json`. Filen har kun de termnavne, der allerede står i Lægemiddelstyrelsens udtræk, ikke en MedDRA-ordbog. `python3 scripts/check_term_links.py` tjekker adresserne igen. En adresse, der ikke svarer, mister sit direkte link, og siden viser i stedet en søgning i Patienthåndbogen. Fejler netværket, beholdes den forrige fil.

Pages skal stå på source **GitHub Actions**. `NEXT_PUBLIC_BASE_PATH` er `/indberettet`, som matcher repository-navnet.

## Månedlig opdatering

Se workflowet ovenfor. En fejlende kørsel pusher ikke og beholder sidste gyldige data.

## Sider

- `/` forside med de to fremhævede stoffer, ATC-grupper og søgning
- `/kategori` og `/kategori/[slug]` grupper efter ATC-kode
- `/stof/[slug]` samme skabelon for hvert hentet stof
- `/katalog` alfabetisk oversigt
- `/om-data` forbehold, filformat og drift
