import { getEnv, getOpenRouterConfig } from "../config/env";

function detectSentimentConflict(highlights?: string, selectedTopics?: string[]): "aligned" | "mixed" {
  if (!highlights || highlights.trim().length < 3) return "aligned";
  const lower = highlights.toLowerCase();
  // English + transliterated Hindi/Hinglish/Gujlish + native-script markers.
  // Fallback path only — Gemini handles full nuance when reachable.
  const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "best", "happy", "satisfied", "friendly", "kind", "helpful", "caring", "comfortable", "clean", "professional", "quick", "fast", "nice",
    "mast", "masta", "achha", "accha", "acha", "bahut", "bohot", "badhiya", "badiya", "sahi", "shandar", "shanadar", "saras", "saru", "majja", "maja", "super", "solid", "ekdam",
    "अच्छा", "अच्छी", "बढ़िया", "शानदार", "धन्यवाद", "साफ", "तेज", "मस्त",
    "સારી", "સારો", "સરસ", "મજા", "આભાર", "સાફ",
    "छान", "मस्त", "धन्यवाद",
    "நன்று", "நல்ல", "அருமை", "நன்றி",
    "బాగుంది", "చాలా", "ధన్యవాదాలు",
    "ভালো", "চমৎকার", "ধন্যবাদ",
    "ಚೆನ್ನಾಗಿ", "ಒಳ್ಳೆಯ", "ಧನ್ಯವಾದ"];
  const negativeWords = ["bad", "terrible", "awful", "horrible", "worst", "hate", "poor", "rude", "slow", "unhelpful", "unclean", "dirty", "uncomfortable", "expensive", "overpriced", "disappointed", "frustrating", "waste", "shoddy",
    "wait", "waiting", "delay", "late", "der", "dheere", "dheemi", "ganda", "gandi", "kharab", "kharab", "bura", "buri", "mehenga", "mehngi", "bakwas", "thoda", "problem", "issue", "complaint",
    "खराब", "बुरा", "धीमा", "इंतज़ार", "इंतजार", "महंगा", "गंदा", "समस्या",
    "ખરાબ", "ધીમી", "મોંઘું", "રાહ", "ગંદુ",
    "वाईट", "खराब", "उशीर", "महाग",
    "மோசம்", "தாமதம்", "காத்திருப்பு",
    "చెడు", "ఆలస్యం", "నిరీక్షణ",
    "খারাপ", "দেরি", "অপেক্ষা",
    "ಕೆಟ್ಟ", "ವಿಳಂಬ", "ಕಾಯುವಿಕೆ"];

  // Check for mixed sentiment WITHIN the highlights text itself
  const textHasPositive = positiveWords.some(w => lower.includes(w))
  const textHasNegative = negativeWords.some(w => lower.includes(w))
  if (textHasPositive && textHasNegative) return "mixed"

  // Check for contradiction between selectedTopics and highlights
  if (selectedTopics && selectedTopics.length > 0) {
    const topicSentiments = selectedTopics.map(t => {
      const tl = t.toLowerCase()
      const isPos = positiveWords.some(w => tl.includes(w))
      const isNeg = negativeWords.some(w => tl.includes(w))
      return isPos ? 1 : isNeg ? -1 : 0
    })
    const topicScore = topicSentiments.reduce((a: number, b) => a + b, 0)
    if (topicScore > 0 && textHasNegative && !textHasPositive) return "mixed"
    if (topicScore < 0 && textHasPositive && !textHasNegative) return "mixed"
  }

  return "aligned";
}

