"""
IntelliLaw — Demo / Cloud Mode
Switches between offline local LLM and Anthropic API
"""
import os
import logging

logger = logging.getLogger("IntelliLaw")


def _demo_mode() -> bool:
    return os.getenv("DEMO_MODE", "false").lower() == "true"


def _api_key() -> str:
    return os.getenv("ANTHROPIC_API_KEY", "")


def is_demo_mode_available() -> bool:
    return _demo_mode() and bool(_api_key())


def generate_with_anthropic(prompt: str, system_prompt: str = "", max_tokens: int = 3000) -> str:
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=_api_key())
        logger.info("DEMO MODE: Anthropic Claude API")
        full = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": full}]
        )
        return msg.content[0].text
    except ImportError:
        raise Exception("anthropic package not installed — run: pip install anthropic")
    except Exception as e:
        raise Exception(f"Anthropic API error: {e}")


def smart_generate(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 3000,
    local_generate_func=None,
) -> str:
    if is_demo_mode_available():
        try:
            return generate_with_anthropic(prompt, system_prompt, max_tokens)
        except Exception as e:
            logger.warning(f"Demo mode failed, falling back to local: {e}")

    if local_generate_func:
        logger.info("OFFLINE MODE: local LLM")
        return local_generate_func(prompt, system_prompt, max_tokens)

    raise Exception("No generation method available — load a local model or configure ANTHROPIC_API_KEY")


def get_demo_status() -> dict:
    available = is_demo_mode_available()
    return {
        "demo_mode_enabled": _demo_mode(),
        "api_key_configured": bool(_api_key()),
        "available": available,
        "mode": "cloud_fast" if available else "offline_local",
        "description": "Cloud Mode: ~3s (Claude Haiku)" if available else "Offline Mode: local LLM",
        "provider": "anthropic",
    }
