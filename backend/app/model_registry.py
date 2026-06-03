from pathlib import Path

MODEL_SIGNATURES = {
    "qwen":  ["qwen", "im_start"],
    "phi":   ["phi-3", "phi3"],
    "gemma": ["gemma"],
    "llama": ["llama", "mistral"],
}

def detect_model_format(model_path: Path) -> str:
    name = model_path.name.lower()
    for fmt, kws in MODEL_SIGNATURES.items():
        if any(k in name for k in kws):
            return fmt
    return "llama"
