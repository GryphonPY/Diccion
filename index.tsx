
import { marked } from "marked";

// No se importa GoogleGenAI directamente aquí en el frontend para la API key.

const MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Aún útil para la función serverless
const LIVE_WAVEFORM_SAMPLES = 256;
const NETLIFY_FUNCTION_PATH = "/.netlify/functions/gemini-proxy";

interface Note {
  id: string;
  title: string;
  rawText: string; 
  polishedHTML: string; 
  polishedMarkdown?: string; 
  polishModeUsed: string; 
  customPromptUsed?: string;
  createdAt: number;
  lastModified: number;
}

type PolishMode = "standard" | "concise_summary" | "bullet_points" | "formal_tone" | "custom";

interface PromptTemplate {
    name: string;
    value: string;
}

class App {
  // private genAI: GoogleGenAI; // Eliminado
  private editorTitle: HTMLDivElement;
  private polishedNote: HTMLDivElement;
  private rawTranscription: HTMLDivElement;
  private recordButton: HTMLButtonElement;
  private newButton: HTMLButtonElement;
  private polishTextButton: HTMLButtonElement;
  private retryPolishButton: HTMLButtonElement; 
  private themeToggleButton: HTMLButtonElement;
  private recordingStatus: HTMLElement;
  private liveRecordingTitle: HTMLElement;
  private liveWaveformCanvas: HTMLCanvasElement;
  private liveWaveformContext: CanvasRenderingContext2D | null = null;
  private liveRecordingTimerDisplay: HTMLElement;

  private recordingInterface: HTMLDivElement;
  private mainContent: HTMLDivElement;

  private historyButton: HTMLButtonElement;
  private historyPanel: HTMLDivElement;
  private closeHistoryPanelButton: HTMLButtonElement;
  private historyList: HTMLUListElement;
  private historySearchInput: HTMLInputElement;
  private exportHistoryButton: HTMLButtonElement; 
  private importHistoryButton: HTMLButtonElement; 
  private importHistoryInput: HTMLInputElement; 

  private audioUploadInput: HTMLInputElement;
  private audioUploadButton: HTMLButtonElement;

  private polishOptionsModal: HTMLDivElement;
  private closePolishOptionsModalButton: HTMLButtonElement;
  private polishModeSelect: HTMLSelectElement; 
  private customPromptContainer: HTMLDivElement;
  private customPromptTemplateContainer: HTMLDivElement; 
  private customPromptTemplateSelect: HTMLSelectElement; 
  private customPromptTextarea: HTMLTextAreaElement;
  private applyPolishOptionsButton: HTMLButtonElement;
  
  private currentNotePolishModeSelect: HTMLSelectElement; 
  private topCopyPolishedButton: HTMLButtonElement; 

  private copyPolishedButton: HTMLButtonElement;
  private exportPolishedTxtButton: HTMLButtonElement; 
  private exportPolishedMdButton: HTMLButtonElement;  
  private copyRawButton: HTMLButtonElement;
  private exportRawTxtButton: HTMLButtonElement;     
  private exportRawMdButton: HTMLButtonElement;   
  
  private polishedCounters: HTMLDivElement; 
  private rawCounters: HTMLDivElement; 

  private confirmDeleteModal: HTMLDivElement;
  private confirmDeleteMessageElement: HTMLParagraphElement;
  private confirmDeleteConfirmButton: HTMLButtonElement;
  private confirmDeleteCancelButton: HTMLButtonElement;
  private currentDeleteNoteId: string | null = null;

  private confirmAudioUploadModal: HTMLDivElement;
  private confirmAudioUploadMessageElement: HTMLParagraphElement;
  private confirmAudioUploadOverwriteButton: HTMLButtonElement;
  private confirmAudioUploadCreateNewButton: HTMLButtonElement;
  private confirmAudioUploadCancelButton: HTMLButtonElement;
  private pendingAudioFile: File | null = null;
  private pendingAudioUploadEventTarget: HTMLInputElement | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private waveformDataArray: Uint8Array | null = null;
  private waveformAnimationId: number | null = null;

  private liveRecordingStartTime: number = 0;
  private liveRecordingTimerIntervalId: number | null = null;

  private markdownParser: typeof marked;

  private polishedNotePlaceholder: string;
  private rawTranscriptionPlaceholder: string;
  private editorTitlePlaceholder: string;

  private currentNote: Note | null = null;
  private notes: Note[] = [];
  private currentPolishMode: PolishMode = "standard";
  private currentCustomPolishPrompt: string = "";
  private autosaveTimeout: number | null = null;
  private statusClearTimeout: number | null = null; 

  private readonly promptTemplates: PromptTemplate[] = [
    { name: "Seleccionar plantilla...", value: "" },
    { name: "Resumir para email", value: "Resume el siguiente texto para incluirlo en un email conciso. Enfócate en los puntos principales y acciones requeridas. Formatea en markdown. Asegúrate de que la respuesta esté en español." },
    { name: "Extraer puntos clave (Viñetas)", value: "Extrae los puntos clave más importantes del siguiente texto en formato de lista de viñetas (markdown). Asegúrate de que la respuesta esté en español." },
    { name: "Corregir gramática y estilo", value: "Revisa y corrige la gramática, ortografía y estilo del siguiente texto para que sea claro y profesional. Mantén el formato original si es posible. Formatea en markdown. Asegúrate de que la respuesta esté en español." },
    { name: "Traducir a Inglés", value: "Translate the following text to English. Preserve original formatting if possible. Respond only with the translation." },
    { name: "Traducir a Español", value: "Traduce el siguiente texto al español. Conserva el formato original si es posible. Responde únicamente con la traducción." },
    { name: "Explicar como si tuviera 5 años", value: "Explain the following concept or text as if I were 5 years old. Use simple words and short sentences. Format in markdown. Ensure the response is in Spanish." },
  ];

