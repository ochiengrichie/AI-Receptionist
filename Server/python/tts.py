import sys
import json
import os
from gtts import gTTS

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python tts.py <text> <output_path>"}))
        sys.exit(1)

    text = sys.argv[1]
    output_path = sys.argv[2]

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(output_path)

        print(json.dumps({
            "success": True,
            "file": output_path
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()