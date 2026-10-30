from __future__ import annotations

from types import SimpleNamespace

from src.config import LengthSpec
from src.generator import GeminiGenerator


class FakeModels:
    def __init__(self, text: str) -> None:
        self.text = text
        self.calls = 0

    def generate_content(self, **kwargs):
        self.calls += 1
        assert "model" in kwargs
        return SimpleNamespace(text=self.text)


class FakeClient:
    def __init__(self, text: str) -> None:
        self.models = FakeModels(text)


def test_gemini_generator_uses_mocked_client(settings) -> None:
    payload = '{"title": "Mocked title about routines", "body": "%s"}' % ("A" * 220)
    client = FakeClient(payload)
    gen = GeminiGenerator(settings, client=client, sleep=lambda _: None)
    post = gen.generate(
        category="discussion",
        style="casual",
        length_name="short",
        length=LengthSpec(10, 5000),
        previous_titles=[],
    )
    assert post.title.startswith("Mocked")
    assert client.models.calls == 1
