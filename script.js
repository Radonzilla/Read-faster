let words = [];
let currentIndex = 0;
let intervalId;
let speed = 300;

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle.innerText = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
}

async function handleFileUpload() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return;

  document.getElementById('loading').style.display = 'block';
  document.getElementById('wordDisplay').innerText = '';

  try {
    const text = await extractText(file);
    words = text.split(/\s+|(?=[.,!?;:])/).filter(Boolean);
    updateWordSlider();
    resetReading();
  } catch (error) {
    console.error('Error extracting text:', error);
    document.getElementById('wordDisplay').innerText = 'Error processing file. Please try another file.';
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

async function extractText(file) {
  if (file.name.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  } else if (file.name.endsWith('.epub')) {
    return await extractTextFromEPUB(file);
  } else {
    throw new Error('Unsupported file format');
  }
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ');
  }
  return text;
}

async function extractTextFromEPUB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const book = Epub(arrayBuffer);

      book.ready.then(() => {
        console.log('EPUB file loaded successfully');
        let text = '';

        book.spine.spineItems.forEach(async (item, index) => {
          try {
            const section = await book.load(item.id);
            const doc = new DOMParser().parseFromString(section, 'text/html');
            text += doc.body.textContent + ' ';
            console.log(`Processed section ${index + 1}/${book.spine.spineItems.length}`);
          } catch (error) {
            console.error(`Error processing section ${item.id}:`, error);
          }

          if (index === book.spine.spineItems.length - 1) {
            resolve(text);
          }
        });
      }).catch((error) => {
        console.error('Error loading EPUB file:', error);
        reject(error);
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

function startReading() {
  if (words.length === 0) return;
  intervalId = setInterval(() => {
    if (currentIndex < words.length) {
      displayWord(words[currentIndex]);
      currentIndex++;
      updateWordSlider();
    } else {
      clearInterval(intervalId);
    }
  }, 60000 / speed);
}

function displayWord(word) {
  document.getElementById('wordDisplay').innerText = word;
}

function pauseReading() {
  clearInterval(intervalId);
}

function resetReading() {
  currentIndex = 0;
  pauseReading();
  displayWord(words[currentIndex]);
  updateWordSlider();
}

function updateSpeed(newSpeed) {
  speed = newSpeed;
  pauseReading();
  startReading();
}

function updateWordSlider() {
  const wordSlider = document.getElementById('wordSlider');
  const wordInfo = document.getElementById('wordInfo');
  wordSlider.max = words.length - 1;
  wordSlider.value = currentIndex;
  wordInfo.innerText = `Word: ${currentIndex + 1} / ${words.length}`;
}

function jumpToWord(index) {
  currentIndex = parseInt(index, 10);
  displayWord(words[currentIndex]);
  updateWordSlider();
}