export function buildFallbackReview(opts: {
  highlights?: string;
  businessName?: string;
  rating?: number;
  talkingPoints?: string[];
  selectedTopics?: string[];
  language?: string;
}): string {
  const { highlights, businessName, rating, talkingPoints, selectedTopics, language } = opts;
  // Offline fallback must still respect the customer's chosen language/script.
  // Minimal native templates: their own words + a short neutral frame. No generic marketing phrases.
  const frames: Record<string, { open: (n: string) => string; closePos: string; closeNeu: string; closeNeg: string; mixed: string; hope: string }> = {
    hindi: { open: (n) => `${n} में मेरा अनुभव ऐसा रहा।`, closePos: "कुल मिलाकर संतुष्ट हूँ।", closeNeu: "ठीक-ठाक रहा, कुछ बेहतर हो सकता था।", closeNeg: "उम्मीद से कम रहा, सुधार की ज़रूरत है।", mixed: "कुछ अच्छा, कुछ ठीक नहीं — ईमानदारी से बता रहा हूँ।", hope: "उम्मीद है यह किसी के काम आए।" },
    marathi: { open: (n) => `${n} मधला माझा अनुभव असा होता।`, closePos: "एकूण समाधानी आहे।", closeNeu: "ठीक होता, काही सुधारणा होऊ शकते।", closeNeg: "अपेक्षेपेक्षा कमी पडलं, सुधारणा हवी।", mixed: "काही चांगलं, काही ठीक नाही — प्रामाणिकपणे सांगतोय।", hope: "कुणाला तरी उपयोगी पडेल अशी आशा।" },
    gujarati: { open: (n) => `${n} માં મારો અનુભવ આવો રહ્યો।`, closePos: "એકંદરે સંતુષ્ટ છું।", closeNeu: "ઠીક હતું, થોડું સારું થઈ શકત।", closeNeg: "અપેક્ષા કરતાં ઓછું રહ્યું, સુધારો જરૂરી છે।", mixed: "કંઈક સારું, કંઈક ઠીક નહીં — પ્રામાણિકપણે કહું છું।", hope: "કોઈને કામ આવે એવી આશા।" },
    tamil: { open: (n) => `${n}-இல் என் அனுபவம் இப்படி இருந்தது.`, closePos: "ஒட்டுமொத்தமாக திருப்தி.", closeNeu: "பரவாயில்லை, இன்னும் சிறக்கலாம்.", closeNeg: "எதிர்பார்த்ததை விட குறைவு, முன்னேற்றம் தேவை.", mixed: "சில நல்லது, சில சரியில்லை — நேர்மையாக சொல்கிறேன்.", hope: "யாருக்காவது உதவும் என நம்புகிறேன்." },
    telugu: { open: (n) => `${n}లో నా అనుభవం ఇలా ఉంది.`, closePos: "మొత్తంగా సంతృప్తిగా ఉన్నాను.", closeNeu: "పర్వాలేదు, ఇంకా మెరుగుపడవచ్చు.", closeNeg: "అంచనా కంటే తక్కువగా ఉంది, మెరుగుదల అవసరం.", mixed: "కొన్ని బాగున్నాయి, కొన్ని బాగోలేవు — నిజాయితీగా చెబుతున్నాను.", hope: "ఎవరికైనా ఉపయోగపడుతుందని ఆశిస్తున్నాను." },
    bengali: { open: (n) => `${n}-এ আমার অভিজ্ঞতা এমন ছিল।`, closePos: "সব মিলিয়ে সন্তুষ্ট।", closeNeu: "মোটামুটি ছিল, আরও ভালো হতে পারত।", closeNeg: "প্রত্যাশার চেয়ে কম, উন্নতি দরকার।", mixed: "কিছু ভালো, কিছু ঠিক নয় — সৎভাবে বলছি।", hope: "আশা করি কারও কাজে লাগবে।" },
    kannada: { open: (n) => `${n}ನಲ್ಲಿ ನನ್ನ ಅನುಭವ ಹೀಗಿತ್ತು.`, closePos: "ಒಟ್ಟಾರೆಯಾಗಿ ತೃಪ್ತನಾಗಿದ್ದೇನೆ.", closeNeu: "ಪರ್ವಾಗಿಲ್ಲ, ಇನ್ನೂ ಚೆನ್ನಾಗಿರಬಹುದು.", closeNeg: "ನಿರೀಕ್ಷೆಗಿಂತ ಕಡಿಮೆ ಇತ್ತು, ಸುಧಾರಣೆ ಬೇಕು.", mixed: "ಕೆಲವು ಚೆನ್ನಾಗಿತ್ತು, ಕೆಲವು ಸರಿಯಿಲ್ಲ — ಪ್ರಾಮಾಣಿಕವಾಗಿ ಹೇಳುತ್ತಿದ್ದೇನೆ.", hope: "ಯಾರಿಗಾದರೂ ಸಹಾಯವಾಗುತ್ತದೆ ಎಂದು ಆಶಿಸುತ್ತೇನೆ." },
  };
  const f = frames[(language || "english").toLowerCase()];
  const name = businessName || "this place";
  if (f) {
    const conflict = detectSentimentConflict(highlights, selectedTopics);
    if (talkingPoints && talkingPoints.length > 0) {
      return `${f.open(name)} ${talkingPoints.slice(0, 2).join(", ")}. ${rating && rating <= 2 ? f.closeNeg : rating === 3 ? f.closeNeu : f.closePos}`;
    }
    if (highlights && highlights.trim().length >= 3) {
      if (conflict === "mixed") return `${f.open(name)} ${highlights}. ${f.mixed}`;
      return `${f.open(name)} ${highlights}. ${f.hope}`;
    }
    const close = rating && rating <= 2 ? f.closeNeg : rating === 3 ? f.closeNeu : f.closePos;
    return `${f.open(name)} ${close}`;
  }
  const conflict = detectSentimentConflict(highlights, selectedTopics);

  const openings = [
    `Just wanted to share my experience at ${name}.`,
    `Had a visit to ${name} recently — here's my take.`,
    `Dropping a quick review for ${name}.`,
    `Came by ${name} and figured I'd leave my thoughts.`,
    `Visited ${name} and wanted to share what I thought.`,
  ];
  const opening = openings[Math.floor(Math.random() * openings.length)];

  if (talkingPoints && talkingPoints.length > 0) {
    const points = talkingPoints.slice(0, 2).join(", and ");
    const closings = [
      "That about sums it up.",
      "That's my honest take.",
      "Pretty much how it went.",
      "Worth noting down.",
    ];
    const closing = closings[Math.floor(Math.random() * closings.length)];
    return `${opening} ${points}. ${closing}`;
  }

  if (highlights && highlights.trim().length >= 3) {
    if (conflict === "mixed") {
      const mixedClosings = [
        "Mixed feelings overall but just sharing honestly.",
        "Had some good moments and some not so good ones.",
        "Some things worked some didn't — being honest here.",
        "Both good and bad parts worth mentioning.",
      ];
      const closing = mixedClosings[Math.floor(Math.random() * mixedClosings.length)];
      return `${opening} ${highlights}. ${closing}`;
    }
    return `${opening} ${highlights}. Hope this helps someone decide.`;
  }

  const positiveClosings = [
    "Really happy with how it went.",
    "Would definitely go back.",
    "Left a good impression on me.",
    "Will be coming again for sure.",
  ];
  const neutralClosings = [
    "Decent overall, nothing special.",
    "It was okay — some hits, some misses.",
    "Fair enough for what it is.",
  ];
  const negativeClosings = [
    "Not what I was hoping for, honestly.",
    "Hope they take the feedback seriously.",
    "Really disappointed, won't lie.",
  ];

  if (rating && rating >= 4) {
    const closing = positiveClosings[Math.floor(Math.random() * positiveClosings.length)];
    return `${opening} ${closing}`;
  }
  if (rating && rating === 3) {
    const closing = neutralClosings[Math.floor(Math.random() * neutralClosings.length)];
    return `${opening} ${closing}`;
  }
  if (rating && rating <= 2) {
    const closing = negativeClosings[Math.floor(Math.random() * negativeClosings.length)];
    return `${opening} ${closing}`;
  }

  return `${opening} That's about it.`;
}

