import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "./realtime/socket.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_BACKEND_ORIGIN = "http://localhost:3000";

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(createSessionId());
  const realtimeClientRef = useRef(null);

  // Holds the currently playing AI audio so we can stop/replace it cleanly
  const audioRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [transcript, setTranscript] = useState("No transcript yet");
  const [aiReply, setAiReply] = useState("No AI reply yet");
  const [businessInfo, setBusinessInfo] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [realtimeDraft, setRealtimeDraft] = useState("");

  useEffect(() => {
    // Keep socket setup in one effect so the connection is created only once per page load.
    const realtimeClient = createRealtimeSocket({
      onOpen: () => {
        setSocketStatus("Connected");
        setStatus("Realtime channel connected");

        realtimeClient.send("session:start", {
          sessionId: sessionIdRef.current,
        });
      },
      onClose: () => {
        setSocketStatus("Disconnected");
      },
      onError: () => {
        setSocketStatus("Error");
      },
      onMessage: (payload) => {
        switch (payload.type) {
          case "session:ready":
            setStatus(payload.message || "Realtime session ready");
            break;
          case "transcript:final":
            setTranscript(payload.transcript || "No transcript returned");
            break;
          case "ai:reply":
            setAiReply(payload.reply || "No AI reply returned");
            if (payload.businessContext) {
              setBusinessInfo(payload.businessContext);
            }
            break;
          case "tts:ready":
            if (payload.audioUrl) {
              playAudioFromUrl(payload.audioUrl).catch((error) => {
                setStatus(error.message || "Audio playback failed");
              });
            }
            break;
          case "processing:start":
            setStatus(payload.message || "Processing realtime audio");
            break;
          case "error":
            setStatus(payload.message || "Realtime request failed");
            break;
          default:
            break;
        }
      },
    });

    realtimeClientRef.current = realtimeClient;

    return () => {
      realtimeClient.close();
      realtimeClientRef.current = null;
    };
  }, []);

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

  const playAudioFromUrl = async (audioUrl) => {
    // Stop previous audio before playing a new one
    stopCurrentAudio();

    setStatus("AI speaking...");

    const resolvedAudioUrl = audioUrl.startsWith("http")
      ? audioUrl
      : `${API_BASE_URL || DEFAULT_BACKEND_ORIGIN}${audioUrl}`;
    const audio = new Audio(resolvedAudioUrl);
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

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to convert audio chunk to base64"));
          return;
        }

        // FileReader returns a data URL, so we only keep the base64 payload after the comma.
        resolve(result.split(",")[1] || "");
      };

      reader.onerror = () => {
        reject(new Error("Failed to read audio chunk"));
      };

      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    try {
      // Stop any previous AI voice if user starts a new recording
      stopCurrentAudio();

      setStatus("Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (socketStatus !== "Connected" || !realtimeClientRef.current) {
        throw new Error("Realtime socket is not connected");
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Each chunk is sent over the socket immediately so the backend can build the request incrementally.
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          try {
            const base64Data = await blobToBase64(event.data);

            realtimeClientRef.current.send("audio:chunk", {
              sessionId: sessionIdRef.current,
              mimeType: event.data.type || "audio/webm",
              data: base64Data,
            });
          } catch (error) {
            console.error("Audio chunk error:", error);
            setStatus(error.message || "Failed to stream audio chunk");
          }
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

        try {
          realtimeClientRef.current?.send("audio:end", {
            sessionId: sessionIdRef.current,
          });
        } catch (error) {
          console.error("Realtime processing error:", error);
          setStatus(error.message || "Failed to finalize realtime audio");
        } finally {
          stopMicrophoneStream();
        }
      };

      // A short timeslice causes MediaRecorder to fire chunk events while the user is still speaking.
      mediaRecorder.start(300);
    } catch (error) {
      console.error("Microphone error:", error);
      setStatus(error.message || "Microphone access denied or failed");
      stopMicrophoneStream();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const sendRealtimeMessage = () => {
    const text = realtimeDraft.trim();
    if (!text) {
      return;
    }

    try {
      realtimeClientRef.current?.send("conversation:text", {
        sessionId: sessionIdRef.current,
        text,
      });
      setStatus("Realtime text sent");
      setRealtimeDraft("");
    } catch (error) {
      setStatus(error.message || "Failed to send realtime message");
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

      <p>
        <strong>Realtime Socket:</strong> {socketStatus}
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          value={realtimeDraft}
          onChange={(event) => setRealtimeDraft(event.target.value)}
          placeholder="Send a realtime test message"
          style={{ flex: 1, padding: "8px" }}
        />
        <button onClick={sendRealtimeMessage} disabled={socketStatus !== "Connected"}>
          Send Realtime Text
        </button>
      </div>

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
