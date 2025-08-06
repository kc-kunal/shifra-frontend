import React, { createContext, useState, useRef, useEffect } from "react";

export const dataContext = createContext();

const backendUrl = import.meta.env.VITE_APP_API_URL;

if (!backendUrl) {
  throw new Error("❌ VITE_APP_API_URL is not defined in environment variables.");
}

function UserProvider({ children }) {
  const [speaking, setSpeaking] = useState(false);
  const [recogText, setRecogText] = useState("Listening...");
  const [aiResponce, setAiResponce] = useState(false);
  const recognition = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("❌ SpeechRecognition not supported.");
      setRecogText("Speech recognition not supported on this device/browser.");
      return;
    }

    window.speechSynthesis.getVoices();
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-IN";

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
    };

    recognition.current.onend = () => {
      if (speaking) {
        try {
          recognition.current.start();
        } catch (err) {
          console.error("Auto-restart failed:", err);
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
    const voice = voices.find(v => v.lang === "hi-IN") || voices.find(v => v.lang.startsWith("en")) || voices[0];

    const textSpeak = new SpeechSynthesisUtterance(replyText);
    textSpeak.volume = 1;
    textSpeak.rate = 1;
    textSpeak.pitch = 1;
    textSpeak.voice = voice;
    textSpeak.lang = voice.lang;

    synth.cancel(); // Cancel any pending speech

    textSpeak.onend = () => {
      if (!speaking) {
        setSpeaking(true);
        recognition.current?.start();
        setRecogText("Listening...");
      }
    };

    synth.speak(textSpeak);
  }

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

      const data = await response.json();
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

  const takeCommand = (command) => {
    if (command.includes("open youtub")) {
      window.open("https://www.youtube.com/", "_blank");
      speak("opening youtube");
      setRecogText("opening youtube");
    } else if (command.includes("time") || command.includes("samay")) {
      const time = new Date().toLocaleString(undefined, { hour: "numeric", minute: "numeric" });
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

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.current?.start();
      setRecogText("Listening...");
      setSpeaking(true);
    } catch (err) {
      console.error("🎤 Mic access or recognition start error:", err);
      setRecogText("Mic access denied or error");
      setSpeaking(false);
    }
  };

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
