class FlashcardApp {
    constructor() {
        this.currentSubject = '';
        this.flashcards = [];
        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.theme = localStorage.getItem('theme') || 'light';
        this.subjects = this.loadSubjectsFromStorage();
        this.sampleFiles = [];
        this.showcaseExpanded = false;
        this.flashcardClickHandler = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.applyTheme();
        await this.loadSampleFiles();
        this.cleanupSampleFilesFromStorage();
        this.setupFileShowcase();
        this.showUploadSection();
    }

    setupFlashcardEventListener() {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            // Remove existing listener if it exists
            if (this.flashcardClickHandler) {
                flashcard.removeEventListener('click', this.flashcardClickHandler);
            }

            // Create new handler and store reference
            this.flashcardClickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.flipCard();
            };

            // Add the new listener
            flashcard.addEventListener('click', this.flashcardClickHandler);
        }
    }

    setupDragAndDrop() {
        const dragDropArea = document.getElementById('dragDropArea');
        const csvUpload = document.getElementById('csvUpload');

        if (!dragDropArea || !csvUpload) return;

        // Remove existing listeners to prevent duplicates
        dragDropArea.replaceWith(dragDropArea.cloneNode(true));
        const newDragDropArea = document.getElementById('dragDropArea');
        const newCsvUpload = document.getElementById('csvUpload');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            newDragDropArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            newDragDropArea.addEventListener(eventName, () => {
                newDragDropArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            newDragDropArea.addEventListener(eventName, () => {
                newDragDropArea.classList.remove('drag-over');
            }, false);
        });

        // Handle dropped files
        newDragDropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                newCsvUpload.files = files;
                this.handleFileUpload({ target: { files: files } });
            }
        }, false);

        // Handle click on drag area
        newDragDropArea.addEventListener('click', () => {
            newCsvUpload.click();
        });

        // Handle file input change
        newCsvUpload.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    resetUploadArea() {
        const dragDropArea = document.getElementById('dragDropArea');
        if (dragDropArea) {
            dragDropArea.innerHTML = `
                <div class="drag-drop-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="upload-icon">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <h3>Drag & Drop CSV File</h3>
                    <p>or click to browse</p>
                    <input type="file" id="csvUpload" accept=".csv" />
                </div>
            `;

            // Re-setup event listeners without duplicates
            this.setupDragAndDrop();
        }
    }

    resetFileInput() {
        const csvUpload = document.getElementById('csvUpload');
        if (csvUpload) {
            csvUpload.value = '';
        }
    }

    // LocalStorage Management
    loadSubjectsFromStorage() {
        const stored = localStorage.getItem('flashcard-subjects');
        return stored ? JSON.parse(stored) : {};
    }

    saveSubjectToStorage(subjectName, flashcards) {
        this.subjects[subjectName] = {
            flashcards: flashcards,
            lastAccessed: new Date().toISOString(),
            cardCount: flashcards.length
        };
        localStorage.setItem('flashcard-subjects', JSON.stringify(this.subjects));
        localStorage.setItem('last-subject', subjectName);
    }

    loadSavedSubject() {
        const lastSubject = localStorage.getItem('last-subject');
        if (lastSubject && this.subjects[lastSubject]) {
            this.currentSubject = lastSubject;
            this.flashcards = this.subjects[lastSubject].flashcards;
            this.currentCardIndex = parseInt(localStorage.getItem(`${lastSubject}-card-index`)) || 0;

            // Ensure card index is valid
            if (this.currentCardIndex >= this.flashcards.length) {
                this.currentCardIndex = 0;
            }

            this.showFlashcards();
            this.loadCard();
        }
    }

    saveCurrentProgress() {
        if (this.currentSubject && this.flashcards.length > 0) {
            localStorage.setItem(`${this.currentSubject}-card-index`, this.currentCardIndex.toString());
            localStorage.setItem('last-subject', this.currentSubject);
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // File showcase toggle
        document.getElementById('toggleShowcase').addEventListener('click', () => {
            this.toggleFileShowcase();
        });

        // Navigation
        document.getElementById('backToUpload').addEventListener('click', () => {
            this.showUploadSection();
        });

        // Flashcard controls
        document.getElementById('newCardBtn').addEventListener('click', () => {
            this.loadRandomCard();
        });

        document.getElementById('prevCardBtn').addEventListener('click', () => {
            this.loadPreviousCard();
        });

        document.getElementById('nextCardBtn').addEventListener('click', () => {
            this.loadNextCard();
        });

        // Initial setup of drag and drop
        this.setupDragAndDrop();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a CSV file.');
            this.resetFileInput();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                this.flashcards = this.parseCSV(csvText);

                if (this.flashcards.length === 0) {
                    alert('No valid flashcards found in the CSV file. Please check the format.');
                    this.resetFileInput();
                    return;
                }

                this.currentSubject = file.name.replace('.csv', '');
                this.currentCardIndex = 0;

                // Save to localStorage
                this.saveSubjectToStorage(this.currentSubject, this.flashcards);

                this.showFlashcards();
                setTimeout(() => {
                    this.loadCard();
                }, 350);

                // Reset file input for next upload
                this.resetFileInput();
            } catch (error) {
                console.error('Error parsing CSV:', error);
                alert('Error parsing CSV file. Please ensure it has the correct format (Question, Answer).');
                this.resetFileInput();
            }
        };
        reader.readAsText(file);
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const flashcards = [];

        // Skip header if it exists
        const startIndex = lines[0].toLowerCase().includes('question') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Simple CSV parsing - handles basic cases
            const parts = this.parseCSVLine(line);
            if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                flashcards.push({
                    question: parts[0].trim(),
                    answer: parts[1].trim()
                });
            }
        }

        return flashcards;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result.map(item => item.replace(/^"|"$/g, ''));
    }

    showUploadSection() {
        // Hide all other sections first
        const sections = ['flashcardContainer', 'subjectsSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section && !section.classList.contains('hidden')) {
                section.style.transition = 'all 0.15s ease-out';
                section.style.opacity = '0';
                section.style.transform = 'translateY(-10px) scale(0.98)';

                setTimeout(() => {
                    section.classList.add('hidden');
                    section.style.transition = '';
                    section.style.opacity = '';
                    section.style.transform = '';
                }, 150);
            }
        });

        this.resetCard();
        this.currentSubject = '';
        this.updateFileShowcase();

        // Show upload section with animation
        setTimeout(() => {
            const uploadSection = document.getElementById('uploadSection');
            if (uploadSection) {
                uploadSection.classList.remove('hidden');
                uploadSection.style.opacity = '0';
                uploadSection.style.transform = 'translateY(10px) scale(0.98)';

                // Trigger reflow
                uploadSection.offsetHeight;

                uploadSection.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                uploadSection.style.opacity = '1';
                uploadSection.style.transform = 'translateY(0) scale(1)';

                setTimeout(() => {
                    uploadSection.style.transition = '';
                    uploadSection.style.opacity = '';
                    uploadSection.style.transform = '';

                    // Reset upload area after transition
                    this.resetUploadArea();
                }, 200);
            }
        }, 150);
    }

    showFlashcards() {
        this.transitionToView('flashcardContainer', 'uploadSection');
        this.transitionToView('flashcardContainer', 'subjectsSection');
        document.getElementById('currentSubject').textContent = this.currentSubject;
        this.updateCardCounter();
        this.updateFileShowcase();

        // Set up flashcard event listener after view transition
        setTimeout(() => {
            this.setupFlashcardEventListener();
        }, 300);
    }

    transitionToView(showElement, hideElement) {
        const elementToShow = document.getElementById(showElement);
        const elementToHide = document.getElementById(hideElement);

        if (!elementToShow || !elementToHide) return;

        // Skip if already in correct state
        if (!elementToShow.classList.contains('hidden') && elementToHide.classList.contains('hidden')) {
            return;
        }

        // Immediately hide the current view
        elementToHide.style.transition = 'all 0.15s ease-out';
        elementToHide.style.opacity = '0';
        elementToHide.style.transform = 'translateY(-10px) scale(0.98)';

        setTimeout(() => {
            // Hide current view
            elementToHide.classList.add('hidden');
            elementToHide.style.transition = '';
            elementToHide.style.opacity = '';
            elementToHide.style.transform = '';

            // Show new view immediately with enter animation
            elementToShow.classList.remove('hidden');
            elementToShow.style.opacity = '0';
            elementToShow.style.transform = 'translateY(10px) scale(0.98)';

            // Trigger reflow
            elementToShow.offsetHeight;

            // Start enter animation
            elementToShow.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            elementToShow.style.opacity = '1';
            elementToShow.style.transform = 'translateY(0) scale(1)';

            setTimeout(() => {
                elementToShow.style.transition = '';
                elementToShow.style.opacity = '';
                elementToShow.style.transform = '';
            }, 200);

        }, 150);
    }

    loadRandomCard() {
        if (this.flashcards.length === 0) {
            alert('No flashcards available.');
            return;
        }

        this.currentCardIndex = Math.floor(Math.random() * this.flashcards.length);
        this.loadCard();
    }

    loadPreviousCard() {
        if (this.flashcards.length === 0) return;

        this.currentCardIndex = this.currentCardIndex > 0 ?
            this.currentCardIndex - 1 :
            this.flashcards.length - 1;
        this.loadCard();
    }

    loadNextCard() {
        if (this.flashcards.length === 0) return;

        this.currentCardIndex = this.currentCardIndex < this.flashcards.length - 1 ?
            this.currentCardIndex + 1 :
            0;
        this.loadCard();
    }

    loadCard() {
        // Reset flip state first
        this.resetCard();

        // Add loading effect
        const flashcard = document.getElementById('flashcard');
        flashcard.style.opacity = '0.7';
        flashcard.style.transform = 'scale(0.95)';

        setTimeout(() => {
            const card = this.flashcards[this.currentCardIndex];

            document.getElementById('questionText').textContent = card.question;
            document.getElementById('answerText').textContent = card.answer;

            this.updateCardCounter();

            // Restore card appearance with animation
            flashcard.style.opacity = '1';
            flashcard.style.transform = 'scale(1)';

        }, 200);
    }

    flipCard() {
        const flashcard = document.getElementById('flashcard');
        this.isFlipped = !this.isFlipped;

        if (this.isFlipped) {
            flashcard.classList.add('flipped');
        } else {
            flashcard.classList.remove('flipped');
        }

        // Add a subtle scale effect during flip
        flashcard.style.transform = this.isFlipped ? 'rotateY(180deg) scale(1.02)' : 'scale(1.02)';

        setTimeout(() => {
            flashcard.style.transform = this.isFlipped ? 'rotateY(180deg)' : '';
        }, 100);
    }

    resetCard() {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.remove('flipped');
            this.isFlipped = false;
            flashcard.style.transform = '';
        }
    }

    updateCardCounter() {
        const counter = document.getElementById('cardCounter');
        if (this.flashcards.length > 0) {
            counter.textContent = `Card ${this.currentCardIndex + 1} of ${this.flashcards.length}`;
        } else {
            counter.textContent = 'No cards available';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
    }

    applyTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');
        const svg = themeToggle.querySelector('svg');

        if (this.theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            // Sun icon for dark mode
            svg.innerHTML = '<path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>';
        } else {
            body.removeAttribute('data-theme');
            // Moon icon for light mode
            svg.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
        }
    }

    // File Showcase Methods
    setupFileShowcase() {
        this.updateFileShowcase();

        // Setup header click to toggle
        document.querySelector('.showcase-header').addEventListener('click', () => {
            this.toggleFileShowcase();
        });
    }

    toggleFileShowcase() {
        const showcaseBar = document.getElementById('fileShowcaseBar');
        this.showcaseExpanded = !this.showcaseExpanded;

        if (this.showcaseExpanded) {
            showcaseBar.classList.add('expanded');
        } else {
            showcaseBar.classList.remove('expanded');
        }
    }

    async updateFileShowcase() {
        // Refresh sample files list in case new files were added
        await this.loadSampleFiles();
        this.renderAllFiles();
    }

    renderAllFiles() {
        const allFilesContainer = document.getElementById('allFiles');
        allFilesContainer.innerHTML = '';

        // Always reload subjects from localStorage to ensure we have the latest data
        this.subjects = this.loadSubjectsFromStorage();

        const uploadedFiles = Object.keys(this.subjects);
        // Filter out sample files that are already in uploaded files to prevent duplicates
        const sampleFilesToShow = this.sampleFiles.filter(sampleFile => {
            const sampleName = sampleFile.replace('.csv', '');
            return !uploadedFiles.includes(sampleName);
        });

        const allFiles = [
            ...uploadedFiles.map(f => ({ name: f, type: 'uploaded' })),
            ...sampleFilesToShow.map(f => ({ name: f, type: 'sample' }))
        ];

        if (allFiles.length === 0) {
            allFilesContainer.innerHTML = '<p class="no-files">No flashcard sets available</p>';
            return;
        }

        allFiles.forEach(file => {
            const fileItem = this.createFileItem(file.name, file.type);
            allFilesContainer.appendChild(fileItem);
        });
    }

    createFileItem(fileName, type) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        if (this.currentSubject === fileName.replace('.csv', '')) {
            fileItem.classList.add('active');
        }

        const canDelete = type === 'uploaded';

        fileItem.innerHTML = `
            <div class="file-item-content">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                ${fileName.replace('.csv', '')}
            </div>
            ${canDelete ? `
                <button class="file-item-delete" title="Delete flashcard set">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                </button>
            ` : ''}
        `;

        // Add click listener to the content area
        const contentArea = fileItem.querySelector('.file-item-content');
        contentArea.addEventListener('click', () => {
            this.loadFileFromShowcase(fileName, type);
            // Close the showcase dropdown after selection
            this.showcaseExpanded = true; // Set to true so toggle will close it
            this.toggleFileShowcase();
        });

        // Add delete functionality if it's an uploaded file
        if (canDelete) {
            const deleteBtn = fileItem.querySelector('.file-item-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFlashcardSet(fileName);
            });
        }

        return fileItem;
    }

    deleteFlashcardSet(fileName) {
        const subjectName = fileName.replace('.csv', '');
        this.showDeleteModal(subjectName, () => {
            // Remove from subjects
            delete this.subjects[subjectName];

            // Update localStorage
            localStorage.setItem('flashcard-subjects', JSON.stringify(this.subjects));

            // Also remove the last-subject if it was the deleted one
            if (localStorage.getItem('last-subject') === subjectName) {
                localStorage.removeItem('last-subject');
            }

            // Remove the card index for this subject
            localStorage.removeItem(`${subjectName}-card-index`);

            // If this was the current subject, go back to upload
            if (this.currentSubject === subjectName) {
                this.currentSubject = '';
                this.flashcards = [];
                this.showUploadSection();
            }

            // Reload subjects from storage to ensure consistency
            this.subjects = this.loadSubjectsFromStorage();

            // Update the showcase
            this.updateFileShowcase();
        });
    }

    showDeleteModal(subjectName, onConfirm) {
        const modal = document.getElementById('deleteModal');
        const subjectNameSpan = document.getElementById('deleteSubjectName');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');
        const overlay = modal.querySelector('.delete-modal-overlay');

        subjectNameSpan.textContent = subjectName;

        // Show modal
        modal.classList.remove('hidden');

        // Handle confirm
        const handleConfirm = () => {
            onConfirm();
            this.hideDeleteModal();
            cleanup();
        };

        // Handle cancel
        const handleCancel = () => {
            this.hideDeleteModal();
            cleanup();
        };

        // Handle overlay click
        const handleOverlayClick = (e) => {
            if (e.target === overlay) {
                this.hideDeleteModal();
                cleanup();
            }
        };

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideDeleteModal();
                cleanup();
            }
        };

        // Cleanup function
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleOverlayClick);
            document.removeEventListener('keydown', handleEscape);
        };

        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleOverlayClick);
        document.addEventListener('keydown', handleEscape);
    }

    hideDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.add('hidden');
    }

    async loadSampleFiles() {
        // GitHub Pages doesn't support directory listing, so we use a hardcoded list
        // of available sample files in the root directory
        const availableFiles = ['DBMS.csv', 'DSA.csv', 'OS.csv', 'Python.csv'];
        const validFiles = [];

        // Verify each file exists by making a HEAD request
        for (const file of availableFiles) {
            try {
                const response = await fetch(file, { method: 'HEAD' });
                if (response.ok) {
                    validFiles.push(file);
                }
            } catch (error) {
                console.log(`File ${file} not accessible:`, error);
            }
        }

        this.sampleFiles = validFiles;
        console.log('Available sample files:', this.sampleFiles);
    }

    async loadSampleFilesFallback() {
        // Fallback method: use the same hardcoded list as the main method
        const availableFiles = ['DBMS.csv', 'DSA.csv', 'OS.csv', 'Python.csv'];
        const validFiles = [];

        for (const file of availableFiles) {
            try {
                const response = await fetch(file, { method: 'HEAD' });
                if (response.ok) {
                    validFiles.push(file);
                }
            } catch (error) {
                console.log(`Fallback: File ${file} not accessible:`, error);
            }
        }

        this.sampleFiles = validFiles;
    }

    cleanupSampleFilesFromStorage() {
        // Remove any sample files that might have been saved to localStorage
        const sampleFileNames = this.sampleFiles.map(file => file.replace('.csv', ''));
        let needsUpdate = false;

        sampleFileNames.forEach(sampleName => {
            if (this.subjects[sampleName]) {
                delete this.subjects[sampleName];
                needsUpdate = true;

                // Also clean up related localStorage entries
                localStorage.removeItem(`${sampleName}-card-index`);
                if (localStorage.getItem('last-subject') === sampleName) {
                    localStorage.removeItem('last-subject');
                }
            }
        });

        // Update localStorage if we removed any sample files
        if (needsUpdate) {
            localStorage.setItem('flashcard-subjects', JSON.stringify(this.subjects));
        }
    }

    async loadFileFromShowcase(fileName, type) {
        try {
            let csvText;

            if (type === 'uploaded') {
                // Load from localStorage
                const subjectName = fileName.replace('.csv', '');
                if (this.subjects[subjectName]) {
                    this.currentSubject = subjectName;
                    this.flashcards = this.subjects[subjectName].flashcards;
                    this.currentCardIndex = 0;
                    this.showFlashcards();
                    // Wait for the transition to complete before loading card
                    setTimeout(() => {
                        this.loadCard();
                    }, 350);
                    return;
                }
            } else if (type === 'sample') {
                // Load from root directory
                const response = await fetch(fileName);
                if (!response.ok) {
                    throw new Error('Failed to load sample file');
                }
                csvText = await response.text();

                this.flashcards = this.parseCSV(csvText);

                if (this.flashcards.length === 0) {
                    alert('No valid flashcards found in the sample file.');
                    return;
                }

                this.currentSubject = fileName.replace('.csv', '');
                this.currentCardIndex = 0;

                // Sample files should never be saved to localStorage
                // They are loaded fresh from the root directory each time

                this.showFlashcards();
                // Wait for the transition to complete before loading card
                setTimeout(() => {
                    this.loadCard();
                }, 350);
            }
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file. Please try again.');
        }
    }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlashcardApp();
});
