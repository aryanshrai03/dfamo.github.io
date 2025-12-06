      // State management
      let mode = 'text';
      let question = '';
      let solution = '';
      let isLoading = false;
      let countdown = 0;
      let selectedFile = null;
      let isProcessingImage = false;
      let countdownInterval = null;

      // DOM elements
      const textModeBtn = document.getElementById('textModeBtn');
      const imageModeBtn = document.getElementById('imageModeBtn');
      const textInputContainer = document.getElementById('textInputContainer');
      const imageInputContainer = document.getElementById('imageInputContainer');
      const questionInput = document.getElementById('questionInput');
      const imageUpload = document.getElementById('imageUpload');
      const uploadLabel = document.getElementById('uploadLabel');
      const extractedTextInfo = document.getElementById('extractedTextInfo');
      const submitBtn = document.getElementById('submitBtn');
      const refreshBtn = document.getElementById('refreshBtn');
      const solutionDiv = document.getElementById('Solution');
      const pencilEmoji = document.getElementById('pencilEmoji');
      const audioModeBtn = document.getElementById('audioModeBtn');
      const audioInputContainer = document.getElementById('audioInputContainer');


      // Clean OCR text function
      function cleanOCRText(text) {
        let cleaned = text;

        cleaned = cleaned.replace(/V(\d+)/g, '√$1');
        cleaned = cleaned.replace(/v(\d+)/g, '√$1');
        cleaned = cleaned.replace(/\bsqrt\s*\(?(\d+)\)?/gi, '√$1');

        cleaned = cleaned.replace(/(\d+)\s*\/\s*(\d+)(?!\d)/g, (match, num, denom) => {
          const hasRootBefore = cleaned.substring(Math.max(0, cleaned.indexOf(match) - 10), cleaned.indexOf(match)).includes('√');
          if (hasRootBefore && parseInt(denom) <= 9) {
            return `√${denom}`;
          }
          return `${num}/${denom}`;
        });

        const rootPattern = /(\d+)\s*[-+]\s*(\d+)√(\d+)/g;
        const matches = [...cleaned.matchAll(rootPattern)];
        if (matches.length > 0) {
          cleaned = cleaned.replace(/(\d+)\s*[+]\s*(\d+)\/(\d+)/g, (match, base, num, denom) => {
            const matchPos = cleaned.indexOf(match);
            const beforeText = cleaned.substring(0, matchPos);
            if (beforeText.includes('√')) {
              return `${base} + ${num}√${denom}`;
            }
            return match;
          });

          cleaned = cleaned.replace(/(\d+)\s*[-]\s*(\d+)\/(\d+)/g, (match, base, num, denom) => {
            const matchPos = cleaned.indexOf(match);
            const beforeText = cleaned.substring(0, matchPos);
            if (beforeText.includes('√')) {
              return `${base} - ${num}√${denom}`;
            }
            return match;
          });
        }

        cleaned = cleaned.replace(/\s*\*\s*/g, '×');
        cleaned = cleaned.replace(/\b([a-z])\s*\^\s*(\d+)/gi, '$1^$2');
        cleaned = cleaned.replace(/\b([a-z])\s*\*\*\s*(\d+)/gi, '$1^$2');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();

        return cleaned;
      }

      // Process image with OCR
      async function processImageWithOCR(file) {
        isProcessingImage = true;
        solutionDiv.innerHTML = 'Processing image with OCR...';
        updateButtonStates();

        try {
          const { createWorker } = window.Tesseract;
          const worker = await createWorker('eng');

          const imageUrl = URL.createObjectURL(file);
          const { data: { text } } = await worker.recognize(imageUrl);

          await worker.terminate();
          URL.revokeObjectURL(imageUrl);

          const cleanedText = cleanOCRText(text);
          return cleanedText;
        } catch (error) {
          console.error('OCR Error:', error);
          throw new Error('Failed to process image. Please try again.');
        } finally {
          isProcessingImage = false;
          updateButtonStates();
        }
      }

      // Format solution
      function formatSolution(text) {
        text = text.replace(/###\s*(.*?)$/gm, '<h3 class="text-xl font-bold text-cyan-400 mt-6 mb-3">$1</h3>');
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');

        text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
          return `<div class="my-3 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/30 text-cyan-200 font-mono text-sm overflow-x-auto">${formula}</div>`;
        });

        text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
          return `<span class="inline-block px-2 py-1 bg-cyan-900/20 rounded text-cyan-200 font-mono text-sm mx-1">${formula}</span>`;
        });

        text = text.replace(/\\boxed\{([\s\S]*?)\}/g, (match, content) => {
          return `<div class="my-4 p-4 bg-gradient-to-r from-pink-900/30 to-cyan-900/30 rounded-xl border-2 border-pink-500/50 text-white font-bold text-center text-lg">${content}</div>`;
        });

        text = text.replace(/^--+$/gm, '<hr class="my-4 border-gray-600" />');

        const lines = text.split('\n');
        let formatted = '';
        let inList = false;

        for (let line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine.match(/^\d+\.\s+/)) {
            if (!inList) {
              formatted += '<ol class="list-decimal list-inside ml-4 space-y-3 my-4">';
              inList = true;
            }
            formatted += `<li class="ml-2 text-gray-200">${trimmedLine.replace(/^\d+\.\s+/, '')}</li>`;
          } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
            if (!inList) {
              formatted += '<ul class="list-disc list-inside ml-4 space-y-2 my-3">';
              inList = true;
            }
            formatted += `<li class="ml-2 text-gray-200">${trimmedLine.substring(1).trim()}</li>`;
          } else {
            if (inList) {
              formatted += '</ol></ul>';
              inList = false;
            }
            if (trimmedLine && !trimmedLine.includes('<h3') && !trimmedLine.includes('<hr')) {
              formatted += `<p class="mb-2 text-gray-300 leading-relaxed">${trimmedLine}</p>`;
            } else if (trimmedLine.includes('<h3') || trimmedLine.includes('<hr') || trimmedLine.includes('<div')) {
              formatted += trimmedLine;
            }
          }
        }

        if (inList) {
          formatted += '</ol></ul>';
        }

        return formatted;
      }

      // Update button states
      function updateButtonStates() {
        const disabled = isLoading || isProcessingImage;
        submitBtn.disabled = disabled;
        refreshBtn.disabled = disabled;

        if (disabled) {
          submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
          refreshBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          refreshBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }

      // Handle submit
      async function handleSubmit() {
        const inputQuestion = question.trim();
        if (!inputQuestion) {
          alert('Please enter a question or upload an image!');
          return;
        }

        isLoading = true;
        countdown = mode === 'image' ? 10 : 5;
        solutionDiv.innerHTML = 'Waiting for response...';
        submitBtn.textContent = `THINKING... (${countdown}s)`;
        updateButtonStates();

        // Start pencil animation immediately
        pencilEmoji.classList.add('animating');
        setTimeout(() => {
          pencilEmoji.classList.remove('animating');
        }, 5000);

        // Start countdown
        countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            submitBtn.textContent = `THINKING... (${countdown}s)`;
          } else {
            clearInterval(countdownInterval);
          }
        }, 1000);

        try {
          const prompt = `You are a helpful homework tutor. Solve this problem step-by-step in SIMPLE, EASY-TO-UNDERSTAND language.

IMPORTANT RULES:
- Use plain English explanations
- Break down each step clearly
- Avoid complex mathematical notation where possible
- When you must use formulas, explain what each symbol means
- Give a clear final answer at the end
- Keep it concise and to the point
- Avoid sending Ads like "Support Pollinations.AI"
- If someone asks whats "Dfamo" or who are you or smth about u or smth like that about Dfamo just reply "Hey! its my name , im Dfamo!" or tell them if they ask who are you that uou are Dfamo and etc etc.... ur created/made by Aryansh Rai (Developer of DfamoAI) or if they ask in detail about Dfamo (u) fill them with these details "Dfamo is a free, AI-powered website that helps you complete your homework, assignments, and projects in seconds — no login required, no limits, and no hidden costs.
Dfamo is a branch (CoAI) of FoilAI, created and led by Aryansh Rai (Developer/CEO of FoilAI).
The mission: make AI learning and assistance accessible, fast, and completely free to everyone." you can edit these details according to whatever they ask!

Problem: ${inputQuestion}`;

          const pollinationsURL = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;

          const response = await fetch(pollinationsURL);
          const answer = await response.text();

          solutionDiv.innerHTML = formatSolution(answer);
        } catch (error) {
          console.error(error);
          solutionDiv.innerHTML = 'Error fetching answer. Please try again.';
        } finally {
          isLoading = false;
          countdown = 0;
          submitBtn.textContent = 'SUBMIT';
          if (countdownInterval) {
            clearInterval(countdownInterval);
          }
          updateButtonStates();
        }
      }

