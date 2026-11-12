import re
from importlib.resources import files

_VERSION_PATTERN = re.compile(r"\A<!--\s*prompt-version:\s*([A-Za-z0-9._-]+)\s*-->\s*")


def _read_prompt_file(filename: str) -> str:
    return files("ai_service").joinpath("prompts", filename).read_text(encoding="utf-8").strip()


def load_prompt(filename: str) -> str:
    """Load a Markdown prompt bundled with the ai_service Python package."""
    return _read_prompt_file(filename)


def load_versioned_prompt(filename: str) -> tuple[str, str]:
    """Load prompt text and its version marker from the first Markdown comment."""
    content = _read_prompt_file(filename)
    match = _VERSION_PATTERN.match(content)
    if match is None:
        raise ValueError(f"Prompt file {filename!r} must start with a prompt-version comment")
    prompt = content[match.end() :].strip()
    if not prompt:
        raise ValueError(f"Prompt file {filename!r} has no prompt text")
    return prompt, match.group(1)