  constructor() {
    // No se inicializa this.genAI aquí, ni se verifica API_KEY.
    // La función Netlify se encargará de la API Key.
    this.markdownParser = marked;

    this.editorTitle = document.querySelector(".editor-title") as HTMLDivElement;
    this.polishedNote = document.getElementById("polishedNote") as HTMLDivElement;
    this.rawTranscription = document.getElementById("rawTranscription") as HTMLDivElement;
    this.recordButton = document.getElementById("recordButton") as HTMLButtonElement;
    this.newButton = document.getElementById("newButton") as HTMLButtonElement;
    this.polishTextButton = document.getElementById("polishTextButton") as HTMLButtonElement;
    this.retryPolishButton = document.getElementById("retryPolishButton") as HTMLButtonElement;
    this.themeToggleButton = document.getElementById("themeToggleButton") as HTMLButtonElement;
    this.recordingStatus = document.getElementById("recordingStatus") as HTMLElement;

    this.liveRecordingTitle = document.getElementById("liveRecordingTitle") as HTMLElement;
    this.liveWaveformCanvas = document.getElementById("liveWaveformCanvas") as HTMLCanvasElement;
    this.liveRecordingTimerDisplay = document.getElementById("liveRecordingTimerDisplay") as HTMLElement;
    
    this.recordingInterface = document.querySelector(".recording-interface") as HTMLDivElement;
    this.mainContent = document.querySelector(".main-content") as HTMLDivElement;

    this.historyButton = document.getElementById("historyButton") as HTMLButtonElement;
    this.historyPanel = document.getElementById("historyPanel") as HTMLDivElement;
    this.closeHistoryPanelButton = document.getElementById("closeHistoryPanelButton") as HTMLButtonElement;
    this.historyList = document.getElementById("historyList") as HTMLUListElement;
    this.historySearchInput = document.getElementById("historySearchInput") as HTMLInputElement;
    this.exportHistoryButton = document.getElementById("exportHistoryButton") as HTMLButtonElement;
    this.importHistoryButton = document.getElementById("importHistoryButton") as HTMLButtonElement;
    this.importHistoryInput = document.getElementById("importHistoryInput") as HTMLInputElement;

    this.audioUploadInput = document.getElementById("audioUploadInput") as HTMLInputElement;
    this.audioUploadButton = document.getElementById("audioUploadButton") as HTMLButtonElement;
    
    this.polishOptionsModal = document.getElementById("polishOptionsModal") as HTMLDivElement;
    this.closePolishOptionsModalButton = document.getElementById("closePolishOptionsModalButton") as HTMLButtonElement;
    this.polishModeSelect = document.getElementById("polishModeSelect") as HTMLSelectElement; 
    this.customPromptContainer = document.getElementById("customPromptContainer") as HTMLDivElement;
    this.customPromptTemplateContainer = document.getElementById("customPromptTemplateContainer") as HTMLDivElement;
    this.customPromptTemplateSelect = document.getElementById("customPromptTemplateSelect") as HTMLSelectElement;
    this.customPromptTextarea = document.getElementById("customPromptTextarea") as HTMLTextAreaElement;
    this.applyPolishOptionsButton = document.getElementById("applyPolishOptionsButton") as HTMLButtonElement;
    
    this.currentNotePolishModeSelect = document.getElementById("currentNotePolishModeSelect") as HTMLSelectElement;
    this.topCopyPolishedButton = document.getElementById("topCopyPolishedButton") as HTMLButtonElement;
    
    this.copyPolishedButton = document.getElementById("copyPolishedButton") as HTMLButtonElement;
    this.exportPolishedTxtButton = document.getElementById("exportPolishedTxtButton") as HTMLButtonElement;
    this.exportPolishedMdButton = document.getElementById("exportPolishedMdButton") as HTMLButtonElement;
    
    this.copyRawButton = document.getElementById("copyRawButton") as HTMLButtonElement;
    this.exportRawTxtButton = document.getElementById("exportRawTxtButton") as HTMLButtonElement;
    this.exportRawMdButton = document.getElementById("exportRawMdButton") as HTMLButtonElement;

    this.polishedCounters = document.getElementById("polishedCounters") as HTMLDivElement;
    this.rawCounters = document.getElementById("rawCounters") as HTMLDivElement;

    this.confirmDeleteModal = document.getElementById("confirmDeleteModal") as HTMLDivElement;
    this.confirmDeleteMessageElement = document.getElementById("confirmDeleteModalMessage") as HTMLParagraphElement;
    this.confirmDeleteConfirmButton = document.getElementById("confirmDeleteConfirmButton") as HTMLButtonElement;
    this.confirmDeleteCancelButton = document.getElementById("confirmDeleteCancelButton") as HTMLButtonElement;

    this.confirmAudioUploadModal = document.getElementById("confirmAudioUploadModal") as HTMLDivElement;
    this.confirmAudioUploadMessageElement = document.getElementById("confirmAudioUploadModalMessage") as HTMLParagraphElement;
    this.confirmAudioUploadOverwriteButton = document.getElementById("confirmAudioUploadOverwriteButton") as HTMLButtonElement;
    this.confirmAudioUploadCreateNewButton = document.getElementById("confirmAudioUploadCreateNewButton") as HTMLButtonElement;
    this.confirmAudioUploadCancelButton = document.getElementById("confirmAudioUploadCancelButton") as HTMLButtonElement;

    this.polishedNotePlaceholder = this.polishedNote.getAttribute('placeholder') || 'Tus notas pulidas aparecerán aquí...';
    this.rawTranscriptionPlaceholder = this.rawTranscription.getAttribute('placeholder') || 'La transcripción en bruto aparecerá aquí...';
    this.editorTitlePlaceholder = this.editorTitle.getAttribute('placeholder') || 'Nota sin Título';

    if (this.liveWaveformCanvas) {
        this.liveWaveformContext = this.liveWaveformCanvas.getContext('2d');
    }
    
    this.populatePromptTemplates();
    this.loadNotesFromStorage();
    this.initEventListeners();
    this.initConfirmDeleteModalListeners();
    this.initConfirmAudioUploadModalListeners();
    this.initializePlaceholders();
    this.checkInitialTheme();
    this.loadInitialNote();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
  }