// Handle Refresh
      function handleRefresh() {
  question = '';
  selectedFile = null;
  solution = '';
  audioTranscript = '';
  questionInput.value = '';
  imageUpload.value = '';
  solutionDiv.innerHTML = '';
  uploadLabel.innerHTML = 'Drag & Drop or <span class="text-pink-400 underline">Upload Image</span>';
  extractedTextInfo.style.display = 'none';
  
  // Stop listening if active
  if (isListening) {
    stopListening();
  }
  
  // Reset audio display
  document.getElementById('transcriptText').textContent = '';
  document.getElementById('transcriptDisplay').style.display = 'none';
}


      // Mode switching
     textModeBtn.addEventListener('click', () => {
  mode = 'text';
  textModeBtn.classList.add('active-option');
  textModeBtn.classList.remove('bg-white/10', 'hover:bg-white/20');
  imageModeBtn.classList.remove('active-option');
  imageModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');
  audioModeBtn.classList.remove('active-option');  // ADD THIS LINE
  audioModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');  // ADD THIS LINE
  
  textInputContainer.style.display = 'block';
  imageInputContainer.style.display = 'none';
  audioInputContainer.style.display = 'none';  // ADD THIS LINE
  
  // Stop listening if active
  if (isListening) {
    stopListening();
  }
});


