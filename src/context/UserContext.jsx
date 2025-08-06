import React, { createContext, useState, useRef, useEffect } from "react";

export const dataContext = createContext();
const backendUrl = import.meta.env.VITE_APP_API_URL;

function UserProvider({ children }) {
  const [speaking, setSpeaking] = useState(false);
  const [recogText, setRecogText] = useState("Listening...");
  const [aiResponce, setAiResponce] = useState(false);
  const [listening, setListening] = useState(false);

  const recognition = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecogText("Speech Recognition not supported");
      return;
    }

    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-IN";

    recognition.current.onresult = (event) => {
      if (event.results?.[0]) {
        const transcript = event.results[0][0].transcript;
        setRecogText(transcript);
        takeCommand(transcript.toLowerCase());
      }
    };

    recognition.current.onerror = (event) => {
      console.error("Speech error:", event.error);
      setRecogText("Mic error: " + event.error);
      setSpeaking(false);
      setListening(false);
    };

    recognition.current.onend = () => {
      setListening(false);
      if (speaking) {
        // Restart if user still wants listening
        try {
          recognition.current.start();
          setListening(true);
        } catch (err) {
          console.error("Restart failed:", err);
        }
      }
    };

    return () => {
      recognition.current?.stop();
      recognition.current = null;
    };
  }, [speaking]);

  const speak = async (replyText) => {
    const synth = window.speechSynthesis;
    const loadVoices = () =>
      new Promise((resolve) => {
        let voices = synth.getVoices();
        if (voices.length) return resolve(voices);
        synth.onvoiceschanged = () => resolve(synth.getVoices());
      });

    const voices = await loadVoices();
    const textSpeak = new SpeechSynthesisUtterance(replyText);
    textSpeak.voice =
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    textSpeak.lang = textSpeak.voice.lang;
    textSpeak.volume = 1;
    textSpeak.rate = 1;
    textSpeak.pitch = 1;

    synth.cancel();
    textSpeak.onend = () => {
      // Restart listening if needed
      setSpeaking(true);
      setAiResponce(false);
      if (recognition.current && !listening) {
        try {
          recognition.current.start();
          setListening(true);
          setRecogText("Listening...");
        } catch (err) {
          console.error("Speech restart failed:", err);
        }
      }
    };

    synth.speak(textSpeak);
  };

  const getResponse = async (transcript) => {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Answer in less than 20 words: ${transcript}` }],
        },
      ],
    };

    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      const data = JSON.parse(raw);
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply received.";

      const finalReply = reply.replace(/google/gi, "kc kunal");
      setRecogText(finalReply);
      setAiResponce(true);
      speak(finalReply);
    } catch (err) {
      console.error("Backend error:", err);
      speak("माफ़ कीजिये, Kunal से जवाब नहीं मिल पाया");
      setRecogText("No response from backend.");
      setSpeaking(false);
      setAiResponce(false);
    }
  };

  const takeCommand = (command) => {
    if (command.includes("open youtub")) {
      window.open("https://www.youtube.com/", "_blank");
      speak("opening youtube");
      setRecogText("opening youtube");
    } else if (command.includes("time") || command.includes("samay")) {
      const time = new Date().toLocaleTimeString();
      speak(time);
      setRecogText(time);
    } else if (command.includes("open instagram")) {
      window.open("https://www.instagram.com/accounts/login/", "_blank");
      speak("opening instagram");
      setRecogText("opening instagram");
    } else {
      getResponse(command);
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
      if (!recognition.current) {
        setRecogText("Speech recognition not initialized");
        return;
      }
      if (listening) {
        console.warn("Already listening...");
        return;
      }

      recognition.current.start();
      setListening(true);
      setSpeaking(true);
      setRecogText("Listening...");
    } catch (err) {
      console.error("Mic error:", err);
      setRecogText("Mic access denied or error");
      setSpeaking(false);
      setListening(false);
    }
  };

  return (
    <dataContext.Provider
      value={{
        speak,
        speaking,
        setSpeaking,
        recogText,
        setRecogText,
        aiResponce,
        startListening,
      }}
    >
      {children}
    </dataContext.Provider>
  );
}

export default UserProvider;
