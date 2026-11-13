let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

console.log("=== 1. Speech Recognition Engine Language Mapping ===");

function resolveSpeechLang(language: string, isUS: boolean): string {
  const langMap: Record<string, string> = {
    english: isUS ? "en-US" : "en-IN",
    spanish: "es-US",
    hinglish: "hi-IN",
    gujlish: "gu-IN",
    hindi: "hi-IN",
    marathi: "mr-IN",
    gujarati: "gu-IN",
    tamil: "ta-IN",
    telugu: "te-IN",
    bengali: "bn-IN",
    kannada: "kn-IN",
  };
  return langMap[language] || (isUS ? "en-US" : "en-IN");
}

assert(resolveSpeechLang("english", true) === "en-US", "US English maps to en-US");
assert(resolveSpeechLang("english", false) === "en-IN", "Indian English maps to en-IN");
assert(resolveSpeechLang("spanish", true) === "es-US", "Spanish maps to es-US");
assert(resolveSpeechLang("hinglish", false) === "hi-IN", "Hinglish maps to hi-IN phonetics");
assert(resolveSpeechLang("gujlish", false) === "gu-IN", "Gujlish maps to gu-IN");
assert(resolveSpeechLang("hindi", false) === "hi-IN", "Hindi maps to hi-IN");
assert(resolveSpeechLang("marathi", false) === "mr-IN", "Marathi maps to mr-IN");
assert(resolveSpeechLang("gujarati", false) === "gu-IN", "Gujarati maps to gu-IN");

console.log("\n=== 2. Real-Time Transcript Accumulation & Interim Stitching ===");

function processSpeechResults(
  currentFinal: string,
  results: { isFinal: boolean; transcript: string }[]
): { final: string; interim: string; combined: string } {
  let updatedFinal = currentFinal.trim();
  let interim = "";

  for (const res of results) {
    if (res.isFinal) {
      updatedFinal = updatedFinal
        ? `${updatedFinal} ${res.transcript.trim()}`
        : res.transcript.trim();
    } else {
      interim += res.transcript;
    }
  }

  const combined = interim
    ? (updatedFinal ? `${updatedFinal} ${interim}` : interim)
    : updatedFinal;

  return { final: updatedFinal, interim, combined };
}

// Initial state: empty
const step1 = processSpeechResults("", [
  { isFinal: false, transcript: "the ribeye was" }
]);
assert(step1.interim === "the ribeye was", "Step 1 displays interim live typing");
assert(step1.final === "", "Step 1 final remains empty until pause/sentence end");
assert(step1.combined === "the ribeye was", "Step 1 combined matches interim");

// Sentence completes (isFinal = true)
const step2 = processSpeechResults(step1.final, [
  { isFinal: true, transcript: "the ribeye was cooked to perfection." }
]);
assert(step2.final === "the ribeye was cooked to perfection.", "Step 2 finalizes first sentence");
assert(step2.interim === "", "Step 2 interim resets after finalization");

// User pauses and continues speaking second sentence
const step3 = processSpeechResults(step2.final, [
  { isFinal: false, transcript: "and our server" }
]);
assert(step3.combined === "the ribeye was cooked to perfection. and our server", "Step 3 smoothly appends new words without duplicating previous sentence");

// Finalize second sentence
const step4 = processSpeechResults(step2.final, [
  { isFinal: true, transcript: "and our server Alex was super friendly." }
]);
assert(step4.final === "the ribeye was cooked to perfection. and our server Alex was super friendly.", "Step 4 seamlessly combines multiple continuous thoughts");

console.log("\n=== 3. Error Handling Messages & Accessibility ===");

function getVoiceErrorMessage(errorCode: string): string {
  if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
    return "Microphone access blocked. Please allow microphone permissions in your browser.";
  }
  if (errorCode === "network") {
    return "Voice input network error. Please check your internet connection.";
  }
  return "Voice input unavailable.";
}

assert(getVoiceErrorMessage("not-allowed").includes("Microphone access blocked"), "Clear permission block message");
assert(getVoiceErrorMessage("network").includes("internet connection"), "Clear network error message");

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All voice feedback flow tests passed successfully!");
}