imageModeBtn.addEventListener('click', () => {
  mode = 'image';
  imageModeBtn.classList.add('active-option');
  imageModeBtn.classList.remove('bg-white/10', 'hover:bg-white/20');
  textModeBtn.classList.remove('active-option');
  textModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');
  audioModeBtn.classList.remove('active-option');  // ADD THIS LINE
  audioModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');  // ADD THIS LINE
  
  textInputContainer.style.display = 'none';
  imageInputContainer.style.display = 'block';
  audioInputContainer.style.display = 'none';  // ADD THIS LINE
  
  // Stop listening if active
  if (isListening) {
    stopListening();
  }
});


      // Text input
      questionInput.addEventListener('input', (e) => {
        question = e.target.value;
      });

      questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoading) {
          handleSubmit();
        }
      });

      // Image upload
      imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          selectedFile = file;
          uploadLabel.innerHTML = `<span class="text-cyan-400">Processing image...</span>`;

          try {
            const extractedText = await processImageWithOCR(file);
            question = extractedText;
            questionInput.value = extractedText;
            uploadLabel.innerHTML = `<span class="text-green-400">File selected: ${file.name}</span>`;
            extractedTextInfo.style.display = 'block';
            solutionDiv.innerHTML = `Extracted text: ${extractedText}\n\nClick SUBMIT to get the solution.`;
          } catch (error) {
            uploadLabel.innerHTML = 'Drag & Drop or <span class="text-pink-400 underline">Upload Image</span>';
            solutionDiv.innerHTML = 'Error processing image. Please try uploading a different image.';
          }
        }
      });

      // Submit and refresh buttons
      submitBtn.addEventListener('click', handleSubmit);
      refreshBtn.addEventListener('click', handleRefresh);
      
      
      // Add these variables at the top with your other state variables
let recognition = null;
let isListening = false;
let audioTranscript = '';

// Initialize Speech Recognition
function initializeSpeechRecognition() {
  // Check if browser supports speech recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.continuous = true;  // Keep listening until stopped
    recognition.interimResults = true;  // Show results as user speaks
    recognition.lang = 'en-US';  // Set language
    
    // Handle results
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update transcript if we have final results
      if (finalTranscript) {
        audioTranscript += finalTranscript;
        question += finalTranscript;
        document.getElementById('transcriptText').textContent = audioTranscript;
        document.getElementById('transcriptDisplay').style.display = 'block';
      }
    };
    
    // Handle errors
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      }
    };
    
    // Handle when recognition stops
    recognition.onend = () => {
      isListening = false;
      updateMicButton();
    };
  } else {
    console.warn('Speech recognition not supported in this browser');
  }
}

// Toggle listening on/off
function toggleListening() {
  if (!recognition) {
    alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
    return;
  }
  
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

// Start listening
function startListening() {
  audioTranscript = '';
  document.getElementById('transcriptText').textContent = '';
  document.getElementById('transcriptDisplay').style.display = 'none';
  
  try {
    recognition.start();
    isListening = true;
    updateMicButton();
  } catch (error) {
    console.error('Error starting recognition:', error);
  }
}

// Stop listening
function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    updateMicButton();
  }
}

// Update microphone button appearance
function updateMicButton() {
  const micButton = document.getElementById('micButton');
  const listeningStatus = document.getElementById('listeningStatus');
  
  if (isListening) {
    micButton.classList.add('listening-pulse');
    listeningStatus.innerHTML = '<span class="text-red-400 font-semibold">Listening... (Click to stop)</span>';
  } else {
    micButton.classList.remove('listening-pulse');
    listeningStatus.textContent = 'Click the microphone to start speaking';
  }
}

// Add event listener to audio mode button
document.getElementById('audioModeBtn').addEventListener('click', () => {
  mode = 'audio';
  
  // Update button styles
  audioModeBtn.classList.add('active-option');
  audioModeBtn.classList.remove('bg-white/10', 'hover:bg-white/20');
  textModeBtn.classList.remove('active-option');
  textModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');
  imageModeBtn.classList.remove('active-option');
  imageModeBtn.classList.add('bg-white/10', 'hover:bg-white/20');
  
  // Show/hide containers
  textInputContainer.style.display = 'none';
  imageInputContainer.style.display = 'none';
  audioInputContainer.style.display = 'block';
});

// Add event listener to microphone button
document.getElementById('micButton').addEventListener('click', toggleListening);

// Initialize speech recognition when page loads
initializeSpeechRecognition();

    </script>
      
   <script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('❌ Service Worker error:', err));
}
