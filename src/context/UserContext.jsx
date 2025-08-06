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
      // Use the last result to get latest transcript
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
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
      if (speaking) {
        // Small delay to prevent rapid restart issues
        setTimeout(() => {
          try {
            recognition.current.start();
            setListening(true);
          } catch (err) {
            console.error("Restart recognition failed:", err);
          }
        }, 300);
      }
    };

    return () => {
      recognition.current?.stop();
    };
  }, [speaking]);

  const speak = async (text) => {
    const synth = window.speechSynthesis;
    const voices = await new Promise((resolve) => {
      let v = synth.getVoices();
      if (v.length) return resolve(v);
      synth.onvoiceschanged = () => {
        v = synth.getVoices();
        resolve(v);
      };
    });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice =
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    utterance.lang = utterance.voice.lang;
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    synth.cancel();

    utterance.onend = () => {
      setSpeaking(false);
      setAiResponce(false);
      setTimeout(() => {
        if (!listening) {
          try {
            recognition.current.start();
            setListening(true);
            setRecogText("Listening...");
            setSpeaking(true);
          } catch (err) {
            console.error("Start recognition after speech failed:", err);
          }
        }
      }, 400);
    };

    synth.speak(utterance);
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
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from backend");
      }

      const replyRaw = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply received.";
      const replyText = replyRaw.replace(/google/gi, "kc kunal");

      setRecogText(replyText);
      setAiResponce(true);
      speak(replyText);
    } catch (err) {
      console.error("Fetch error:", err);
      setRecogText("No response from backend.");
      speak("माफ़ कीजिये, kc Kunal से जवाब नहीं मिल पाया");
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
    }
  };

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      if (listening) {
        console.warn("Recognition already started");
        return;
      }
      recognition.current.start();
      setListening(true);
      setSpeaking(true);
      setRecogText("Listening...");
    } catch (err) {
      console.error("Mic access or recognition start error:", err);
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
