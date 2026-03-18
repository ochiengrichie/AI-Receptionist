import sys
import json
from faster_whisper import WhisperModel

# Load once at module level
model = WhisperModel("base", compute_type="int8")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        segments, info = model.transcribe(audio_path, language="en", task="transcribe")

        # Convert generator to list ONCE so it can be iterated twice
        segments_list = list(segments)

        transcript = " ".join(s.text.strip() for s in segments_list).strip()

        print(json.dumps({
            "transcript": transcript,
            "language": info.language,
            "duration": info.duration,
            "segments": [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments_list]
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()