"""Exercise native transcription locale routing without loading audio/ML packages."""
import ast
import base64
import io
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch
import wave


class NativeTranscriptionLanguages(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = Path(__file__).with_name("studio_engine.py")
        tree = ast.parse(source.read_text(encoding="utf-8"))
        engine = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Engine")
        method = next(node for node in engine.body if isinstance(node, ast.FunctionDef) and node.name == "_transcribe_audio")
        namespace = {"base64": base64, "io": io, "wave": wave}
        exec(compile(ast.Module(body=[method], type_ignores=[]), str(source), "exec"), namespace)
        cls.transcribe = staticmethod(namespace["_transcribe_audio"])

    def setUp(self):
        self.payloads = []
        self.whisper_languages = []
        response = types.SimpleNamespace(status_code=200, raise_for_status=lambda: None,
                                         json=lambda: {"text": "sample transcript"})

        def post(_url, **kwargs):
            self.payloads.append(kwargs["json"])
            return response

        self.transcribe.__globals__["mk"] = types.SimpleNamespace(
            sr=types.SimpleNamespace(AudioData=lambda *_args: object()),
            requests=types.SimpleNamespace(post=post),
        )

        def model_transcribe(_samples, **kwargs):
            self.whisper_languages.append(kwargs["language"])
            return [types.SimpleNamespace(text="sample transcript")], {}

        model = types.SimpleNamespace(transcribe=model_transcribe)
        self.engine = types.SimpleNamespace(_get_whisper_model=lambda: model, wispr_api_key="unit-test-placeholder")

    def test_whisper_uses_selected_supported_language(self):
        class Samples:
            def astype(self, _dtype): return self
            def __truediv__(self, _value): return self

        numpy = types.SimpleNamespace(int16=object(), float32=object(), frombuffer=lambda *_args, **_kwargs: Samples())
        cases = [("bn-BD", "bn"), ("en-US", "en"), ("ar-SA", "ar"),
                 ("hi-IN", "hi"), ("ur-PK", "ur"), ("AR_SA", "ar"), ("fr-FR", "en")]
        with patch.dict(sys.modules, {"numpy": numpy}):
            for locale, expected in cases:
                with self.subTest(locale=locale):
                    self.assertEqual(self.transcribe(self.engine, b"\0\0", "local_whisper", locale), "sample transcript")
                    self.assertEqual(self.whisper_languages[-1], expected)
        self.assertEqual(self.payloads, [])

    def test_wispr_payload_preserves_selected_language(self):
        cases = [("bn-BD", "bn"), ("en-US", "en"), ("ar-SA", "ar"),
                 ("hi-IN", "hi"), ("ur-PK", "ur"), ("UR_PK", "ur"), (None, "en")]
        for locale, expected in cases:
            with self.subTest(locale=locale):
                self.assertEqual(self.transcribe(self.engine, b"\0\0", "wispr", locale), "sample transcript")
                self.assertEqual(self.payloads[-1]["properties"]["language"], expected)
                self.assertEqual(self.payloads[-1]["language"], [expected, "bn" if expected == "en" else "en"])


if __name__ == "__main__":
    unittest.main()
