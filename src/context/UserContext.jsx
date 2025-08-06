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
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setRecogText("Speech Recognition not supported");
      return;
    }
    recognition.current = new SR();
    recognition.current.continuous = true;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-IN";

    recognition.current.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) {
        setRecogText(transcript);
        takeCommand(transcript.toLowerCase());
      }
    };

    recognition.current.onerror = (e) => {
      console.error("Speech error:", e.error);
      setRecogText("Mic error: " + e.error);
      setSpeaking(false);
      setListening(false);
    };

    recognition.current.onend = () => {
      setListening(false);
      if (speaking && !listening) {
        setTimeout(() => {
          try {
            recognition.current.start();
            setListening(true);
          } catch (err) {
            console.error("Restart failed:", err);
          }
        }, 300);
      }
    };

    return () => {
      recognition.current?.stop();
    };
  }, [speaking]);

  const speak = async (replyText) => {
    const synth = window.speechSynthesis;
    const voices = await new Promise((r) => {
      const v = synth.getVoices();
      if (v.length) return r(v);
      synth.onvoiceschanged = () => r(synth.getVoices());
    });
    const msg = new SpeechSynthesisUtterance(replyText);
    msg.voice = voices.find(v => v.lang === "hi-IN") || voices.find(v => v.lang.startsWith("en")) || voices[0];
    msg.lang = msg.voice.lang;
    msg.volume = msg.rate = msg.pitch = 1;
    synth.cancel();
    msg.onend = () => {
      setSpeaking(false);
      setAiResponce(false);
      setTimeout(() => {
        if (recognition.current && !listening) {
          try {
            recognition.current.start();
            setListening(true);
            setRecogText("Listening...");
            setSpeaking(true);
          } catch (err) {
            console.error("Restart after speech failed:", err);
          }
        }
      }, 400);
    };
    synth.speak(msg);
  };

  const getResponse = async (transcript) => {
    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: transcript }] }] }),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";
      const final = reply.replace(/google/gi, "kc kunal");
      setRecogText(final);
      setAiResponce(true);
      speak(final);
    } catch (err) {
      console.error(err);
      setRecogText("No response from backend.");
      speak("माफ़ कीजिये, जवाब नहीं मिला");
      setSpeaking(false);
      setAiResponce(false);
    }
  };

  const takeCommand = (cmd) => {
    if (cmd.includes("open youtube")) {
      window.open("https://youtube.com", "_blank");
      speak("Opening YouTube");
      setRecogText("Opening YouTube");
    } else if (cmd.includes("time") || cmd.includes("samay")) {
      const time = new Date().toLocaleTimeString();
      speak(time);
      setRecogText(time);
    } else if (cmd.includes("open instagram")) {
      window.open("https://instagram.com", "_blank");
      speak("Opening Instagram");
      setRecogText("Opening Instagram");
    } else {
      getResponse(cmd);
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
      if (listening) return;
      recognition.current.start();
      setListening(true);
      setSpeaking(true);
      setRecogText("Listening...");
    } catch (err) {
      console.error("Mic start error:", err);
      setRecogText("Mic access error");
      setSpeaking(false);
      setListening(false);
    }
  };

  return (
    <dataContext.Provider
      value={{
        speak,
        speaking,
        recogText,
        aiResponce,
        startListening,
      }}
    >
      {children}
    </dataContext.Provider>
  );
}

export default UserProvider;
