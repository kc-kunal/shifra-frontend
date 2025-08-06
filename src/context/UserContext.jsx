import React, { createContext, useState, useRef, useEffect } from "react";

// Create context to share speech and recognition data
export const dataContext = createContext();

// Your backend API URL from environment variables
const backendUrl = import.meta.env.VITE_APP_API_URL;

function UserProvider({ children }) {
  // States to track speaking status, recognized text, AI response flag
  const [speaking, setSpeaking] = useState(false);
  const [recogText, setRecogText] = useState("Listening...");
  const [aiResponce, setAiResponce] = useState(false);

  // New flag to prevent double starting recognition
  const [listening, setListening] = useState(false);

  const recognition = useRef(null);

  useEffect(() => {
    window.speechSynthesis.getVoices();

    // Setup SpeechRecognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecogText("Speech Recognition API not supported in this browser.");
      return;
    }

    recognition.current = new SpeechRecognition();

    recognition.current.continuous = true; // Keep listening continuously
    recognition.current.interimResults = false; // Final results only
    recognition.current.lang = "en-IN"; // Indian English

    recognition.current.onresult = (event) => {
      if (event.results && event.results[0]) {
        const transcript = event.results[0][0].transcript;
        setRecogText(transcript);
        takeCommand(transcript.toLowerCase());
      }
    };

    recognition.current.onerror = (event) => {
      console.error("🎤 Speech recognition error:", event.error);
      setRecogText("Mic error: " + event.error);
      setSpeaking(false);
      setListening(false);
    };

    recognition.current.onend = () => {
  setListening(false); // 🔹 Mark as stopped

  if (speaking) {
    try {
      recognition.current.start(); // 🔸 Restart if user is still speaking
      setListening(true);
    } catch (err) {
      console.error("Failed to restart recognition:", err);
    }
  }
};


    return () => {
      if (recognition.current) {
        recognition.current.stop();
        recognition.current = null;
      }
    };
  }, [speaking]);

  // Text to speech function
  async function speak(replyText) {
    const synth = window.speechSynthesis;

    const loadVoices = () =>
      new Promise((resolve) => {
        let voices = synth.getVoices();
        if (voices.length) return resolve(voices);
        synth.onvoiceschanged = () => {
          voices = synth.getVoices();
          resolve(voices);
        };
      });

    const voices = await loadVoices();

    const textSpeak = new SpeechSynthesisUtterance(replyText);
    textSpeak.volume = 1;
    textSpeak.rate = 1;
    textSpeak.pitch = 1;

    // Prefer Hindi voice if available, else English or first voice
    const voice =
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    textSpeak.voice = voice;
    textSpeak.lang = voice.lang;

    synth.cancel(); // Clear queued speech

    textSpeak.onend = () => {
      // After speech ends, restart listening if not already listening
      if (!speaking) {
        setSpeaking(true);
        if (recognition.current && !listening) {
          try {
            recognition.current.start();
            setListening(true);
            setRecogText("Listening...");
          } catch (err) {
            console.error("Failed to start recognition after speaking:", err);
          }
        }
      }
    };

    synth.speak(textSpeak);
  }

  // Call backend API with transcript and get AI response
  async function getResponse(transcript) {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Answer in less than 20 words: ${transcript}` }],
        },
      ],
    };

    try {
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from backend");
      }

      const aireplyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply received.";
      const replyText = aireplyText.replace(/google/gi, "kc kunal");

      setRecogText(replyText);
      speak(replyText);
      setAiResponce(true);

      setTimeout(() => {
        setSpeaking(false);
        setAiResponce(false);
        setRecogText("Listening...");
      }, 7000);
    } catch (err) {
      console.error("Fetch error:", err);
      speak("माफ़ कीजिये, kc Kunal से जवाब नहीं मिल पाया");
      setRecogText("No response from backend.");
      setSpeaking(false);
      setAiResponce(false);
    }
  }

  // Interpret user commands or fallback to AI backend
  const takeCommand = (command) => {
    if (command.includes("open youtub")) {
      window.open("https://www.youtube.com/", "_blank");
      speak("opening youtube");
      setRecogText("opening youtube");
    } else if (command.includes("time") || command.includes("samay")) {
      const time = new Date().toLocaleString(undefined, {
        hour: "numeric",
        minute: "numeric",
      });
      speak(time);
      setRecogText(time);
    } else if (command.includes("open instagram")) {
      window.open("https://www.instagram.com/accounts/login/", "_blank");
      speak("opening instagram");
      setRecogText("opening instagram");
    } else {
      getResponse(command);
      return;
    }

    setTimeout(() => {
      setSpeaking(false);
      setAiResponce(false);
      setRecogText("Listening...");
    }, 7000);
  };

  // Start microphone listening with permissions check
 const startListening = async () => {
  try {
    // Ask for microphone access
    await navigator.mediaDevices.getUserMedia({ audio: true });

    // Check if recognition is ready
    if (!recognition.current) {
      setRecogText("Speech recognition not ready");
      return;
    }

    // Prevent double start (common Android issue)
    if (listening) {
      console.warn("Recognition already started");
      return;
    }

    // Start speech recognition
    recognition.current.start();
    setListening(true);
    setSpeaking(true);
    setRecogText("Listening...");
  } catch (err) {
    console.error("🎤 Mic access or recognition start error:", err);
    setRecogText("Mic access denied or error");
    setSpeaking(false);
    setListening(false);
  }
};


  // Context data provided to components
  const data = {
    speak,
    speaking,
    setSpeaking,
    recogText,
    setRecogText,
    aiResponce,
    startListening,
  };

  return <dataContext.Provider value={data}>{children}</dataContext.Provider>;
}

export default UserProvider;
