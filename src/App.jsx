import React, { useContext, useEffect, useState } from "react";
import { CiMicrophoneOn } from "react-icons/ci";
import { dataContext } from "./context/UserContext";
import UserProvider from "./context/UserContext";

function AppContent() {
  const { speaking, recogText, aiResponce, startListening, speak } = useContext(dataContext);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setUnsupported(true);
  }, []);

  if (unsupported) {
    return <div className="text-red-500">Your browser doesn’t support voice. Try Chrome or Android.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-5">
      <img src="/images/ai.png" className="h-[450px] sm:h-72" alt="AI" />
      <span className="bg-gradient-to-r from-teal-600 to-pink-600 bg-clip-text text-transparent text-center font-semibold sm:text-3xl">
        I'm Shifra. Your Advance Virtual Assistant
      </span>

      {!speaking ? (
        <button
          onClick={() => {
            speak("Ask anything");
            setTimeout(() => startListening(), 800);
          }}
          className="bg-cyan-200 text-black text-lg font-semibold px-4 py-2 rounded-full shadow"
        >
          Start Listening <CiMicrophoneOn className="inline text-2xl ml-2" />
        </button>
      ) : (
        <div className="flex flex-col items-center">
          {!aiResponce ? (
            <img src="/images/speak.gif" alt="Listening" className="w-16" />
          ) : (
            <img src="/images/aiVoice.gif" alt="AI talking" className="w-[50vh] h-20" />
          )}
          <p className="text-white text-2xl text-center">{recogText}</p>
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
