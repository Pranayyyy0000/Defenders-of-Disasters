import unittest
from unittest.mock import patch, MagicMock
from src.services.translation_service import (
    TranslationService,
    SUPPORTED_LANGUAGES,
    BUILT_IN_LEXICON,
)


class TestTranslationService(unittest.TestCase):

    def setUp(self):
        self.service = TranslationService()

    def test_supported_indian_languages_present(self):
        expected_languages = [
            "en", "hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "pa", "ur", "as", "or"
        ]
        present_codes = list(SUPPORTED_LANGUAGES.values())
        for code in expected_languages:
            self.assertIn(code, present_codes, f"Language code {code} missing from supported languages")

    def test_english_identity(self):
        text = "Emergency Flood Warning"
        result = self.service.translate(text, target_lang="en")
        self.assertEqual(result, text)

    def test_built_in_lexicon_translation(self):
        result_hi = self.service.translate("Safe Zone", target_lang="hi")
        self.assertEqual(result_hi, "सुरक्षित क्षेत्र")

        result_te = self.service.translate("Relief Camp", target_lang="te")
        self.assertEqual(result_te, "ప్రభుత్వ పునరావాస శిబిరం")

    def test_translation_caching(self):
        self.service.clear_cache()
        self.assertEqual(self.service.cache_size, 0)

        # First call caches result
        res1 = self.service.translate("Safe Zone", target_lang="hi")
        self.assertGreater(self.service.cache_size, 0)

        # Second call returns from cache
        res2 = self.service.translate("Safe Zone", target_lang="hi")
        self.assertEqual(res1, res2)

    def test_graceful_fallback_to_english_on_failure(self):
        # When an untranslated string fails to translate, it returns original English
        unknown_text = "Custom Sensor Calibration Status XYZ"
        result = self.service.translate(unknown_text, target_lang="ta")
        # Should gracefully return the original English text rather than crashing
        self.assertEqual(result, unknown_text)

    def test_translate_dict_all_languages(self):
        text_dict = {"en": "Relief Camp"}
        translations = self.service.translate_dict(text_dict)

        self.assertIn("en", translations)
        self.assertEqual(translations["en"], "Relief Camp")
        self.assertIn("hi", translations)
        self.assertIn("te", translations)
        self.assertIn("ml", translations)
        self.assertEqual(len(translations), len(SUPPORTED_LANGUAGES))


if __name__ == "__main__":
    unittest.main()