const GENERIC_BLOCKLIST = [
  "highly recommend",
  "amazing service",
  "best ever",
  "10/10",
  "five stars",
  "great experience",
  "hidden gem",
  "must visit",
  "would recommend",
  "top notch",
  "second to none",
  "exceeded my expectations",
];

function isTooGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  return GENERIC_BLOCKLIST.some((phrase) => lower.includes(phrase));
}

// Fallback deterministic helper for talking points (script-safe: no forced Latin capitalization)
export function deriveTalkingPoints(highlights: string, selectedTopics?: string[]): string[] {
  const points: string[] = [];
  const prettify = (s: string) => {
    const t = s.trim();
    // Only title-case Latin-script fragments; leave Devanagari/Gujarati/Tamil/etc untouched
    if (/^[A-Za-z]/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
    return t;
  };

  if (highlights && highlights.trim().length >= 3) {
    const fragments = highlights
      .split(/[.,;\n]|(?:\band\b)/i)
      .map((f) => f.trim())
      .filter((f) => f.length >= 4 && !isTooGeneric(f));

    for (const fragment of fragments) {
      const words = fragment.split(/\s+/).slice(0, 12).join(" ");
      const cleaned = prettify(words);
      if (!points.includes(cleaned)) points.push(cleaned);
      if (points.length >= 5) break;
    }
  }

  // Add selected topics as talking points if we still have room
  if (points.length < 5 && selectedTopics && selectedTopics.length > 0) {
    for (const topic of selectedTopics) {
      const cleaned = prettify(topic);
      if (!points.includes(cleaned) && !isTooGeneric(topic)) {
        points.push(cleaned);
        if (points.length >= 5) break;
      }
    }
  }

  return points.slice(0, 5);
}

// Fallback deterministic helper for replies
export function buildFallbackReply(rating: number, liked: string | null, improvement: string | null, tone: string): string {
  const thanks = tone === "formal" ? "Thank you" : tone === "friendly" ? "Thanks so much" : "Thank you";

  let body = "";
  if (rating >= 4) {
    body = liked
      ? `We're delighted you enjoyed ${liked.toLowerCase()}. Your kind words mean a lot to our team.`
      : `We're thrilled you had a great experience with us.`;
  } else if (rating === 3) {
    body = `We appreciate your honest feedback and are always looking to improve.`;
  } else {
    body = improvement
      ? `We take your feedback about ${improvement.toLowerCase()} seriously and will work on improving.`
      : `We apologize for not meeting expectations and will use your feedback to improve.`;
  }

  const closing = tone === "formal"
    ? "We look forward to serving you again."
    : tone === "friendly"
      ? "Hope to see you again soon!"
      : "We look forward to your next visit.";

  return `${thanks} for your review. ${body} ${closing}`;
}

interface GeminiConfig {
  responseMimeType?: string;
  responseSchema?: any;
}

export interface ReviewInput {
  source: "google" | "feedback";
  rating: number;
  text: string;
  createdAt: string;
}

export interface InsightsResult {
  summary: string;
  metrics: {
    averageRating: number;
    totalReviews: number;
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
    growthRate: number;
    previousPeriodAvg: number;
  };
  topPraises: { phrase: string; count: number }[];
  topComplaints: { phrase: string; count: number }[];
  trend: { date: string; count: number; avgRating: number }[];
}

function extractCommonPhrases(reviews: ReviewInput[], positiveThreshold: number, negativeThreshold: number, maxItems: number = 4): { praises: { phrase: string; count: number }[]; complaints: { phrase: string; count: number }[] } {
  // English + transliterated Hinglish/Gujlish + native-script markers (fallback path; Gemini gives full nuance when reachable)
  const praiseKeywords = ["friendly", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "best", "happy", "satisfied", "kind", "helpful", "caring", "comfortable", "clean", "professional", "quick", "fast", "nice", "delicious", "tasty", "convenient", "affordable", "recommend", "awesome", "superb", "outstanding", "good", "pleasant", "smooth", "efficient", "attentive", "thorough", "gentle", "skilled", "knowledgeable", "patient",
    "mast", "achha", "accha", "bahut", "bohot", "badhiya", "badiya", "shandar", "saras", "saru", "maja", "majja", "अच्छा", "बढ़िया", "शानदार", "સરસ", "મજા", "छान", "நல்ல", "అద్భుతమైన", "ভালো", "ಚೆನ್ನಾಗಿ"];
  const complaintKeywords = ["bad", "terrible", "awful", "horrible", "worst", "hate", "poor", "rude", "slow", "unhelpful", "unclean", "dirty", "uncomfortable", "expensive", "overpriced", "disappointed", "frustrating", "waste", "shoddy", "wait", "delay", "late", "unprofessional", "ignored", "broken", "wrong", "mistake", "cold", "not good", "mediocre", "bland", "disorganized", "crowded", "noisy", "dismissive", "unresponsive",
    "der", "dheere", "kharab", "bura", "mehenga", "bakwas", "thoda", "problem", "खराब", "बुरा", "धीमा", "इंतजार", "महंगा", "ખરાબ", "ધીમી", "उशीर", "மோசம்", "தாமதம்", "చెడు", "ఆలస్యం", "খারাপ", "দেরি", "ಕೆಟ್ಟ", "ವಿಳಂಬ"];

  const praiseCounts: Record<string, number> = {};
  const complaintCounts: Record<string, number> = {};

  for (const review of reviews) {
    const lower = review.text.toLowerCase();
    if (review.rating >= positiveThreshold) {
      for (const kw of praiseKeywords) {
        if (lower.includes(kw)) {
          praiseCounts[kw] = (praiseCounts[kw] || 0) + 1;
        }
      }
    }
    if (review.rating <= negativeThreshold) {
      for (const kw of complaintKeywords) {
        if (lower.includes(kw)) {
          complaintCounts[kw] = (complaintCounts[kw] || 0) + 1;
        }
      }
    }
  }

  const praiseLabels: Record<string, string> = {
    friendly: "Friendly staff", great: "Great service", excellent: "Excellent quality", amazing: "Amazing experience",
    wonderful: "Wonderful atmosphere", fantastic: "Fantastic service", love: "Customers love it", best: "Best in class",
    happy: "Happy customers", satisfied: "Satisfied customers", kind: "Kind treatment", helpful: "Helpful staff",
    caring: "Caring approach", comfortable: "Comfortable environment", clean: "Cleanliness", professional: "Professionalism",
    quick: "Quick service", fast: "Fast service", nice: "Nice ambiance", delicious: "Delicious food",
    tasty: "Tasty food", convenient: "Convenient location", affordable: "Affordable pricing",
    awesome: "Awesome experience", superb: "Superb quality", outstanding: "Outstanding service",
    good: "Good quality", pleasant: "Pleasant experience", smooth: "Smooth process", efficient: "Efficient service",
    attentive: "Attentive staff", thorough: "Thorough service", gentle: "Gentle care", skilled: "Skilled professionals",
    knowledgeable: "Knowledgeable staff", patient: "Patient service",
  };
  const complaintLabels: Record<string, string> = {
    wait: "Long wait times", delay: "Delays", late: "Lateness", bad: "Bad experience", terrible: "Terrible experience",
    awful: "Awful experience", horrible: "Horrible experience", worst: "Worst experience", hate: "Strong dislike",
    poor: "Poor quality", rude: "Rude staff", slow: "Slow service", unhelpful: "Unhelpful staff",
    unclean: "Unclean environment", dirty: "Dirty premises", uncomfortable: "Uncomfortable experience",
    expensive: "Too expensive", overpriced: "Overpriced", disappointed: "Disappointed customers",
    frustrating: "Frustrating process", waste: "Waste of time", shoddy: "Shoddy work",
    unprofessional: "Unprofessional behavior", ignored: "Customers ignored", broken: "Broken equipment",
    wrong: "Wrong order", mistake: "Mistakes", cold: "Cold food", "not good": "Not satisfactory",
    mediocre: "Mediocre quality", bland: "Bland food", disorganized: "Disorganized", crowded: "Too crowded",
    noisy: "Too noisy", dismissive: "Dismissive staff", unresponsive: "Unresponsive",
  };

  const praises = Object.entries(praiseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([phrase, count]) => ({ phrase: praiseLabels[phrase] || phrase.charAt(0).toUpperCase() + phrase.slice(1), count }));

  const complaints = Object.entries(complaintCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([phrase, count]) => ({ phrase: complaintLabels[phrase] || phrase.charAt(0).toUpperCase() + phrase.slice(1), count }));

  return { praises, complaints };
}

function computeTrend(reviews: ReviewInput[], days: number = 30): { date: string; count: number; avgRating: number }[] {
  const dayMap = new Map<string, { totalRating: number; count: number }>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { totalRating: 0, count: 0 });
  }
  for (const r of reviews) {
    const key = r.createdAt.slice(0, 10);
    if (dayMap.has(key)) {
      const entry = dayMap.get(key)!;
      entry.totalRating += r.rating;
      entry.count += 1;
    }
  }
  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    avgRating: data.count > 0 ? Math.round((data.totalRating / data.count) * 10) / 10 : 0,
  }));
}

