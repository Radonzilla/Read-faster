// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadContainer = document.getElementById('uploadContainer');
const readerContainer = document.getElementById('readerContainer');
const currentWord = document.getElementById('currentWord');
const wordCounter = document.getElementById('wordCounter');
const wpmDisplay = document.getElementById('wpmDisplay');
const progressSlider = document.getElementById('progressSlider');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const closeBtn = document.getElementById('closeBtn');
const themeToggle = document.getElementById('themeToggle');
const loadingOverlay = document.getElementById('loadingOverlay');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const estimatedTime = document.getElementById('estimatedTime');

// State variables
let words = [];
let currentIndex = 0;
let isPlaying = false;
let readingInterval;
let wpm = 300;
let theme = localStorage.getItem('theme') || 'light';

// Initialize the app
function init() {
    // Set up theme
    applyTheme();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved speed preference
    const savedSpeed = localStorage.getItem('readingSpeed');
    if (savedSpeed) {
        wpm = parseInt(savedSpeed);
        speedSlider.value = wpm;
        updateSpeedDisplay();
    }
}

// Set up all event listeners
function setupEventListeners() {
    // File upload via click
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop functionality
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Control buttons
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', goToPreviousWord);
    nextBtn.addEventListener('click', goToNextWord);
    resetBtn.addEventListener('click', resetReader);
    closeBtn.addEventListener('click', closeReader);
    
    // Sliders
    speedSlider.addEventListener('input', updateSpeed);
    progressSlider.addEventListener('input', updateProgress);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

// Handle drag over event
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

// Handle drag leave event
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Process the uploaded file
async function processFile(file) {
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    
    const extension = file.name.split('.').pop().toLowerCase();
    let text = '';
    
    try {
        // Process file based on extension
        if (extension === 'pdf') {
            text = await extractTextFromPdf(file);
        } else if (extension === 'epub') {
            text = await extractTextFromEpub(file);
        } else if (extension === 'txt') {
            text = await readTextFile(file);
        } else {
            alert('Unsupported file format. Please upload a PDF, EPUB, or TXT file.');
            loadingOverlay.style.display = 'none';
            return;
        }
        
        // Process the text
        if (text) {
            processText(text);
            
            // Update file info
            fileName.textContent = file.name;
            const readingTime = Math.ceil(words.length / wpm);
            const timeStr = readingTime < 1 ? 'Less than 1 minute' :
                         readingTime === 1 ? '1 minute' :
                         `${readingTime} minutes`;
            estimatedTime.textContent = `Estimated reading time: ${timeStr}`;
            fileInfo.style.display = 'flex';
            
            // Show reader interface
            switchToReaderMode();
        } else {
            alert('Could not extract text from this file. Please try another file.');
        }
    } catch (error) {
        console.error('Error processing file:', error);
        alert('An error occurred while processing the file. Please try again.');
    }
    
    // Hide loading overlay
    loadingOverlay.style.display = 'none';
}

// Extract text from a PDF file
async function extractTextFromPdf(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const arrayBuffer = event.target.result;
            
            try {
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                let text = '';
                
                // Extract text from each page
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const strings = content.items.map(item => item.str);
                    text += strings.join(' ') + ' ';
                }
                
                resolve(text);
            } catch (error) {
                console.error('Error extracting PDF text:', error);
                resolve('');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Extract text from an EPUB file
async function extractTextFromEpub(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const zip = new JSZip();
                const contents = await zip.loadAsync(event.target.result);
                
                // Find the content files
                const files = [];
                contents.forEach((relativePath, zipEntry) => {
                    if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
                        files.push(zipEntry);
                    }
                });
                
                // Extract text from content files
                let text = '';
                for (const file of files) {
                    const content = await file.async('text');
                    // Simple HTML tag stripping
                    const strippedText = content.replace(/<[^>]*>/g, ' ');
                    text += strippedText + ' ';
                }
                
                resolve(text);
            } catch (error) {
                console.error('Error extracting EPUB text:', error);
                resolve('');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Read a text file
function readTextFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        reader.readAsText(file);
    });
}

