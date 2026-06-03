"""
IntelliLaw — Local LLM Service
Offline GGUF inference via llama-cpp-python
"""
import os
import sys
import threading
import logging
import multiprocessing
from pathlib import Path
from typing import Optional, Dict

from app.model_registry import detect_model_format
from app.tenant import get_firm_dir

# Load .env — backend/ is two levels up from this file
from dotenv import load_dotenv
if getattr(sys, "frozen", False):
    _env_path = Path(sys._MEIPASS) / ".env"
else:
    # backend/app/local_llm_service.py → parents[1] = backend/
    _env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_env_path, override=False)

logger = logging.getLogger(__name__)

_model_lock = threading.Lock()
_model = None
_model_info: Dict = {}


def detect_cpu_threads() -> int:
    try:
        logical = multiprocessing.cpu_count() or 4
        return max(2, min(logical // 2, logical))
    except Exception:
        return 4


def detect_cuda_layers() -> int:
    try:
        import subprocess
        r = subprocess.run(["nvidia-smi"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode == 0:
            return int(os.getenv("LLM_GPU_LAYERS", "35"))
    except Exception:
        pass
    return 0


def get_model_path() -> Path:
    model_name = os.getenv("DEFAULT_MODEL")
    model_dir  = get_firm_dir() / "models"
    if not model_name:
        raise RuntimeError("DEFAULT_MODEL not set in .env")
    model_path = (model_dir / model_name).resolve()
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}\n"
            f"Download a GGUF model and place it in {model_dir}"
        )
    return model_path


def load_model():
    """Load local GGUF model. Skipped automatically when DEMO_MODE=true."""
    global _model, _model_info

    # Respect demo mode — don't try to load a model that isn't there
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    if demo_mode:
        logger.info("DEMO_MODE=true — local model load skipped")
        return None

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model
        try:
            model_path   = get_model_path()
        except FileNotFoundError as e:
            logger.warning(f"Local model not found (running without offline AI): {e}")
            return None

        model_format = detect_model_format(model_path)
        n_threads    = int(os.getenv("LLM_THREADS", detect_cpu_threads()))
        n_gpu_layers = detect_cuda_layers()
        n_ctx        = int(os.getenv("LLM_CONTEXT_WINDOW", "4096"))
        is_gpu       = n_gpu_layers > 0

        logger.info(f"Loading model: {model_path.name}")
        try:
            from llama_cpp import Llama
        except ImportError:
            logger.warning("llama-cpp-python not installed — offline AI unavailable")
            return None

        _model = Llama(
            model_path=str(model_path),
            n_ctx=n_ctx, n_threads=n_threads,
            n_gpu_layers=n_gpu_layers,
            n_batch=512 if is_gpu else 256,
            use_mmap=True,
            use_mlock=os.name != "nt",
            verbose=False,
            flash_attn=is_gpu,
        )
        _model_info = {
            "model": model_path.name, "format": model_format,
            "threads": n_threads, "gpu_layers": n_gpu_layers,
            "context_window": n_ctx, "backend": "llama.cpp",
            "offline": True, "loaded": True,
        }
        logger.info(f"Model loaded: {model_path.name}")
        return _model


def format_prompt(prompt: str, system: Optional[str] = None) -> str:
    fmt    = os.getenv("MODEL_FORMAT", "qwen").lower()
    system = system or "You are IntelliLaw AI, an expert offline legal assistant for African law firms."

    if fmt == "qwen":
        return (f"<|im_start|>system\n{system}<|im_end|>\n"
                f"<|im_start|>user\n{prompt}<|im_end|>\n"
                f"<|im_start|>assistant\n")
    if fmt == "phi":
        return (f"<|system|>\n{system}<|end|>\n"
                f"<|user|>\n{prompt}<|end|>\n<|assistant|>\n")
    if fmt == "gemma":
        return (f"<start_of_turn>user\n{prompt}<end_of_turn>\n"
                f"<start_of_turn>model\n")
    return f"{system}\n\n{prompt}"


def generate_text(prompt: str, max_tokens: int = 1500,
                  system_message: Optional[str] = None) -> str:
    model = load_model()
    if model is None:
        raise RuntimeError("Local model not available — enable DEMO_MODE=true or download a GGUF model")
    formatted = format_prompt(prompt, system=system_message)
    stop_tokens = ["<|im_end|>", "<|end|>", "<end_of_turn>", "</s>", "[INST]"]
    response = model(
        formatted, max_tokens=max_tokens,
        temperature=0.7, top_p=0.9, repeat_penalty=1.15,
        top_k=40, stop=stop_tokens, echo=False,
    )
    return response["choices"][0]["text"].strip()


def get_ai_status() -> Dict:
    demo = os.getenv("DEMO_MODE", "false").lower() == "true"
    return {
        "available": _model is not None or demo,
        "mode": "demo" if demo else ("loaded" if _model else "unavailable"),
        **(_model_info or {}),
    }
