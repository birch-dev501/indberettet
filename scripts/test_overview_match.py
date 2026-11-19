import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from overview_match import brand_tokens, match_products


class OverviewMatchTests(unittest.TestCase):
    def test_unique_brand_links_influenza_products_and_skips_supemtek(self):
        tokens = {
            "influenza": brand_tokens(
                [
                    "VAXIGRIP SUSPENSION FOR INJECTION",
                    "INFLUVAC SUSPENSION FOR INJECTION",
                    "FLUENZ TETRA NASAL SPRAY",
                    "EFLUELDA TETRA SUSPENSION FOR INJECTION",
                    "PRE-FILLED SYRINGE",
                ]
            ),
        }
        products = [
            {"drugId": "v", "name": "Vaxigrip", "atc": "J07BB02", "slugs": []},
            {"drugId": "i", "name": "Influvac", "atc": "J07BB02", "slugs": []},
            {"drugId": "f", "name": "Fluenz", "atc": "J07BB03", "slugs": []},
            {"drugId": "e", "name": "Efluelda Tetra", "atc": "J07BB02", "slugs": []},
            {"drugId": "s", "name": "Supemtek Tetra", "atc": "J07BB02", "slugs": []},
            {"drugId": "already", "name": "Vaxigrip", "atc": "J07BB02", "slugs": ["influenza-vaccines"]},
        ]
        links, matched = match_products(
            tokens,
            products,
            known_tokens=tokens,
            slug_to_id={"influenza-vaccines": "influenza"},
        )
        self.assertEqual(matched, {"influenza"})
        self.assertEqual(set(links["influenza"]), {"v", "i", "f", "e"})

    def test_shared_brand_token_is_left_unmatched(self):
        tokens = {
            "one": brand_tokens(["ACMEVAX SOLUTION FOR INJECTION"]),
            "two": brand_tokens(["ACMEVAX SUSPENSION FOR INJECTION"]),
        }
        products = [{"drugId": "a", "name": "Acmevax", "atc": "J07BB02", "slugs": []}]
        links, matched = match_products(tokens, products)
        self.assertEqual(links, {})
        self.assertEqual(matched, set())

    def test_generic_vaccine_word_does_not_match(self):
        tokens = {"flu": brand_tokens(["VACCINE", "PRE-FILLED SYRINGE", "INJECTION"])}
        products = [{"drugId": "x", "name": "Vaccine", "atc": "J07BB02", "slugs": []}]
        links, matched = match_products(tokens, products)
        self.assertEqual(matched, set())

    def test_even_atc_split_on_the_same_brand_links_nothing(self):
        tokens = {"flu": brand_tokens(["VAXIGRIP SUSPENSION"])}
        products = [
            {"drugId": "real", "name": "Vaxigrip", "atc": "J07BB02", "slugs": []},
            {"drugId": "other", "name": "Vaxigrip", "atc": "N02BE01", "slugs": []},
        ]
        links, matched = match_products(tokens, products)
        self.assertEqual(links, {})
        self.assertEqual(matched, set())

    def test_majority_atc_family_keeps_the_vaccine_rows(self):
        tokens = {"flu": brand_tokens(["VAXIGRIP SUSPENSION"])}
        products = [
            {"drugId": "a", "name": "Vaxigrip", "atc": "J07BB02", "slugs": []},
            {"drugId": "b", "name": "Vaxigrip", "atc": "J07BB02", "slugs": []},
            {"drugId": "other", "name": "Vaxigrip", "atc": "N02BE01", "slugs": []},
        ]
        links, _matched = match_products(tokens, products)
        self.assertEqual(set(links["flu"]), {"a", "b"})

    def test_prevenar_follows_pneumococcal_atc_not_phosphate(self):
        tokens = {
            "phosphate": brand_tokens(["CLEENEMA KLAR-TIL-BRUG RECTAL SOLUTION", "PREVENAR 13 SUSPENSION FOR INJECTION"]),
            "pneumo": brand_tokens(
                [
                    "PNEUMOVAX SOLUTION FOR INJECTION",
                    "VAXNEUVANCE SUSPENSION FOR INJECTION",
                    "PREVENAR 13 SUSPENSION FOR INJECTION",
                    "CAPVAXIVE SOLUTION FOR INJECTION",
                ]
            ),
        }
        products = [
            {"drugId": "c", "name": "Cleenema", "atc": "A06AG01", "slugs": []},
            {"drugId": "p", "name": "Pneumovax", "atc": "J07AL01", "slugs": []},
            {"drugId": "v", "name": "Vaxneuvance", "atc": "J07AL02", "slugs": []},
            {"drugId": "13", "name": "Prevenar 13", "atc": "J07AL02", "slugs": ["aluminium"]},
            {"drugId": "20", "name": "Prevenar 20", "atc": "J07AL02", "slugs": []},
        ]
        links, matched = match_products(
            tokens,
            products,
            known_tokens={"aluminium": brand_tokens(["ALUMINIUM HYDROXIDE"])},
            slug_to_id={"aluminium": "aluminium"},
        )
        self.assertEqual(matched, {"phosphate", "pneumo"})
        self.assertEqual(links["phosphate"], ["c"])
        self.assertEqual(set(links["pneumo"]), {"p", "v", "13", "20"})

    def test_brand_already_on_an_ingested_overview_is_not_reattached(self):
        tokens = {"choline": brand_tokens(["ABBOTICIN 250 MG GASTRO-RESISTANT TABLET"])}
        products = [
            {"drugId": "kept", "name": "Abboticin", "atc": "J01FA01", "slugs": ["erythromycin"]},
            {"drugId": "open", "name": "Abboticin Novum", "atc": "J01FA01", "slugs": []},
        ]
        links, matched = match_products(
            tokens,
            products,
            known_tokens={"ery": brand_tokens(["ABBOTICIN 500 MG TABLET", "ERYTHROCIN"])},
            slug_to_id={"erythromycin": "ery"},
        )
        self.assertEqual(matched, set())
        self.assertEqual(links.get("choline"), None)
        self.assertEqual(links.get("ery"), ["open"])

    def test_ingested_overview_still_receives_its_own_unlinked_brand(self):
        products = [{"drugId": "c", "name": "Comirnaty JN.1", "atc": "J07BN01", "slugs": []}]
        links, matched = match_products(
            {},
            products,
            known_tokens={"covid": brand_tokens(["COMIRNATY SUSPENSION FOR INJECTION", "SPIKEVAX"])},
            slug_to_id={"covid-19-vaccines": "covid"},
        )
        self.assertEqual(matched, set())
        self.assertEqual(links["covid"], ["c"])

    def test_strain_code_does_not_attach_a_different_brand(self):
        tokens = {"covid": brand_tokens(["COMIRNATY XBB.1.5 SUSPENSION FOR INJECTION", "SPIKEVAX"])}
        products = [
            {"drugId": "c", "name": "Comirnaty XBB.1.5", "atc": "J07BN01", "slugs": []},
            {"drugId": "n", "name": "Nuvaxovid XBB.1.5", "atc": "J07BN04", "slugs": []},
        ]
        links, matched = match_products(tokens, products)
        self.assertEqual(matched, {"covid"})
        self.assertEqual(links["covid"], ["c"])

    def test_short_bcg_name_matches_across_the_vaccine_word(self):
        tokens = {"bcg": brand_tokens(['BCG VACCINE "AJ VACCINES" POWDER FOR INJECTION'])}
        products = [{"drugId": "b", "name": 'BCG Vaccine "AJ Vaccines"', "atc": "J07AN01", "slugs": []}]
        links, matched = match_products(tokens, products)
        self.assertEqual(matched, {"bcg"})
        self.assertEqual(links["bcg"], ["b"])


if __name__ == "__main__":
    unittest.main()
