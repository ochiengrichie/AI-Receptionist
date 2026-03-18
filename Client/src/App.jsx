import { useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(createSessionId());

  // Holds the currently playing AI audio so we can stop/replace it cleanly
  const audioRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [transcript, setTranscript] = useState("No transcript yet");
  const [aiReply, setAiReply] = useState("No AI reply yet");
  const [businessInfo, setBusinessInfo] = useState(null);

  // Helper: stop microphone stream safely
  const stopMicrophoneStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Helper: stop any AI audio currently playing
  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  // Day 4: call backend TTS endpoint and play returned audio
  const speakAIReply = async (text) => {
    setStatus("Generating speech...");

    const ttsResponse = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const ttsData = await ttsResponse.json().catch(() => ({}));

    if (!ttsResponse.ok) {
      throw new Error(ttsData.error || "Failed to generate speech");
    }

    // Stop previous audio before playing a new one
    stopCurrentAudio();

    setStatus("AI speaking...");

    const audioSource = ttsData.audioUrl || `${API_BASE}${ttsData.audioPath || ""}`;
    if (!audioSource) {
      throw new Error("No audio URL returned from TTS");
    }

    const audio = new Audio(audioSource);
    audioRef.current = audio;

    // When playback ends, update status
    audio.onended = () => {
      setStatus("Done");
    };

    audio.onerror = () => {
      setStatus("Audio playback failed");
    };

    await audio.play();
  };

  const startRecording = async () => {
    try {
      // Stop any previous AI voice if user starts a new recording
      stopCurrentAudio();

      setStatus("Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Reset audio chunks for the new recording
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks while recording
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus("Recording...");
        setTranscript("Listening...");
        setAiReply("Waiting for AI reply...");
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setStatus("Processing audio...");

        // Build a single audio blob from the recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Send audio file to backend STT endpoint
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          // 1) Speech-to-Text
          const transcribeResponse = await fetch(`${API_BASE}/transcribe`, {
            method: "POST",
            body: formData,
          });

          const transcribeData = await transcribeResponse.json().catch(() => ({}));

          if (!transcribeResponse.ok) {
            throw new Error(
              transcribeData.error ||
                transcribeData.message ||
                "Failed to transcribe audio"
            );
          }

          const returnedTranscript =
            transcribeData.transcript?.trim() || "No transcript returned";

          setTranscript(returnedTranscript);

          // 2) Send transcript to AI
          setStatus("Generating AI reply...");

          const aiResponse = await fetch(`${API_BASE}/ai`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: returnedTranscript,
              sessionId: sessionIdRef.current,
            }),
          });

          const aiData = await aiResponse.json().catch(() => ({}));

          if (!aiResponse.ok) {
            throw new Error(aiData.error || "Failed to generate AI reply");
          }

          const reply = aiData.reply?.trim() || "No AI reply returned";
          if (aiData.sessionId) {
            sessionIdRef.current = aiData.sessionId;
          }
          if (aiData.businessContext) {
            setBusinessInfo(aiData.businessContext);
          }
          setAiReply(reply);

          // 3) Day 4: Convert AI reply to speech and play it
          await speakAIReply(reply);
        } catch (error) {
          console.error("Processing error:", error);
          setTranscript((prev) =>
            prev === "Listening..." ? "Could not get transcript" : prev
          );
          setAiReply(error.message || "Could not get AI reply");
          setStatus("Transcription / AI / TTS failed");
        } finally {
          // Always release microphone after stopping
          stopMicrophoneStream();
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Microphone error:", error);
      setStatus("Microphone access denied or failed");
      stopMicrophoneStream();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        fontFamily: "Arial",
        lineHeight: "1.6",
      }}
    >
      <h1>AI Receptionist</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={startRecording} disabled={isRecording}>
          Start Recording
        </button>

        <button onClick={stopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
      </div>

      <p>
        <strong>Status:</strong> {status}
      </p>

      <h3>Transcript</h3>
      <p>{transcript}</p>

      <h3>AI Reply</h3>
      <p>{aiReply}</p>

      {businessInfo ? (
        <>
          <h3>Business Context</h3>
          <p>
            <strong>{businessInfo.businessName}</strong> with{" "}
            {businessInfo.receptionistName}. Hours: {businessInfo.businessHours}.
          </p>
          <p>Services: {businessInfo.servicesOffered?.join(", ")}</p>
        </>
      ) : null}
    </div>
  );
}