export function buildFallbackInsights(
  reviews: ReviewInput[],
  businessName: string,
  previousReviews?: ReviewInput[],
  trendDays: number = 30
): InsightsResult {
  const total = reviews.length;
  const { praises, complaints } = extractCommonPhrases(reviews, 4, 2);

  if (total === 0) {
    return {
      summary: `No reviews have been collected for ${businessName} yet. Start sharing your QR code to gather customer feedback.`,
      metrics: { averageRating: 0, totalReviews: 0, positivePercent: 0, neutralPercent: 0, negativePercent: 0, growthRate: 0, previousPeriodAvg: 0 },
      topPraises: [],
      topComplaints: [],
      trend: computeTrend(reviews, trendDays),
    };
  }

  const avg = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10;
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const neutral = reviews.filter((r) => r.rating === 3).length;
  const negative = reviews.filter((r) => r.rating <= 2).length;
  const pct = (n: number) => Math.round((n / total) * 100);

  const pctPos = pct(positive);
  const pctNeu = pct(neutral);
  const pctNeg = pct(negative);

  const prevAvg = previousReviews && previousReviews.length > 0
    ? Math.round((previousReviews.reduce((s, r) => s + r.rating, 0) / previousReviews.length) * 10) / 10
    : 0;
  const growthRate = prevAvg > 0 ? Math.round(((avg - prevAvg) / prevAvg) * 100) : 0;

  let summary = "";
  if (pctPos > 60) {
    summary = `${businessName} has received ${total} recent reviews with an average rating of ${avg}/5. The vast majority of customers are highly satisfied (${pctPos}% positive). `;
    if (praises.length > 0) {
      summary += `Customers frequently praise ${praises.slice(0, 2).map(p => p.phrase.toLowerCase()).join(" and ")}. `;
    }
    if (complaints.length > 0) {
      summary += `A few customers mentioned ${complaints[0].phrase.toLowerCase()} as an area to watch.`;
    } else {
      summary += `Overall sentiment remains strongly positive with little critical feedback.`;
    }
  } else if (pctNeg > 30) {
    summary = `${businessName} has received ${total} recent reviews with an average rating of ${avg}/5. A significant portion of customers have expressed concerns (${pctNeg}% negative). `;
    if (complaints.length > 0) {
      summary += `Recurring issues include ${complaints.slice(0, 2).map(c => c.phrase.toLowerCase()).join(" and ")}. `;
    }
    if (praises.length > 0) {
      summary += `On the positive side, customers appreciate ${praises[0].phrase.toLowerCase()}.`;
    }
  } else {
    summary = `${businessName} has received ${total} recent reviews with an average rating of ${avg}/5. Sentiment is mixed — ${pctPos}% positive, ${pctNeu}% neutral, ${pctNeg}% negative. `;
    if (praises.length > 0 && complaints.length > 0) {
      summary += `Customers praise ${praises[0].phrase.toLowerCase()} while flagging ${complaints[0].phrase.toLowerCase()} as an area needing improvement.`;
    } else if (praises.length > 0) {
      summary += `Customers particularly appreciate ${praises[0].phrase.toLowerCase()}.`;
    } else if (complaints.length > 0) {
      summary += `Key areas for improvement include ${complaints[0].phrase.toLowerCase()}.`;
    }
  }

  if (growthRate !== 0) {
    summary += ` Rating has ${growthRate > 0 ? "improved" : "declined"} by ${Math.abs(growthRate)}% compared to the previous period.`;
  }

  return {
    summary,
    metrics: { averageRating: avg, totalReviews: total, positivePercent: pctPos, neutralPercent: pctNeu, negativePercent: pctNeg, growthRate, previousPeriodAvg: prevAvg },
    topPraises: praises,
    topComplaints: complaints,
    trend: computeTrend(reviews, trendDays),
  };
}

