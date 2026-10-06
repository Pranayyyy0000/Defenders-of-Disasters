"""
Translation Service Module for Guardians of Disasters.
Provides multilingual emergency translation across 13 Indian languages
with in-memory caching and graceful English fallback.
"""

from typing import Dict, Optional, Tuple

# Optional deep_translator package support
try:
    from deep_translator import GoogleTranslator
    HAS_DEEP_TRANSLATOR = True
except ImportError:
    GoogleTranslator = None  # type: ignore
    HAS_DEEP_TRANSLATOR = False


SUPPORTED_LANGUAGES: Dict[str, str] = {
    "English": "en",
    "Hindi": "hi",
    "Tamil": "ta",
    "Telugu": "te",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Bengali": "bn",
    "Marathi": "mr",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Urdu": "ur",
    "Assamese": "as",
    "Odia": "or",
}

# Pre-cached standard emergency lexicon for offline reliability and fallback
BUILT_IN_LEXICON: Dict[str, Dict[str, str]] = {
    "Safe Zone": {
        "hi": "सुरक्षित क्षेत्र",
        "te": "సురక్షిత ప్రాంతం",
        "ta": "பாதுகாப்பான பகுதி",
        "ml": "സുരക്ഷിത മേഖല",
        "kn": "ಸುರಕ್ಷಿತ ವಲಯ",
        "bn": "নিরাপদ অঞ্চল",
        "mr": "सुरक्षित क्षेत्र",
        "gu": "સુરક્ષિત વિસ્તાર",
        "pa": "ਸੁਰੱਖਿਅਤ ਖੇਤਰ",
        "ur": "محفوظ علاقہ",
        "as": "নিৰাপদ অঞ্চল",
        "or": "ନିରାପଦ ଅଞ୍ଚଳ",
    },
    "Relief Camp": {
        "hi": "सरकारी राहत शिविर",
        "te": "ప్రభుత్వ పునరావాస శిబిరం",
        "ta": "அரசு நிவாரண முகாம்",
        "ml": "ദുരിതാശ്വാസ ക്യാമ്പ്",
        "kn": "ಸರ್ಕಾರಿ ಪರಿಹಾರ ಶಿಬಿರ",
        "bn": "সরকারি ত্রাণ শিবির",
        "mr": "सरकारी मदत शिबिर",
        "gu": "સરકારી રાહત કેમ્પ",
        "pa": "ਸਰਕਾਰੀ ਰਾਹਤ ਕੈਂਪ",
        "ur": "سرکاری امدادی کیمپ",
        "as": "চৰকাৰী সাহায্য শিবিৰ",
        "or": "ସରକାରୀ ରିଲିଫ ଶିବିର",
    },
    "Danger Zone": {
        "hi": "आपदा क्षेत्र",
        "te": "ప్రమాద ప్రాంతం",
        "ta": "அபாய பகுதி",
        "ml": "അപകട മേഖല",
        "kn": "ಅಪಾಯ ವಲಯ",
        "bn": "বিপদজনক এলাকা",
        "mr": "धोकादायक क्षेत्र",
        "gu": "જોખમી વિસ્તાર",
        "pa": "ਖ਼ਤਰਾ ਖੇਤਰ",
        "ur": "خطرناک علاقہ",
        "as": "বিপদজনক অঞ্চল",
        "or": "ବିପଦପୂର୍ଣ୍ଣ ଅଞ୍ଚଳ",
    },
}


class TranslationService:
    """Service to translate emergency notices and popups with caching and fallback."""

    def __init__(self, languages: Optional[Dict[str, str]] = None):
        self.languages = languages or dict(SUPPORTED_LANGUAGES)
        # Translation cache: key is (source_lang, target_lang, text)
        self._cache: Dict[Tuple[str, str, str], str] = {}

    def translate(self, text: str, target_lang: str, source_lang: str = "en") -> str:
        """
        Translates text to target language.
        Gracefully returns English text if target is 'en' or translation fails.
        """
        if not text or target_lang == source_lang:
            return text

        cache_key = (source_lang, target_lang, text)
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Check built-in lexicon
        for phrase, lang_map in BUILT_IN_LEXICON.items():
            if text.strip() == phrase and target_lang in lang_map:
                translated = lang_map[target_lang]
                self._cache[cache_key] = translated
                return translated

        # If deep_translator is available, query GoogleTranslator
        if HAS_DEEP_TRANSLATOR and GoogleTranslator is not None:
            try:
                translator = GoogleTranslator(source=source_lang, target=target_lang)
                result = translator.translate(text)
                if result:
                    self._cache[cache_key] = result
                    return result
            except Exception:
                # Graceful fallback to original text on any network/API exception
                pass

        # Return English text fallback
        return text

    def translate_dict(self, text_dict: Dict[str, str]) -> Dict[str, str]:
        """
        Translates an English dictionary key across all supported languages.
        Matches notebook Cell 8:
            def make_translations(text_dict):
                translations = {}
                for _, code in LANGUAGES.items():
                    try:
                        translations[code] = GoogleTranslator(source='en', target=code).translate(text_dict['en'])
                    except:
                        translations[code] = text_dict['en']
                return translations
        """
        english_text = text_dict.get("en", "")
        translations: Dict[str, str] = {}

        for _, code in self.languages.items():
            if code == "en":
                translations["en"] = english_text
            else:
                try:
                    translations[code] = self.translate(english_text, target_lang=code, source_lang="en")
                except Exception:
                    translations[code] = english_text

        return translations

    def clear_cache(self) -> None:
        """Clears in-memory translation cache."""
        self._cache.clear()

    @property
    def cache_size(self) -> int:
        """Returns number of cached translations."""
        return len(self._cache)
