// Global Variables
let words = [];
let currentIndex = 0;
let intervalId;
let speed = 300;
let readingStats = {
  totalWords: 0,
  readingTime: 0,
  averageSpeed: 0
};

// Wikipedia API handler
class WikipediaAPI {
  constructor() {
    this.baseUrl = 'https://en.wikipedia.org/w/api.php';
    this.maxWords = 500;
  }

  async fetchRandomArticle() {
    try {
      const randomArticle = await this.getRandomArticle();
      if (!randomArticle) throw new Error('No random article found');

      const articleContent = await this.getArticleContent(randomArticle.id);
      if (!articleContent) throw new Error('No article content found');

      return this.processArticleContent(articleContent, randomArticle.title);
    } catch (error) {
      throw new Error(`Wikipedia API Error: ${error.message}`);
    }
  }

  async getRandomArticle() {
    const params = new URLSearchParams({
      action: 'query',
      list: 'random',
      rnnamespace: '0',
      rnlimit: '1',
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    return data.query.random[0];
  }

  async getArticleContent(pageId) {
    const params = new URLSearchParams({
      action: 'parse',
      pageid: pageId,
      prop: 'text',
      formatversion: '2',
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    return await response.json();
  }

  processArticleContent(contentData, title) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentData.parse.text;

    const selectorsToRemove = [
      '.reference',
      '.citation',
      '.mw-references',
      '.reflist',
      '.refbegin',
      'script',
      '.mw-ext-cite-error',
      '.mw-editsection',
      'table',
      '.thumb',
      '.infobox',
      '.navbox'
    ];

    selectorsToRemove.forEach(selector => {
      tempDiv.querySelectorAll(selector).forEach(el => el.remove());
    });

    let text = tempDiv.innerText
      .replace(/\[\d+\]/g, '')
      .replace(/\n{2,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();

    const words = text.split(/\s+/).slice(0, this.maxWords);

    return {
      title,
      words,
      text: words.join(' '),
      complexity: this.calculateComplexity(words)
    };
  }

  calculateComplexity(words) {
    const thresholds = {
      easy: 5,
      medium: 8,
      hard: 12
    };

    const complexWords = words.filter(word => word.length > thresholds.hard).length;
    const ratio = (complexWords / words.length) * 100;

    return {
      ratio,
      level: ratio < 10 ? 'Easy' : ratio < 20 ? 'Medium' : 'Hard'
    };
  }
}

// Core Reading Functions
function startReading() {
  if (intervalId) clearInterval(intervalId);
  if (words.length === 0) return;

  intervalId = setInterval(() => {
    if (currentIndex >= words.length) {
      pauseReading();
      displayReadingStats();
      return;
    }

    document.getElementById('wordDisplay').innerText = words[currentIndex];
    updateProgress();
    currentIndex++;
  }, 60000 / speed);

  updateReadingStats();
}

function pauseReading() {
  clearInterval(intervalId);
  intervalId = null;
}

function resetReading() {
  currentIndex = 0;
  updateProgress();
  document.getElementById('wordDisplay').innerText = words[0] || 'Upload a file to start';
  pauseReading();
}

// UI Update Functions
function updateProgress() {
  const slider = document.getElementById('wordSlider');
  const progressBar = document.getElementById('progressBar');
  const wordInfo = document.getElementById('wordInfo');

  if (words.length > 0) {
    slider.max = words.length - 1;
    slider.value = currentIndex;
    progressBar.style.width = `${(currentIndex / (words.length - 1)) * 100}%`;
    wordInfo.innerText = `Word: ${currentIndex + 1} / ${words.length}`;
  }
}

function updateWordSlider() {
  const slider = document.getElementById('wordSlider');
  slider.max = words.length - 1;
  slider.value = currentIndex;
  updateProgress();
}

function jumpToWord(index) {
  currentIndex = parseInt(index);
  document.getElementById('wordDisplay').innerText = words[currentIndex] || '';
  updateProgress();
}

function updateSpeed(newSpeed) {
  speed = parseInt(newSpeed);
  if (intervalId) {
    pauseReading();
    startReading();
  }
}

// Wikipedia Integration
async function fetchWikipediaRandomArticle() {
  const wikiAPI = new WikipediaAPI();
  const wordDisplay = document.getElementById('wordDisplay');
  const articleTitle = document.getElementById('articleTitle');
  const difficultyRating = document.getElementById('difficultyRating');

  try {
    wordDisplay.innerText = 'Loading article...';
    const article = await wikiAPI.fetchRandomArticle();

    words = article.words;
    
    articleTitle.innerText = article.title;
    difficultyRating.innerText = 
      `Difficulty: ${article.complexity.level} (${article.complexity.ratio.toFixed(1)}% complex words)`;
    
    currentIndex = 0;
    updateWordSlider();
    startReading();
  } catch (error) {
    console.error(error);
    wordDisplay.innerText = 'Failed to fetch article. Please try again.';
    articleTitle.innerText = 'Error';
    difficultyRating.innerText = '';
  }
}

// Reading Statistics
function updateReadingStats() {
  const startTime = Date.now();
  
  intervalId = setInterval(() => {
    readingStats.totalWords = currentIndex;
    readingStats.readingTime = (Date.now() - startTime) / 1000;
    readingStats.averageSpeed = (readingStats.totalWords / readingStats.readingTime) * 60;
  }, 1000);
}

function displayReadingStats() {
  const statsModal = document.getElementById('statsModal');
  const statsContent = document.getElementById('statsContent');
  
  statsContent.innerHTML = `
    <p>Total Words Read: ${readingStats.totalWords}</p>
    <p>Reading Time: ${readingStats.readingTime.toFixed(2)} seconds</p>
    <p>Average Reading Speed: ${readingStats.averageSpeed.toFixed(2)} words/minute</p>
  `;
  
  statsModal.style.display = 'block';
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle.innerText = document.body.classList.contains('dark-mode') 
    ? 'Light Mode' 
    : 'Dark Mode';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Modal close button
  document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('statsModal').style.display = 'none';
  });

  // Click outside modal to close
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('statsModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});