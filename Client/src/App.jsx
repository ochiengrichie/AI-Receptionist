import { useEffect, useRef, useState } from "react";
import { createRealtimeSocket } from "./realtime/socket.js";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");


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
  const audioRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [transcript, setTranscript] = useState("No transcript yet");
  const [aiReply, setAiReply] = useState("No AI reply yet");
  const [businessInfo, setBusinessInfo] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [realtimeDraft, setRealtimeDraft] = useState("");

  useEffect(() => {
    const realtimeClient = createRealtimeSocket({
      onOpen: () => {
        setSocketStatus("Connected");
        setStatus("Realtime connected");

        realtimeClient.send("session:start", {
          sessionId: sessionIdRef.current,
        });
      },

      onClose: () => {
        setSocketStatus("Disconnected");
      },

      onError: () => {
        setSocketStatus("Error");
        setStatus("Socket error");
      },

      onMessage: (payload) => {
        switch (payload.type) {
          case "session:ready":
            setStatus(payload.message || "Realtime session ready");
            break;

          case "processing:start":
            setStatus(payload.message || "Processing...");
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
              playAudio(payload.audioUrl).catch((error) => {
                setStatus(error.message || "Audio playback failed");
              });
            }
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

  const stopMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const playAudio = async (url) => {
    stopAudio();
    setStatus("AI speaking...");

    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
    const audio = new Audio(fullUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setStatus("Done");
    };

    audio.onerror = () => {
      setStatus("Audio failed");
    };

    await audio.play();
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          reject(new Error("Base64 conversion failed"));
          return;
        }

        resolve(result.split(",")[1] || "");
      };

      reader.onerror = () => {
        reject(new Error("Failed to read audio chunk"));
      };

      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    try {
      stopAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      if (
        !realtimeClientRef.current ||
        realtimeClientRef.current.readyState !== WebSocket.OPEN
      ) {
        throw new Error("Socket not connected");
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          try {
            const base64 = await blobToBase64(event.data);

            realtimeClientRef.current.send("audio:chunk", {
              sessionId: sessionIdRef.current,
              mimeType: event.data.type || "audio/webm",
              data: base64,
            });
          } catch (error) {
            console.error("Audio chunk error:", error);
            setStatus(error.message || "Failed to send audio chunk");
          }
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setStatus("Recording...");
        setTranscript("Listening...");
        setAiReply("Waiting...");
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setStatus("Processing audio...");

        try {
          realtimeClientRef.current?.send("audio:end", {
            sessionId: sessionIdRef.current,
          });
        } catch (error) {
          setStatus(error.message || "Failed to finalize audio");
        } finally {
          stopMicrophone();
        }
      };

      recorder.start(300);
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Mic failed");
      stopMicrophone();
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;

    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  };

  const sendRealtimeMessage = () => {
    const text = realtimeDraft.trim();
    if (!text) return;

    try {
      realtimeClientRef.current?.send("conversation:text", {
        sessionId: sessionIdRef.current,
        text,
      });

      setRealtimeDraft("");
    } catch (error) {
      setStatus(error.message || "Failed to send message");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>AI Receptionist</h1>

      <div style={{ display: "flex", gap: 10 }}>
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
        <strong>Socket:</strong> {socketStatus}
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={realtimeDraft}
          onChange={(e) => setRealtimeDraft(e.target.value)}
          placeholder="Test message"
        />
        <button
          onClick={sendRealtimeMessage}
          disabled={socketStatus !== "Connected"}
        >
          Send
        </button>
      </div>

      <h3>Transcript</h3>
      <p>{transcript}</p>

      <h3>AI Reply</h3>
      <p>{aiReply}</p>

      {businessInfo && (
        <>
          <h3>Business</h3>
          <p>
            <strong>{businessInfo.businessName}</strong> with{" "}
            {businessInfo.receptionistName}. Hours: {businessInfo.businessHours}
          </p>
          <p>Services: {businessInfo.servicesOffered?.join(", ")}</p>
        </>
      )}
    </div>
  );
}