  private showFatalError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed'; errorDiv.style.top = '0'; errorDiv.style.left = '0';
    errorDiv.style.width = '100%'; errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'red'; errorDiv.style.color = 'white';
    errorDiv.style.textAlign = 'center'; errorDiv.style.fontSize = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    const appContainer = document.querySelector('.app-container') as HTMLElement;
    if (appContainer) appContainer.style.display = 'none';
  }

  private initializePlaceholders(): void {
    this.setupPlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    this.setupPlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    this.setupPlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
  }
  
  private setupPlaceholder(element: HTMLElement, placeholderText: string): void {
    if (!element.textContent?.trim() && placeholderText) {
        element.textContent = placeholderText;
        element.classList.add('placeholder-active');
    }
    element.addEventListener('focus', () => {
        if (element.classList.contains('placeholder-active')) {
            element.textContent = '';
            element.classList.remove('placeholder-active');
        }
    });
    element.addEventListener('blur', () => {
        if (!element.textContent?.trim()) {
            element.textContent = placeholderText;
            element.classList.add('placeholder-active');
        }
        this.handleAutoSave(); 
    });
  }

  private clearPlaceholder(element: HTMLElement): void {
    const placeholderText = element.getAttribute('placeholder');
    if (element.classList.contains('placeholder-active') && placeholderText && element.textContent === placeholderText) {
        element.textContent = '';
    }
    element.classList.remove('placeholder-active');
  }

  private restorePlaceholder(element: HTMLElement, placeholderText: string): void {
    const isEmpty = element.isContentEditable ? 
                    (!element.innerHTML?.trim() || element.innerHTML === "<br>" || element.innerHTML === "<p><br></p>") : 
                    !element.textContent?.trim();

    if (isEmpty) {
        element.textContent = placeholderText; 
        element.classList.add('placeholder-active');
    } else if (!element.classList.contains('placeholder-active') && element.textContent === placeholderText){
        element.classList.add('placeholder-active');
    }
  }

  private populatePromptTemplates(): void {
    this.promptTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.value;
        option.textContent = template.name;
        this.customPromptTemplateSelect.appendChild(option);
    });
  }

  private initEventListeners(): void {
    this.recordButton.addEventListener("click", () => this.toggleRecording());
    this.newButton.addEventListener("click", () => this.createNewNoteUIAction());
    this.polishTextButton.addEventListener("click", () => this.handleManualPolishWithCurrentSettings());
    this.retryPolishButton.addEventListener("click", () => this.handleRetryPolish());
    this.themeToggleButton.addEventListener("click", () => this.toggleTheme());

    this.historyButton.addEventListener("click", () => this.toggleHistoryPanel());
    this.closeHistoryPanelButton.addEventListener("click", () => this.toggleHistoryPanel(false));
    this.historySearchInput.addEventListener("input", () => this.renderHistoryList());
    this.exportHistoryButton.addEventListener("click", () => this.exportHistory());
    this.importHistoryButton.addEventListener("click", () => this.importHistoryInput.click());
    this.importHistoryInput.addEventListener("change", (event) => this.importHistory(event));


    this.audioUploadButton.addEventListener("click", () => this.audioUploadInput.click());
    this.audioUploadInput.addEventListener("change", (event) => this.handleAudioFileUpload(event as Event));


    this.closePolishOptionsModalButton.addEventListener("click", () => this.togglePolishOptionsModal(false));
    this.polishModeSelect.addEventListener("change", () => this.handlePolishModeChangeInModal()); 
    this.customPromptTemplateSelect.addEventListener("change", () => this.handlePromptTemplateChange());
    this.applyPolishOptionsButton.addEventListener("click", () => this.applyAndPolishFromModal());

    this.currentNotePolishModeSelect.addEventListener("change", () => this.handleCurrentNotePolishModeChange());
    this.topCopyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));


    this.copyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));
    this.exportPolishedTxtButton.addEventListener("click", () => this.exportNoteContent('polished', 'txt'));
    this.exportPolishedMdButton.addEventListener("click", () => this.exportNoteContent('polished', 'md'));
    
    this.copyRawButton.addEventListener("click", () => this.copyContentToClipboard(this.rawTranscription, "Borrador"));
    this.exportRawTxtButton.addEventListener("click", () => this.exportNoteContent('raw', 'txt'));
    this.exportRawMdButton.addEventListener("click", () => this.exportNoteContent('raw', 'md'));


    this.editorTitle.addEventListener('input', () => this.handleContentChange(this.editorTitle, 'title'));
    this.polishedNote.addEventListener('input', () => {
        this.handleContentChange(this.polishedNote, 'polished');
        requestAnimationFrame(() => {
            this.updateWordCharCount('polished');
            this.updateTopCopyButtonVisibility();
        });
    });
    this.rawTranscription.addEventListener('input', () => {
      this.handleContentChange(this.rawTranscription, 'raw');
      requestAnimationFrame(() => {
        this.updateAllButtonStates();
        this.updateWordCharCount('raw');
      });
    });
    
    this.editorTitle.addEventListener('blur', () => this.updateDocumentTitle());
  }

  private initConfirmDeleteModalListeners(): void {
    this.confirmDeleteCancelButton.addEventListener('click', () => this.hideConfirmDeleteModal());
    this.confirmDeleteConfirmButton.addEventListener('click', () => {
        if (this.currentDeleteNoteId) {
            this.deleteNoteById(this.currentDeleteNoteId);
        }
        this.hideConfirmDeleteModal();
    });
  }

  private initConfirmAudioUploadModalListeners(): void {
    this.confirmAudioUploadOverwriteButton.addEventListener('click', () => {
        this.hideConfirmAudioUploadModal();
        if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
            this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
        }
    });
    this.confirmAudioUploadCreateNewButton.addEventListener('click', () => {
        this.hideConfirmAudioUploadModal();
        if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
            this.createNewNoteUIAction(); 
            this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
        }
    });
    this.confirmAudioUploadCancelButton.addEventListener('click', () => {
        this.hideConfirmAudioUploadModal();
        this.clearPendingAudioUpload();
    });
  }

  private handleContentChange(element: HTMLElement, fieldType: 'title' | 'polished' | 'raw'): void {
    if (element.classList.contains('placeholder-active')) {
         element.classList.remove('placeholder-active');
    }
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = window.setTimeout(() => {
      this.updateCurrentNoteFromUI(); 
      this.saveCurrentNote(false); 
    }, 750); 
  }

  private handleAutoSave(): void { 
      if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout); 
      this.updateCurrentNoteFromUI(); 
      this.saveCurrentNote(false); 
  }


  private loadNotesFromStorage(): void {
    const storedNotes = localStorage.getItem("dictationAppNotes");
    if (storedNotes) {
      try {
        this.notes = JSON.parse(storedNotes) as Note[];
        this.notes = this.notes.filter(note => note && typeof note.id === 'string' && typeof note.title === 'string');
        this.notes.sort((a, b) => b.lastModified - a.lastModified); 
      } catch (error) {
        console.error("Error al parsear notas del localStorage:", error);
        this.notes = [];
        localStorage.removeItem("dictationAppNotes"); 
      }
    } else {
      this.notes = [];
    }
    this.renderHistoryList();
  }

  private saveNotesToStorage(): void {
    try {
        localStorage.setItem("dictationAppNotes", JSON.stringify(this.notes));
    } catch (error) {
        console.error("Error al guardar notas en localStorage:", error);
        this.updateStatus("Error al guardar notas. Puede que el almacenamiento esté lleno.", "error", 5000);
    }
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  private createNewNoteObject(): Note {
    const timestamp = Date.now();
    return {
      id: this.generateUUID(),
      title: "", 
      rawText: "",
      polishedHTML: "",
      polishedMarkdown: "", 
      polishModeUsed: "standard", 
      customPromptUsed: undefined,
      createdAt: timestamp,
      lastModified: timestamp,
    };
  }
  
  private loadInitialNote(): void {
    if (this.notes.length > 0) {
      this.loadNoteIntoUI(this.notes[0].id, true); 
    } else {
      this.currentNote = this.createNewNoteObject();
      this.notes.push(this.currentNote); 
      this.saveNotesToStorage(); 
      this.renderHistoryList();
      this.updateUIFromCurrentNote();
    }
  }

  private createNewNoteUIAction(): void {
    if (this.currentNote) { 
        this.updateCurrentNoteFromUI(); 
        this.saveCurrentNote(false);      
    }
    this.currentNote = this.createNewNoteObject();
    this.notes.unshift(this.currentNote); 
    this.saveNotesToStorage(); 
    this.renderHistoryList();
    this.updateUIFromCurrentNote(); 
    this.updateStatus("Nueva nota creada.", "success", 2000);
    
    const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]') as HTMLButtonElement;
    if (polishedTabButton && typeof (window as any).setActiveTab === 'function') {
        (window as any).setActiveTab(polishedTabButton, true);
    }
    this.editorTitle.focus();
  }

  private updateCurrentNoteFromUI(): void {
    if (!this.currentNote) return;

    this.currentNote.title = this.editorTitle.classList.contains('placeholder-active') ? "" : this.editorTitle.textContent || "";
    this.currentNote.rawText = this.rawTranscription.classList.contains('placeholder-active') ? "" : this.rawTranscription.innerHTML;
    this.currentNote.polishedHTML = this.polishedNote.classList.contains('placeholder-active') ? "" : this.polishedNote.innerHTML;
    
    const selectedModeInHeader = this.currentNotePolishModeSelect.value as PolishMode;
    this.currentNote.polishModeUsed = selectedModeInHeader;
    this.currentPolishMode = selectedModeInHeader; 

    if (selectedModeInHeader === "custom") {
        this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
        delete this.currentNote.customPromptUsed;
    }
    
    this.currentNote.lastModified = Date.now();
  }

  private saveCurrentNote(showStatus: boolean = true): void {
    if (!this.currentNote) return;

    const noteIndex = this.notes.findIndex(note => note.id === this.currentNote!.id);
    if (noteIndex > -1) {
      this.notes[noteIndex] = { ...this.currentNote }; 
    } else {
      this.notes.unshift({ ...this.currentNote });
    }
    this.notes.sort((a, b) => b.lastModified - a.lastModified); 
    this.saveNotesToStorage(); 
    this.renderHistoryList();

    if (showStatus) {
        this.updateStatus("Nota guardada ✓", "success", 1500);
    }
  }

  private loadNoteIntoUI(noteId: string, isInitialLoad: boolean = false): void {
    const noteToLoad = this.notes.find(note => note.id === noteId);
    if (noteToLoad) {
      if (this.currentNote && this.currentNote.id !== noteId && !isInitialLoad) { 
          this.updateCurrentNoteFromUI(); 
          this.saveCurrentNote(false); 
      }
      this.currentNote = JSON.parse(JSON.stringify(noteToLoad)); 
      this.updateUIFromCurrentNote();
      if (!isInitialLoad) {
        this.updateStatus(`Nota "${this.currentNote.title || 'Sin Título'}" cargada.`, "success", 2000);
      }
      if (this.historyPanel.classList.contains('active')) {
        this.toggleHistoryPanel(false); 
      }
    } else {
        console.warn(`No se encontró la nota con ID: ${noteId}`);
        if (!isInitialLoad) this.loadInitialNote(); 
    }
  }
  
  private updateUIFromCurrentNote(): void {
    if (!this.currentNote) { 
        this.editorTitle.innerHTML = ""; 
        this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
        this.rawTranscription.innerHTML = ""; 
        this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
        this.polishedNote.innerHTML = ""; 
        this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
        
        this.currentNotePolishModeSelect.value = "standard";
        this.currentPolishMode = "standard";
        this.currentCustomPolishPrompt = "";
        this.updateDocumentTitle();
        this.updateAllButtonStates();
        this.updateAllWordCharCounts();
        this.updateTopCopyButtonVisibility();
        return;
    }

    if (this.currentNote.title && this.currentNote.title.trim() !== "" && this.currentNote.title !== this.editorTitlePlaceholder) {
      this.editorTitle.textContent = this.currentNote.title;
      this.clearPlaceholder(this.editorTitle);
    } else {
      this.editorTitle.innerHTML = ""; 
      this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    }

    if (this.currentNote.rawText && this.getPlainText(this.currentNote.rawText).trim() !== "") {
      this.rawTranscription.innerHTML = this.currentNote.rawText;
      this.clearPlaceholder(this.rawTranscription);
    } else {
      this.rawTranscription.innerHTML = "";
      this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
    }

    if (this.currentNote.polishedHTML && this.getPlainText(this.currentNote.polishedHTML).trim() !== "") {
      this.polishedNote.innerHTML = this.currentNote.polishedHTML;
      this.clearPlaceholder(this.polishedNote);
    } else {
      this.polishedNote.innerHTML = "";
      this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    }
    
    this.currentNotePolishModeSelect.value = this.currentNote.polishModeUsed || "standard";
    this.currentPolishMode = (this.currentNote.polishModeUsed || "standard") as PolishMode;
    this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || ""; 

    this.updateDocumentTitle();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
    this.updateTopCopyButtonVisibility();
        
    this.polishModeSelect.value = this.currentPolishMode; 
    this.customPromptTextarea.value = this.currentCustomPolishPrompt; 
    this.customPromptTemplateSelect.value = ""; 
    this.handlePolishModeChangeInModal(); 
  }

  private updateDocumentTitle(): void {
    if (this.currentNote && this.currentNote.title && !this.editorTitle.classList.contains('placeholder-active')) {
      document.title = `App de Dictado - ${this.currentNote.title}`;
    } else {
      document.title = "App de Dictado Avanzada";
    }
  }
  
  private toggleHistoryPanel(forceOpen?: boolean): void {
    const isActive = this.historyPanel.classList.contains('active');
    let openPanel: boolean;

    if (typeof forceOpen === 'boolean') {
        openPanel = forceOpen;
    } else {
        openPanel = !isActive;
    }

    if (openPanel) {
        this.historyPanel.classList.add('active');
        this.mainContent.classList.add('history-panel-active');
        this.historyButton.setAttribute('aria-expanded', 'true');
        this.historySearchInput.focus();
    } else {
        this.historyPanel.classList.remove('active');
        this.mainContent.classList.remove('history-panel-active');
        this.historyButton.setAttribute('aria-expanded', 'false');
    }
  }

  private renderHistoryList(): void {
    this.historyList.innerHTML = ""; 
    const searchTerm = this.historySearchInput.value.toLowerCase().trim();
    
    const filteredNotes = this.notes.filter(note => 
        (note.title || "Nota sin Título").toLowerCase().includes(searchTerm) ||
        (note.rawText && this.getPlainText(note.rawText).toLowerCase().includes(searchTerm)) || 
        (note.polishedHTML && this.getPlainText(note.polishedHTML).toLowerCase().includes(searchTerm)) 
    );

    if (filteredNotes.length === 0) {
        const li = document.createElement('li');
        li.textContent = searchTerm ? "No hay notas que coincidan con tu búsqueda." : "No hay notas guardadas.";
        li.classList.add('history-empty-message');
        this.historyList.appendChild(li);
        return;
    }

    filteredNotes.forEach(note => {
      const li = document.createElement('li');
      li.classList.add('history-item');
      li.dataset.noteId = note.id;
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `Cargar nota: ${note.title || 'Nota sin Título'}`);

      const mainDiv = document.createElement('div');
      mainDiv.classList.add('history-item-main');

      const titleSpan = document.createElement('span');
      titleSpan.classList.add('history-item-title');
      titleSpan.textContent = note.title || "Nota sin Título";
      
      const dateSpan = document.createElement('span');
      dateSpan.classList.add('history-item-date');
      dateSpan.textContent = new Date(note.lastModified).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

      mainDiv.appendChild(titleSpan);
      mainDiv.appendChild(dateSpan);

      const controlsDiv = document.createElement('div');
      controlsDiv.classList.add('history-item-controls');

      const editButton = document.createElement('button');
      editButton.classList.add('history-item-button', 'edit-button');
      editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
      editButton.title = "Editar título";
      editButton.setAttribute('aria-label', `Editar título de la nota: ${note.title || 'Nota sin Título'}`);
      editButton.onclick = (e) => {
        e.stopPropagation(); 
        this.handleEditHistoryItemTitle(note.id, titleSpan, mainDiv);
      };

      const deleteButton = document.createElement('button');
      deleteButton.classList.add('history-item-button', 'delete-button');
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.title = "Eliminar nota";
      deleteButton.setAttribute('aria-label', `Eliminar nota: ${note.title || 'Nota sin Título'}`);
      deleteButton.onclick = (e) => {
        e.stopPropagation(); 
        this.confirmDeleteNote(note.id);
      };
      
      controlsDiv.appendChild(editButton);
      controlsDiv.appendChild(deleteButton);
      
      li.appendChild(mainDiv);
      li.appendChild(controlsDiv);

      li.onclick = () => this.loadNoteIntoUI(note.id);
      li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') this.loadNoteIntoUI(note.id); };
      this.historyList.appendChild(li);
    });
  }

  private handleEditHistoryItemTitle(noteId: string, titleElement: HTMLSpanElement, mainDiv: HTMLDivElement): void {
    const currentTitle = titleElement.textContent || "";
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.classList.add('history-item-title-input');
    input.setAttribute('aria-label', 'Nuevo título de la nota');

    titleElement.style.display = 'none'; 
    mainDiv.insertBefore(input, titleElement.nextSibling); 
    input.focus();
    input.select();

    const saveTitle = () => {
        const newTitle = input.value.trim();
        this.handleSaveHistoryItemTitle(noteId, newTitle);
        titleElement.textContent = newTitle || "Nota sin Título";
        titleElement.style.display = '';
        if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.onblur = saveTitle;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
        } else if (e.key === 'Escape') {
            titleElement.style.display = '';
            if (input.parentNode) input.parentNode.removeChild(input);
        }
    };
  }

  private handleSaveHistoryItemTitle(noteId: string, newTitle: string): void {
    const noteIndex = this.notes.findIndex(n => n.id === noteId);
    if (noteIndex > -1) {
        this.notes[noteIndex].title = newTitle;
        this.notes[noteIndex].lastModified = Date.now(); 
        if (this.currentNote && this.currentNote.id === noteId) { 
            this.currentNote.title = newTitle;
            this.currentNote.lastModified = this.notes[noteIndex].lastModified;
            this.updateDocumentTitle();
            this.editorTitle.textContent = newTitle || "";
            if (newTitle && newTitle !== this.editorTitlePlaceholder) this.clearPlaceholder(this.editorTitle);
            else this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
        }
        this.saveNotesToStorage();
        this.renderHistoryList(); 
        this.updateStatus("Título de la nota actualizado.", "success", 1500);
    }
  }
  
  private showConfirmDeleteModal(noteId: string, noteTitle: string): void {
    this.currentDeleteNoteId = noteId;
    this.confirmDeleteMessageElement.textContent = `¿Estás seguro de que quieres eliminar la nota "${noteTitle || 'Sin Título'}"? Esta acción no se puede deshacer.`;
    this.confirmDeleteModal.style.display = "flex";
    this.confirmDeleteModal.setAttribute('aria-hidden', 'false');
    this.confirmDeleteConfirmButton.focus();
  }

  private hideConfirmDeleteModal(): void {
    this.confirmDeleteModal.style.display = "none";
    this.confirmDeleteModal.setAttribute('aria-hidden', 'true');
    this.currentDeleteNoteId = null;
  }
  
  private confirmDeleteNote(noteId: string): void {
      const noteToDelete = this.notes.find(n => n.id === noteId);
      if (!noteToDelete) return;
      this.showConfirmDeleteModal(noteId, noteToDelete.title);
  }

  private deleteNoteById(noteId: string): void {
    const noteWasCurrent = this.currentNote && this.currentNote.id === noteId;
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.saveNotesToStorage();

    if (noteWasCurrent) {
      this.loadInitialNote(); 
    }
    
    this.renderHistoryList(); 
    this.updateStatus("Nota eliminada.", "success", 2000);
  }

  private exportHistory(): void {
    if (this.notes.length === 0) {
        this.updateStatus("No hay notas para exportar.", "active", 2000);
        return;
    }
    try {
        const jsonData = JSON.stringify(this.notes, null, 2);
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0,10);
        a.href = url;
        a.download = `dictado_app_historial_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.updateStatus("Historial exportado exitosamente.", "success", 2500);
    } catch (error) {
        console.error("Error al exportar historial:", error);
        this.updateStatus("Error al exportar el historial.", "error", 4000);
    }
  }

  private importHistory(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const importedNotes = JSON.parse(e.target?.result as string) as Note[];
            if (!Array.isArray(importedNotes)) {
                throw new Error("El archivo JSON no contiene un array de notas.");
            }

            const validImportedNotes = importedNotes.filter(note => 
                note && typeof note.id === 'string' && typeof note.title === 'string' &&
                typeof note.createdAt === 'number' && typeof note.lastModified === 'number'
            );

            if (validImportedNotes.length === 0 && importedNotes.length > 0) {
                throw new Error("Ninguna nota válida encontrada en el archivo. Verifica el formato.");
            }
            
            const newNotesMap = new Map<string, Note>();
            this.notes.forEach(note => newNotesMap.set(note.id, note));
            validImportedNotes.forEach(note => newNotesMap.set(note.id, note));

            this.notes = Array.from(newNotesMap.values());
            this.notes.sort((a, b) => b.lastModified - a.lastModified);
            this.saveNotesToStorage(); 
            this.renderHistoryList();

            if (this.notes.length > 0 && (!this.currentNote || !this.notes.find(n => n.id === this.currentNote!.id))) {
                this.loadInitialNote(); 
            } else if (this.currentNote) {
                const updatedCurrentNote = this.notes.find(n => n.id === this.currentNote!.id);
                if (updatedCurrentNote) {
                    this.currentNote = JSON.parse(JSON.stringify(updatedCurrentNote)); 
                    this.updateUIFromCurrentNote();
                } else {
                    this.loadInitialNote(); 
                }
            }
            this.updateStatus(`Historial importado. ${validImportedNotes.length} notas cargadas/actualizadas.`, "success", 3000);
        } catch (error: any) {
            console.error("Error al importar historial:", error);
            this.updateStatus(`Error al importar: ${error.message}`, "error", 5000);
        } finally {
            input.value = ""; 
        }
    };
    reader.onerror = () => {
        this.updateStatus("Error al leer el archivo.", "error", 3000);
        input.value = "";
    };
    reader.readAsText(file);
  }

  private isCurrentNoteEmpty(): boolean {
    if (!this.currentNote) return true;
    const titleEmpty = this.currentNote.title.trim() === "" || this.editorTitle.classList.contains('placeholder-active');
    const rawEmpty = this.getPlainText(this.currentNote.rawText).trim() === "" || this.rawTranscription.classList.contains('placeholder-active');
    const polishedEmpty = this.getPlainText(this.currentNote.polishedHTML).trim() === "" || this.polishedNote.classList.contains('placeholder-active');
    return titleEmpty && rawEmpty && polishedEmpty;
  }

  private async handleAudioFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];

    if (!this.isCurrentNoteEmpty()) {
        this.pendingAudioFile = file;
        this.pendingAudioUploadEventTarget = input;
        this.showConfirmAudioUploadModal();
        return; 
    }
    this.proceedWithAudioProcessing(file, input);
  }

  private async proceedWithAudioProcessing(file: File, inputTarget: HTMLInputElement): Promise<void> {
    this.updateStatus(`Cargando archivo: ${file.name}...`, "active");
    try {
      const reader = new FileReader();
      const readResult = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader no devolvió una cadena.'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64data = await readResult;
      const base64Audio = base64data.split(',')[1] as string;
      if (!base64Audio) {
        throw new Error("Error al extraer datos de audio base64 del archivo.");
      }
      
      this.updateStatus("Archivo cargado. Transcribiendo...", "active");
      
      const rawText = await this.getTranscription(base64Audio, file.type);
      
      if (!this.currentNote) { 
          this.createNewNoteUIAction(); 
      }
      if (this.currentNote) { 
          this.currentNote.rawText = rawText; 
          this.currentNote.polishedHTML = ""; 
          this.currentNote.polishedMarkdown = "";
          
          if (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder) {
              this.currentNote.title = `Nota de ${file.name.split('.')[0]}`;
          }
          
          this.currentNote.lastModified = Date.now();
          this.saveCurrentNote(true); 
          this.updateUIFromCurrentNote(); 

          this.updateStatus("Transcripción del archivo completada.", "success", 3000);
          
          const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]') as HTMLButtonElement;
          if (rawTabButton && typeof (window as any).setActiveTab === 'function') {
            (window as any).setActiveTab(rawTabButton);
          }
      }

    } catch (error: any) {
      console.error("Error procesando archivo de audio:", error);
      this.updateStatus(`Error al cargar archivo: ${error.message}.`, "error", 5000);
    } finally {
        this.clearPendingAudioUpload(); 
    }
  }

  private showConfirmAudioUploadModal(): void {
    const currentTitle = this.currentNote?.title || 'Sin Título';
    this.confirmAudioUploadMessageElement.textContent = `La nota actual ("${currentTitle}") ya tiene contenido. ¿Qué deseas hacer con el archivo de audio subido?`;
    this.confirmAudioUploadModal.style.display = "flex";
    this.confirmAudioUploadModal.setAttribute('aria-hidden', 'false');
    this.confirmAudioUploadOverwriteButton.focus();
  }

  private hideConfirmAudioUploadModal(): void {
    this.confirmAudioUploadModal.style.display = "none";
    this.confirmAudioUploadModal.setAttribute('aria-hidden', 'true');
  }

  private clearPendingAudioUpload(): void {
    if (this.pendingAudioUploadEventTarget) {
        this.pendingAudioUploadEventTarget.value = ""; 
    }
    this.pendingAudioFile = null;
    this.pendingAudioUploadEventTarget = null;
  }

  private togglePolishOptionsModal(show: boolean): void {
    this.polishOptionsModal.style.display = show ? "flex" : "none";
    if (show) {
        this.polishOptionsModal.setAttribute('aria-hidden', 'false');
        const modeToShow = this.currentNote ? this.currentNote.polishModeUsed : this.currentPolishMode;
        const promptToShow = this.currentNote ? (this.currentNote.customPromptUsed || this.currentCustomPolishPrompt) : this.currentCustomPolishPrompt;
        
        this.polishModeSelect.value = modeToShow || "standard";
        this.customPromptTextarea.value = promptToShow || "";
        
        this.customPromptTemplateSelect.value = ""; 
        this.handlePolishModeChangeInModal(); 
        this.polishModeSelect.focus();
    } else {
        this.polishOptionsModal.setAttribute('aria-hidden', 'true');
    }
  }

  private handlePolishModeChangeInModal(): void {
    const selectedModeInModal = this.polishModeSelect.value as PolishMode;
    const isCustom = selectedModeInModal === "custom";
    this.customPromptContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTemplateContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTextarea.setAttribute('aria-hidden', isCustom ? 'false' : 'true');
    this.customPromptTemplateSelect.setAttribute('aria-hidden', isCustom ? 'false' : 'true');
  }
  
  private handleCurrentNotePolishModeChange(): void { 
    if (!this.currentNote) return;

    const newMode = this.currentNotePolishModeSelect.value as PolishMode;
    this.currentPolishMode = newMode; 
    
    if (newMode === "custom") {
        this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || "";
        this.polishModeSelect.value = "custom"; 
        this.customPromptTextarea.value = this.currentCustomPolishPrompt; 
        this.handlePolishModeChangeInModal(); 
        this.togglePolishOptionsModal(true); 
    } else {
        this.currentCustomPolishPrompt = ""; 
    }
    
    this.updateCurrentNoteFromUI(); 
    this.saveCurrentNote(false);   
    
    this.updateAllButtonStates(); 
  }


  private handlePromptTemplateChange(): void {
    const selectedValue = this.customPromptTemplateSelect.value;
    if (selectedValue) {
        this.customPromptTextarea.value = selectedValue;
        this.customPromptTextarea.focus();
        if (this.customPromptTextarea.classList.contains('placeholder-active')) {
            this.customPromptTextarea.classList.remove('placeholder-active');
        }
    }
  }
  
  private handleRetryPolish(): void {
    if (this.isRawTranscriptionEmpty()) {
        this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3000);
        return;
    }
    const modeToPreload = this.currentNote?.polishModeUsed || this.currentPolishMode || "standard";
    const customPromptToPreload = (modeToPreload === "custom" ? (this.currentNote?.customPromptUsed || this.currentCustomPolishPrompt) : "") || "";

    this.polishModeSelect.value = modeToPreload;
    this.customPromptTextarea.value = customPromptToPreload;
    this.handlePolishModeChangeInModal(); 
    this.togglePolishOptionsModal(true);
  }

  private applyAndPolishFromModal(): void {
    this.currentPolishMode = this.polishModeSelect.value as PolishMode; 
    if (this.currentPolishMode === "custom") {
        this.currentCustomPolishPrompt = this.customPromptTextarea.value.trim(); 
        if (!this.currentCustomPolishPrompt) {
            this.updateStatus("El prompt personalizado no puede estar vacío para el modo personalizado.", "error", 3000);
            return;
        }
    } else {
        this.currentCustomPolishPrompt = ""; 
    }
    this.togglePolishOptionsModal(false);
    this.handleManualPolishWithCurrentSettings(); 
  }

  private getPlainText(htmlContent: string): string {
    if (!htmlContent) return "";
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent.replace(/<br\s*\/?>/gi, '\n');
    return tempDiv.textContent || tempDiv.innerText || "";
  }

  private copyContentToClipboard(element: HTMLElement, type: string): void {
    let textToCopy = this.getPlainText(element.innerHTML);
    
    if (element.classList.contains('placeholder-active') || !textToCopy.trim()) {
        this.updateStatus(`${type} está vacío. Nada que copiar.`, "active", 2000);
        return;
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        this.updateStatus(`${type} copiado al portapapeles.`, "success", 2000);
      })
      .catch(err => {
        console.error(`Error al copiar ${type}:`, err);
        this.updateStatus(`Error al copiar ${type}. Intenta manually.`, "error", 4000);
      });
  }

  private exportNoteContent(contentSource: 'polished' | 'raw', format: 'txt' | 'md'): void {
    if (!this.currentNote) {
        this.updateStatus("No hay nota actual para exportar.", "error", 3000);
        return;
    }

    let content = "";
    let filename = (this.currentNote.title || "Nota_Sin_Título").replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
    let mimeType = "text/plain;charset=utf-8";

    if (contentSource === 'polished') {
        filename = `${filename}_pulida`;
        if (format === 'md') {
            content = this.currentNote.polishedMarkdown || this.getPlainText(this.currentNote.polishedHTML); 
            mimeType = "text/markdown;charset=utf-8";
            filename += ".md";
        } else { 
            content = this.getPlainText(this.currentNote.polishedHTML);
            filename += ".txt";
        }
    } else { 
        filename = `${filename}_borrador`;
        content = this.getPlainText(this.currentNote.rawText); 
        if (format === 'md') {
            mimeType = "text/markdown;charset=utf-8";
            filename += ".md";
        } else { 
            filename += ".txt";
        }
    }

    if (!content.trim()) {
        const sourceName = contentSource === 'polished' ? 'la nota pulida' : 'el borrador';
        this.updateStatus(`El contenido de ${sourceName} está vacío.`, "active", 3000);
        return;
    }

    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.updateStatus(`Nota exportada como ${format.toUpperCase()}.`, "success", 2000);
    } catch (error) {
        console.error("Error al exportar nota:", error);
        this.updateStatus("Error al exportar la nota.", "error", 4000);
    }
  }


  private checkInitialTheme(): void {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = localStorage.getItem('theme');
    const themeIcon = this.themeToggleButton.querySelector('i') as HTMLElement;
    if (currentTheme === 'dark' || (!currentTheme && prefersDark)) {
        document.body.classList.add('dark-mode'); 
        document.body.classList.remove('light-mode');
        if(themeIcon) themeIcon.className = 'fas fa-moon';
        this.themeToggleButton.setAttribute('aria-label', 'Cambiar a tema claro');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        if(themeIcon) themeIcon.className = 'fas fa-sun';
        this.themeToggleButton.setAttribute('aria-label', 'Cambiar a tema oscuro');
    }
  }

  private toggleTheme(): void {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode'); 
    
    let theme = 'light';
    const icon = this.themeToggleButton.querySelector('i') as HTMLElement;
    if (document.body.classList.contains('dark-mode')) {
        theme = 'dark';
        if (icon) icon.className = 'fas fa-moon';
        this.themeToggleButton.setAttribute('aria-label', 'Cambiar a tema claro');
    } else { 
        if (icon) icon.className = 'fas fa-sun';
        this.themeToggleButton.setAttribute('aria-label', 'Cambiar a tema oscuro');
    }
    localStorage.setItem('theme', theme);
  }

  private async toggleRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.updateStatus("Grabando... Acceso al micrófono concedido.", "success", 3000);

      this.recordButton.classList.add("recording");
      (this.recordButton.querySelector("i") as HTMLElement).className = "fas fa-stop";
      this.recordButton.title = "Detener Grabación";
      this.recordButton.setAttribute("aria-label", "Detener grabación");
      this.setControlsDisabledState(true, true); 
      
      this.recordingInterface.classList.add('is-live');
      this.mainContent.classList.add('has-live-panel');

      this.liveRecordingTitle.style.display = 'block';
      this.liveWaveformCanvas.style.display = 'block';
      this.liveRecordingTimerDisplay.style.display = 'block';


      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
      this.mediaRecorder.onstop = () => this.processAudio(stream);
      this.mediaRecorder.start();

      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = Math.max(256, LIVE_WAVEFORM_SAMPLES * 2); 
      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyserNode);
      this.waveformDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.drawLiveWaveform();

      this.liveRecordingStartTime = Date.now();
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);

    } catch (err: any) {
      console.error("Error al acceder al micrófono:", err);
      let message = "Acceso al micrófono denegado. Verifica los permisos en tu navegador.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No se encontró un micrófono. Conecta uno e inténtalo de nuevo.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Permiso para usar el micrófono denegado.";
      }
      this.updateStatus(message, "error", 5000);
      this.setControlsDisabledState(false, true); 
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop(); 
      this.updateStatus("Grabación detenida. Procesando...", "active");
      this.recordButton.classList.remove("recording");
      (this.recordButton.querySelector("i") as HTMLElement).className = "fas fa-microphone";
      this.recordButton.title = "Iniciar Grabación";
      this.recordButton.setAttribute("aria-label", "Iniciar grabación");
      
      this.recordingInterface.classList.remove('is-live');
      this.mainContent.classList.remove('has-live-panel');
      
      this.liveRecordingTitle.style.display = 'none';
      this.liveWaveformCanvas.style.display = 'none';
      this.liveRecordingTimerDisplay.style.display = 'none';

      if (this.waveformAnimationId) cancelAnimationFrame(this.waveformAnimationId);
      if (this.microphoneSource) this.microphoneSource.disconnect();
      if (this.analyserNode) this.analyserNode.disconnect();
      if (this.audioContext && this.audioContext.state !== 'closed') this.audioContext.close().catch(console.error);
      
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = null;
    }
  }
  
  private setControlsDisabledState(disabled: boolean, isRecordingRelated: boolean = false): void {
      this.newButton.disabled = disabled;
      this.audioUploadButton.disabled = disabled;
      this.historyButton.disabled = disabled;

      if (isRecordingRelated) {
        this.polishTextButton.disabled = disabled || this.isRawTranscriptionEmpty();
        this.retryPolishButton.disabled = disabled || this.isRawTranscriptionEmpty();
      } else {
        this.polishTextButton.disabled = this.isRawTranscriptionEmpty();
        this.retryPolishButton.disabled = this.isRawTranscriptionEmpty();
      }
  }

  private updateAllButtonStates(): void {
    const isRecording = this.mediaRecorder?.state === "recording";
    this.setControlsDisabledState(isRecording, true);

    const rawIsEmpty = this.isRawTranscriptionEmpty();
    this.polishTextButton.disabled = rawIsEmpty || isRecording;
    this.retryPolishButton.disabled = rawIsEmpty || isRecording;

    this.updateTopCopyButtonVisibility();

    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.copyPolishedButton.disabled = polishedIsEmpty;
    this.exportPolishedTxtButton.disabled = polishedIsEmpty;
    this.exportPolishedMdButton.disabled = polishedIsEmpty;
    
    this.copyRawButton.disabled = rawIsEmpty;
    this.exportRawTxtButton.disabled = rawIsEmpty;
    this.exportRawMdButton.disabled = rawIsEmpty;
    
    this.currentNotePolishModeSelect.disabled = this.isRawTranscriptionEmpty() && this.isPolishedNoteEmpty();
  }

  private isRawTranscriptionEmpty(): boolean {
    if (this.rawTranscription.classList.contains('placeholder-active')) {
      return true;
    }
    const liveText = this.getPlainText(this.rawTranscription.innerHTML);
    return liveText.trim() === "";
  }

  private isPolishedNoteEmpty(): boolean {
    if (!this.currentNote) return true;
    return this.polishedNote.classList.contains('placeholder-active') || 
           this.getPlainText(this.currentNote.polishedHTML).trim() === "";
  }
  
  private updateTopCopyButtonVisibility(): void {
    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.topCopyPolishedButton.style.display = polishedIsEmpty ? 'none' : 'flex';
    this.topCopyPolishedButton.disabled = polishedIsEmpty;
  }


  private drawLiveWaveform(): void {
    if (!this.liveWaveformContext || !this.analyserNode || !this.waveformDataArray || !this.liveWaveformCanvas) {
      return;
    }
    this.waveformAnimationId = requestAnimationFrame(() => this.drawLiveWaveform());
    this.analyserNode.getByteTimeDomainData(this.waveformDataArray);

    this.liveWaveformContext.fillStyle = getComputedStyle(document.body).getPropertyValue('--glass-recording-bg').trim();
    this.liveWaveformContext.fillRect(0, 0, this.liveWaveformCanvas.width, this.liveWaveformCanvas.height);
    
    this.liveWaveformContext.lineWidth = 2;
    this.liveWaveformContext.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-accent').trim();
    this.liveWaveformContext.beginPath();

    const sliceWidth = this.liveWaveformCanvas.width * 1.0 / this.analyserNode.frequencyBinCount;
    let x = 0;

    for (let i = 0; i < this.analyserNode.frequencyBinCount; i++) {
      const v = this.waveformDataArray[i] / 128.0; 
      const y = v * this.liveWaveformCanvas.height / 2;

      if (i === 0) {
        this.liveWaveformContext.moveTo(x, y);
      } else {
        this.liveWaveformContext.lineTo(x, y);
      }
      x += sliceWidth;
    }
    this.liveWaveformContext.lineTo(this.liveWaveformCanvas.width, this.liveWaveformCanvas.height / 2);
    this.liveWaveformContext.stroke();
  }

  private updateLiveTimer(): void {
    if (!this.liveRecordingStartTime) return;
    const elapsed = Date.now() - this.liveRecordingStartTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const milliseconds = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0'); 
    this.liveRecordingTimerDisplay.textContent = `${minutes}:${seconds}.${milliseconds}`;
  }

  private async processAudio(stream: MediaStream): Promise<void> {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0]?.type || "audio/webm" });
      const base64Audio = await this.blobToBase64(audioBlob);
      
      this.updateStatus("Audio grabado. Transcribiendo...", "active");
      const rawText = await this.getTranscription(base64Audio, audioBlob.type);

      if (!this.currentNote || this.isCurrentNoteEmpty()) {
          if(!this.currentNote) this.createNewNoteUIAction();

          if (this.currentNote && (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder) ) {
              const newTitle = await this.generateTitleForNote(rawText.substring(0, 500));
              this.currentNote.title = newTitle || `Grabación ${new Date().toLocaleTimeString()}`;
          }
      }
      
      if (this.currentNote) {
        this.currentNote.rawText = rawText;
        this.currentNote.polishedHTML = ""; 
        this.currentNote.polishedMarkdown = ""; 
        this.currentNote.lastModified = Date.now();
        this.saveCurrentNote(true);
        this.updateUIFromCurrentNote(); 
        
        this.updateStatus("Transcripción completada.", "success", 2000);
        
        const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]') as HTMLButtonElement;
        if (rawTabButton && typeof (window as any).setActiveTab === 'function') {
            (window as any).setActiveTab(rawTabButton);
        }
      }

    } catch (error: any) {
      console.error("Error al procesar audio:", error);
      this.updateStatus(`Error procesando audio: ${error.message}`, "error", 5000);
    } finally {
      stream.getTracks().forEach(track => track.stop()); 
      this.setControlsDisabledState(false, false); 
      this.updateAllButtonStates();
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("FileReader did not return a string."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async callNetlifyFunction(payload: any): Promise<any> {
    try {
      const response = await fetch(NETLIFY_FUNCTION_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
       console.error("Error llamando a la función Netlify:", error);
       this.updateStatus(`Error de comunicación: ${error.message}`, "error", 5000);
       throw error;
    }
  }

  private async getTranscription(base64Audio: string, audioMimeType: string): Promise<string> {
    this.updateStatus("Transcribiendo...", "active");
    try {
      const response = await this.callNetlifyFunction({
        action: "transcribe",
        audioData: base64Audio,
        mimeType: audioMimeType,
      });
      
      if (!response.transcription || response.transcription.trim() === "") {
        this.updateStatus("No se pudo transcribir el audio o está vacío.", "active", 3000);
        return "";
      }
      this.updateStatus("Transcripción recibida.", "success", 1500);
      return response.transcription;
    } catch (error) {
      // El error ya se muestra en callNetlifyFunction
      throw error;
    }
  }
  
  private async generateTitleForNote(textSample: string): Promise<string> {
    if (!textSample || textSample.trim().length < 10) { 
        return `Nota ${new Date().toLocaleDateString()}`;
    }
    try {
      const response = await this.callNetlifyFunction({
        action: "generateTitle",
        text: textSample,
      });
      return response.title.trim().replace(/^"|"$/g, '') || `Nota ${new Date().toLocaleDateString()}`;
    } catch (error) {
      console.error("Error generando título vía Netlify function:", error);
      return `Nota ${new Date().toLocaleDateString()}`; // Fallback title
    }
  }

  private handleManualPolishWithCurrentSettings(): void {
    if (!this.currentNote || this.isRawTranscriptionEmpty()) {
        this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3000);
        return;
    }
    
    const selectedModeInHeader = this.currentNotePolishModeSelect.value as PolishMode;
    this.currentPolishMode = selectedModeInHeader;
    this.currentNote.polishModeUsed = selectedModeInHeader;

    if (selectedModeInHeader === "custom") {
        if (!this.currentNote.customPromptUsed && !this.customPromptTextarea.value.trim()) {
            this.updateStatus("Modo personalizado seleccionado. Por favor, define un prompt.", "active", 3000);
            this.polishModeSelect.value = "custom"; 
            this.customPromptTextarea.value = this.currentCustomPolishPrompt || ""; 
            this.handlePolishModeChangeInModal();
            this.togglePolishOptionsModal(true);
            return;
        }
        this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || this.customPromptTextarea.value.trim();
        this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
        this.currentCustomPolishPrompt = "";
        delete this.currentNote.customPromptUsed;
    }
    this.saveCurrentNote(false); 
    this.polishText(this.currentNote.rawText); 
  }

  private async polishText(rawTextHTML: string): Promise<void> { 
    if (!this.currentNote) return;
    const plainRawText = this.getPlainText(rawTextHTML);

    if (!plainRawText || plainRawText.trim() === "" || this.rawTranscription.classList.contains('placeholder-active')) {
      this.updateStatus("El borrador está vacío. Nada que pulir.", "active", 3000);
      return;
    }
    try {
      this.updateStatus("Puliendo...", "active"); 
      const polishedResult = await this.getPolishedNoteFromText(plainRawText, this.currentPolishMode, this.currentCustomPolishPrompt);
      
      if (
        (this.currentNote.title === "" || this.currentNote.title === this.editorTitlePlaceholder) &&
        plainRawText.trim().length >= 10
      ) {
        const newTitle = await this.generateTitleForNote(plainRawText.substring(0, 500));
        if (newTitle) {
          this.currentNote.title = newTitle;
        }
      }

      this.currentNote.polishedHTML = polishedResult.html;
      this.currentNote.polishedMarkdown = polishedResult.markdown;
      this.currentNote.polishModeUsed = this.currentPolishMode;
      if (this.currentPolishMode === "custom") {
          this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
      } else {
          delete this.currentNote.customPromptUsed;
      }
      this.currentNote.lastModified = Date.now();
      
      this.saveCurrentNote(true);
      this.updateUIFromCurrentNote();

      this.updateStatus("Nota pulida.", "success", 2000);

      const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]') as HTMLButtonElement;
      if (polishedTabButton && typeof (window as any).setActiveTab === 'function') {
        (window as any).setActiveTab(polishedTabButton);
      }

    } catch (error: any) {
      // El error ya se muestra en callNetlifyFunction o getPolishedNoteFromText
      console.error("Error al pulir texto:", error);
    }
  }

  private async getPolishedNoteFromText(text: string, mode: PolishMode, customPrompt?: string): Promise<{html: string, markdown: string}> {
    try {
        const response = await this.callNetlifyFunction({
            action: "polish",
            text: text,
            polishMode: mode,
            customPolishPrompt: customPrompt
        });

        if (!response.polishedMarkdown || response.polishedMarkdown.trim() === "") {
            return { html: "<p>Gemini no generó contenido pulido.</p>", markdown: "" };
        }
        const html = this.markdownParser.parse(response.polishedMarkdown) as string;
        return { html, markdown: response.polishedMarkdown };

    } catch (error: any) {
        // El error ya se muestra en callNetlifyFunction
        throw new Error(`Error obteniendo nota pulida: ${error.message || 'Desconocido'}`);
    }
  }

  private updateStatus(message: string, type: "success" | "error" | "active" = "active", duration: number = 3000): void {
    this.recordingStatus.textContent = message;
    this.recordingStatus.className = `status-text visible status-${type}`;

    if (this.statusClearTimeout) clearTimeout(this.statusClearTimeout);

    if (type === "success" || type === "error") {
      this.statusClearTimeout = window.setTimeout(() => {
        this.recordingStatus.className = "status-text"; 
      }, duration);
    } else if (type === "active") {
        if (duration !== Infinity && duration > 0) {
             this.statusClearTimeout = window.setTimeout(() => {
                this.recordingStatus.className = "status-text"; 
            }, duration);
        }
    }
  }

  private updateWordCharCount(type: 'polished' | 'raw'): void {
    const element = type === 'polished' ? this.polishedNote : this.rawTranscription;
    const counterElement = type === 'polished' ? this.polishedCounters : this.rawCounters;

    if (!element || !counterElement) return;

    const text = this.getPlainText(element.innerHTML);
    const isEmptyOrPlaceholder = element.classList.contains('placeholder-active') || !text.trim();

    if (isEmptyOrPlaceholder) {
        counterElement.textContent = "";
        return;
    }

    const words = text.match(/\b\w+\b/g)?.length || 0;
    const chars = text.length;
    counterElement.textContent = `${words} palabra${words !== 1 ? 's' : ''}, ${chars} caracter${chars !== 1 ? 'es' : ''}`;
  }
  
  private updateAllWordCharCounts(): void {
    this.updateWordCharCount('polished');
    this.updateWordCharCount('raw');
  }

}

new App();