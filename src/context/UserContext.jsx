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

    recognition.current.onresult = (event) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;
      if (transcript) {
        setRecogText(transcript);
        takeCommand(transcript.toLowerCase());
      }
    };

    recognition.current.onerror = (event) => {
      console.error("Mic error:", event.error);
      setRecogText("Mic error: " + event.error);
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

  // ... rest of your code remains unchanged
  // speak, getResponse, takeCommand, startListening functions unchanged.

  const speak = async (replyText) => {
    const synth = window.speechSynthesis;
    const voices = await new Promise((r) => {
      const v = synth.getVoices();
      if (v.length) return r(v);
      synth.onvoiceschanged = () => r(synth.getVoices());
    });
    const msg = new SpeechSynthesisUtterance(replyText);
    msg.voice = voices.find((v) => v.lang === "hi-IN") || voices.find((v) => v.lang.startsWith("en")) || voices[0];
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

  // getResponse, takeCommand, startListening same as before (unchanged)

  const getResponse = async (transcript) => {
    // your existing getResponse code here unchanged
  };

  const takeCommand = (command) => {
    // your existing takeCommand code here unchanged
  };

  const startListening = async () => {
    // your existing startListening code here unchanged
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
