import React, { useContext } from "react";
import { CiMicrophoneOn } from "react-icons/ci";
import { dataContext } from "./context/UserContext";
import UserProvider from "./context/UserContext";

function AppContent() {
  const {
    speaking,
    setSpeaking,
    recogText,
    aiResponce,
    startListening,
    speak,
  } = useContext(dataContext);

  return (
    <div className="h-full w-full flex justify-center items-center p-6 flex-col gap-5">
      <img src="/images/ai.png" className="h-[450px] sm:h-72" />
      <span className="font-semibold sm:text-[30px] bg-gradient-to-r from-[rgb(34,121,131)] to-[rgb(237,4,125)] bg-clip-text text-transparent text-center">
        I'm Shifra. Your Advance Virtual Assistant
      </span>

      {!speaking ? (
        <button
          onClick={async () => {
            setRecogText("Listening...");

            let voices = speechSynthesis.getVoices();
            if (!voices.length) {
              await new Promise((resolve) => {
                speechSynthesis.onvoiceschanged = () => {
                  voices = speechSynthesis.getVoices();
                  resolve();
                };
              });
            }

            const utterance = new SpeechSynthesisUtterance("Ask anything");
            utterance.lang = "hi-IN";
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;

            const voice =
              voices.find((v) => v.lang === "hi-IN") ||
              voices.find((v) => v.lang.startsWith("en")) ||
              voices[0];
            if (voice) utterance.voice = voice;

            // ✅ Speech end hone ke baad mic on karo
            utterance.onend = () => {
              startListening();
              setSpeaking(true);
            };

            speechSynthesis.cancel(); // clear old queue
            speechSynthesis.speak(utterance);
          }}
          className="text-black text-[16px] p-1 flex justify-center items-center gap-3 font-semibold py-1 px-2 rounded-full bg-[rgb(79,224,234)] shadow-md shadow-[rgb(79,224,234)]"
        >
          Start Listening <CiMicrophoneOn className="text-[20px]" />
        </button>
      ) : (
        <div className="flex flex-col justify-center items-center">
          {!aiResponce ? (
            <img src="/images/speak.gif" className="w-16" />
          ) : (
            <img src="/images/aiVoice.gif" className="w-[50vh] h-20" />
          )}
          <p className="text-white text-[2vmax] text-center">{recogText}</p>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