export async function generateInsights(
  reviews: ReviewInput[],
  businessName: string,
  previousReviews?: ReviewInput[],
  trendDays: number = 30
): Promise<InsightsResult> {
  const env = getEnv();
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey || reviews.length === 0) {
    return buildFallbackInsights(reviews, businessName, previousReviews, trendDays);
  }

  const reviewsJson = JSON.stringify(reviews.slice(0, 20));
  const previousJson = previousReviews && previousReviews.length > 0
    ? JSON.stringify(previousReviews.slice(0, 20))
    : "[]";

  const systemInstruction = `You are an AI analyst helping a business owner understand what customers are saying about their business. You produce structured, insightful analyses.`;

  const prompt = `Analyze the following reviews for "${businessName}" and produce a detailed analysis in JSON format.

Current period reviews:
${reviewsJson}

Previous period reviews (for comparison):
${previousJson}

Return a JSON object with these exact fields:
1. "summary": A 2-3 sentence plain-text summary covering core themes, what customers praise most, and what needs improvement. Be specific — reference actual patterns. Do not use generic phrases.
2. "topPraises": Array of objects with "phrase" (string, e.g. "Friendly staff") and "count" (number of reviews mentioning this), max 4 items. Only include phrases present in the data.
3. "topComplaints": Array of objects with "phrase" (string, e.g. "Long wait times") and "count" (number of reviews mentioning this), max 4 items. Only include phrases present in the data.

Output ONLY valid JSON — no markdown, no backticks, no labels, no prefixes, no extra text.`;

  try {
    const generated = await generateWithFailover(prompt, systemInstruction, {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          topPraises: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                phrase: { type: "STRING" },
                count: { type: "NUMBER" },
              },
              required: ["phrase", "count"],
            },
          },
          topComplaints: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                phrase: { type: "STRING" },
                count: { type: "NUMBER" },
              },
              required: ["phrase", "count"],
            },
          },
        },
        required: ["summary", "topPraises", "topComplaints"],
      },
    });
    const text = generated.text;

    const parsed = JSON.parse(text);
    const { praises, complaints } = extractCommonPhrases(reviews, 4, 2);

    const fallback = buildFallbackInsights(reviews, businessName, previousReviews, trendDays);

    return {
      summary: parsed.summary || fallback.summary,
      metrics: fallback.metrics,
      topPraises: (parsed.topPraises || praises).slice(0, 4),
      topComplaints: (parsed.topComplaints || complaints).slice(0, 4),
      trend: computeTrend(reviews, trendDays),
    };
  } catch (err) {
    console.warn("AI insights generation failed on all providers, falling back to deterministic analysis:", err);
    return buildFallbackInsights(reviews, businessName, previousReviews, trendDays);
  }
}

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  config?: GeminiConfig
): Promise<string> {
  const env = getEnv();
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined in server environment");
  }

  // Use gemini-2.5-flash (active versioned release confirmed available for this API key)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [
        {
          text: systemInstruction,
        },
      ],
    };
  }

  if (config) {
    payload.generationConfig = {};
    if (config.responseMimeType) {
      payload.generationConfig.responseMimeType = config.responseMimeType;
    }
    if (config.responseSchema) {
      payload.generationConfig.responseSchema = config.responseSchema;
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API call failed with status ${res.status}: ${errorBody}`);
  }

  const data = (await res.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}

// ── OpenRouter failover (secondary provider) ────────────────────────────────
// OpenAI-compatible chat API: https://openrouter.ai/api/v1/chat/completions
// Default model qwen/qwen3-30b-a3b (~$0.13 in/$0.52 out per 1M, 131K ctx, JSON mode,
// strong multilingual). Short tasks cost ~$0.0001/request — no quality loss vs Gemini
// for talking-points/drafts/replies; heavy reasoning models deliberately avoided.
export type AiProvider = "gemini" | "openrouter";

export function isQuotaError(err: any): boolean {
  const msg = `${err?.message ?? err}`.toLowerCase();
  return (
    err?.status === 429 ||
    /429|rate.?limit|quota|quota.?exceeded|resource.?exhausted|overloaded|too many requests|insufficient.?credits|402/.test(msg)
  );
}

export async function callOpenRouter(
  prompt: string,
  systemInstruction?: string,
  config?: GeminiConfig
): Promise<string> {
  const cfg = getOpenRouterConfig();
  if (!cfg.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined in server environment (paste it in server/.env, no restart needed)");
  }
  const messages: any[] = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model: cfg.model,
    messages,
    temperature: 0.7,
    max_tokens: 600,
  };
  if (config?.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": cfg.appUrl,
      "X-Title": cfg.appName,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const err: any = new Error(`OpenRouter API call failed with status ${res.status}: ${errorBody}`);
    err.status = res.status;
    throw err;
  }

  const data: any = await res.json();
  let text: string | undefined = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter API");
  // Strip code fences some models wrap JSON in
  text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return text;
}

// Failover chain: Gemini → OpenRouter → throw (callers use deterministic offline builders).
// Returns which provider succeeded so routes can report cost/quality telemetry.
export async function generateWithFailover(
  prompt: string,
  systemInstruction?: string,
  config?: GeminiConfig
): Promise<{ text: string; provider: AiProvider }> {
  try {
    return { text: await callGemini(prompt, systemInstruction, config), provider: "gemini" };
  } catch (geminiErr: any) {
    const cfg = getOpenRouterConfig();
    if (!cfg.apiKey) throw geminiErr;
    console.warn(`Gemini failed (${geminiErr?.message?.slice(0, 120)}), failing over to OpenRouter ${cfg.model}`);
    const text = await callOpenRouter(prompt, systemInstruction, config);
    return { text, provider: "openrouter" };
  }
}