// Process text into words
function processText(text) {
    // Clean up text
    const cleanText = text
        .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
        .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
        .trim();                   // Trim whitespace
    
    // Split text into words, preserving punctuation
    words = cleanText.match(/[\w']+(?:[.,!?;:]*)|\S/g) || [];
    
    // Reset reader state
    currentIndex = 0;
    updateWordDisplay();
    updateProgressSlider();
}

// Switch to reader mode
function switchToReaderMode() {
    uploadContainer.style.display = 'none';
    readerContainer.style.display = 'flex';
    
    // Enable navigation buttons if there are words
    if (words.length > 1) {
        nextBtn.disabled = false;
    }
}

// Update the word display
function updateWordDisplay() {
    if (words.length > 0 && currentIndex < words.length) {
        currentWord.textContent = words[currentIndex];
        currentWord.classList.remove('fade-in');
        // Trigger reflow to restart animation
        void currentWord.offsetWidth;
        currentWord.classList.add('fade-in');
        
        wordCounter.textContent = `Word ${currentIndex + 1}/${words.length}`;
        
        // Update controls
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === words.length - 1;
    } else if (currentIndex >= words.length && words.length > 0) {
        // End of text
        currentWord.textContent = "Finished!";
        currentWord.classList.remove('fade-in');
        stopReading();
    }
}

// Toggle play/pause
function togglePlayPause() {
    if (isPlaying) {
        stopReading();
    } else {
        startReading();
    }
}

// Start the reading process
function startReading() {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    isPlaying = true;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    const intervalMs = Math.floor(60000 / wpm); // Convert WPM to milliseconds
    
    if (readingInterval) clearInterval(readingInterval);
    
    // Display the first word immediately
    updateWordDisplay();
    
    // Set up interval for next words
    readingInterval = setInterval(() => {
        currentIndex++;
        if (currentIndex < words.length) {
            updateWordDisplay();
            updateProgressSlider();
        } else {
            // End of text
            updateProgressSlider();
            updateWordDisplay();
            stopReading();
        }
    }, intervalMs);
}

// Stop the reading process
function stopReading() {
    isPlaying = false;
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (readingInterval) {
        clearInterval(readingInterval);
        readingInterval = null;
    }
}

// Go to previous word
function goToPreviousWord() {
    if (currentIndex > 0) {
        currentIndex--;
        updateWordDisplay();
        updateProgressSlider();
    }
}

// Go to next word
function goToNextWord() {
    if (currentIndex < words.length - 1) {
        currentIndex++;
        updateWordDisplay();
        updateProgressSlider();
    }
}

// Reset the reader
function resetReader() {
    stopReading();
    currentIndex = 0;
    updateWordDisplay();
    updateProgressSlider();
}

// Close the reader and return to upload screen
function closeReader() {
    stopReading();
    readerContainer.style.display = 'none';
    uploadContainer.style.display = 'flex';
    fileInfo.style.display = 'none';
    fileInput.value = '';
    words = [];
    currentIndex = 0;
}

// Update the reading speed
function updateSpeed() {
    wpm = parseInt(speedSlider.value);
    updateSpeedDisplay();
    
    // Save to localStorage
    localStorage.setItem('readingSpeed', wpm);
    
    // Restart reading if already playing
    if (isPlaying) {
        stopReading();
        startReading();
    }
    
    // Update estimated time if we have words loaded
    if (words.length > 0) {
        const readingTime = Math.ceil(words.length / wpm);
        const timeStr = readingTime < 1 ? 'Less than 1 minute' :
                     readingTime === 1 ? '1 minute' :
                     `${readingTime} minutes`;
        estimatedTime.textContent = `Estimated reading time: ${timeStr}`;
    }
}

// Update the speed display
function updateSpeedDisplay() {
    speedValue.textContent = `${wpm} WPM`;
    wpmDisplay.textContent = `${wpm} WPM`;
}

// Update progress based on slider
function updateProgress() {
    if (words.length === 0) return;
    
    const wasPlaying = isPlaying;
    if (wasPlaying) stopReading();
    
    const percentage = parseInt(progressSlider.value);
    currentIndex = Math.floor((percentage / 100) * (words.length - 1));
    
    updateWordDisplay();
    
    if (wasPlaying) startReading();
}

// Update progress slider based on current index
function updateProgressSlider() {
    if (words.length === 0) return;
    
    const percentage = Math.floor((currentIndex / (words.length - 1)) * 100);
    progressSlider.value = percentage;
}

// Toggle between light and dark themes
function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    localStorage.setItem('theme', theme);
}

// Apply current theme
function applyTheme() {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
    if (readerContainer.style.display === 'none') return;
    
    switch(e.key) {
        case ' ': // Space bar
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowRight':
            e.preventDefault();
            goToNextWord();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            goToPreviousWord();
            break;
        case 'Escape':
            e.preventDefault();
            closeReader();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            resetReader();
            break;
        case '+':
        case '=':
            e.preventDefault();
            // Increase speed by 25 WPM
            speedSlider.value = Math.min(1000, parseInt(speedSlider.value) + 25);
            updateSpeed();
            break;
        case '-':
            e.preventDefault();
            // Decrease speed by 25 WPM
            speedSlider.value = Math.max(50, parseInt(speedSlider.value) - 25);
            updateSpeed();
            break;
    }
}

// Display welcome message with a typing effect
function displayWelcomeMessage() {
    const welcomeText = "Ready to boost your reading speed?";
    let i = 0;
    currentWord.textContent = "";
    
    const typingInterval = setInterval(() => {
        if (i < welcomeText.length) {
            currentWord.textContent += welcomeText.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            setTimeout(() => {
                if (currentWord.textContent === welcomeText) {
                    currentWord.textContent = "Ready";
                }
            }, 2000);
        }
    }, 100);
}

// Special handling for punctuation pauses
function getWordReadingTime(word) {
    // Base time calculation
    let time = 60000 / wpm;
    
    // Add slight pauses for punctuation marks at the end of words
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
        time *= 1.5; // 50% longer pause for end of sentence
    } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
        time *= 1.2; // 20% longer pause for mid-sentence punctuation
    }
    
    // Longer pause for long words
    if (word.length > 8) {
        time *= 1.1; // 10% longer for long words
    }
    
    return time;
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
    init();
    displayWelcomeMessage();
});