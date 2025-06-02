// Elements
const [ [ $form ] ] = [ 'form' ].map(tag => document.querySelectorAll(tag));
const [ [ ...$selects ], [ $submitButton ] ] = [ 'select', `input[type='submit']` ].map(tag => $form.querySelectorAll(tag));
const [ $pitchSelect, $modeSelect ] = [ 'pitch', 'mode' ].map(name => $selects.find(element => element.getAttribute('name') === name));
const [ $result ] = [ 'result' ].map(id => document.getElementById(id));

// Constants
const totalNotes = 7;
const pitches = Object.freeze({
    C: 'C',
    D_FLAT: 'D♭',
    D: 'D',
    E_FLAT: 'E♭',
    E: 'E',
    F: 'F',
    G_FLAT: 'G♭',
    G: 'G',
    A_FLAT: 'A♭',
    A: 'A',
    B_FLAT: 'B♭',
    B: 'B',
});
const pitchValues = Object.values(pitches);
const frequencies = Object.freeze((() => {
    let frequencies = {};
    frequencies[pitches.C] = 523.25;
    frequencies[pitches.D_FLAT] = 554.37;
    frequencies[pitches.D] = 587.33;
    frequencies[pitches.E_FLAT] = 622.25;
    frequencies[pitches.E] = 659.26;
    frequencies[pitches.F] = 698.46;
    frequencies[pitches.G_FLAT] = 739.99;
    frequencies[pitches.G] = 783.99;
    frequencies[pitches.A_FLAT] = 830.61;
    frequencies[pitches.A] = 880.00;
    frequencies[pitches.B_FLAT] = 932.33;
    frequencies[pitches.B] = 987.77;
    return frequencies;
})());
const modes = Object.freeze({
    MAJOR: 'Major',
    MINOR: 'Minor',
});
const firstNoteRanks = [ 0, 7, 4, 9, 2, 5, 11, 10, 3, 6, 1, 8 ];
const context = new AudioContext();

// Global Vars
/** @type {number | null} */
let previousNote = null;
let noteListeners = [];

// Main
function main() {
    [
        { $select: $pitchSelect, values: pitchValues },
        { $select: $modeSelect, values: Object.values(modes) }
    ].forEach(({ $select, values }) => populateSelect($select, values));
}

// Functions
/**
 * 
 * @param {HTMLSelectElement} $select
 * @param {string[]} values
 */
function populateSelect($select, values) {
    values.forEach(value => $select.appendChild((() => {
        const $option = document.createElement('option');
        $option.value = value;
        $option.innerHTML = value;
        return $option;
    })()));
}
/**
 * @returns {string[]}
 */
function updateRankedNotes() {
    noteListeners.forEach(noteListener => document.removeEventListener('keydown', noteListener));

    /** @type {string | undefined} */
    const selectedPitch = $pitchSelect.value;
    if (!selectedPitch) {
        console.error('Pitch not selected');
        return;
    }
    
    const keyOffset = pitchValues.findIndex(pitch => pitch === selectedPitch);
    while ($result.firstChild) $result.removeChild($result.lastChild);
    if (previousNote == null) {
        firstNoteRanks.forEach((firstNoteOffset, i) => $result.appendChild(createNoteButton((firstNoteOffset + keyOffset) % 12, i)));
    } else {
                const selectedMode = $modeSelect.value;
        const majorScale = [0, 2, 4, 5, 7, 9, 11];
        const minorScale = [0, 2, 3, 5, 7, 8, 10];
        const scaleOffsets = (selectedMode === modes.MAJOR ? majorScale : minorScale)
            .map(degree => (degree + keyOffset) % 12);

        /** @type {{offset: number, score: number}[]} */
        const noteScores = Array.from({ length: 12 }, (_, noteOffset) => {
            const interval = (noteOffset - previousNote + 12) % 12;
            const inScale = scaleOffsets.includes(noteOffset);
            const isStep = interval === 1 || interval === 11;
            const isSmallInterval = interval >= 2 && interval <= 5;
            const isLargeLeap = interval >= 6;

            let score = 0;
            if (inScale) score += 3;
            if (isStep) score += 2;
            if (isSmallInterval) score += 1;
            if (isLargeLeap) score -= 1;
            if (!inScale) score -= 3;

            return { offset: noteOffset, score };
        });

        noteScores
            .sort((a, b) => b.score - a.score)
            .forEach(({ offset }, i) => $result.appendChild(createNoteButton(offset, i)));

    }
}
function createNoteButton(note, index) {
    const pitch = pitchValues[note];
    const $note = document.createElement('button');
    $note.innerHTML = pitch;
    $note.setAttribute('data-pitch', pitch);

    // Assign keyboard hint (1–9, 0, -, =)
    const keyMap = ["1","2","3","4","5","6","7","8","9","0","-","="];
    const keyHint = keyMap[index];
    if (keyHint) {
        $note.setAttribute('data-key', keyHint);
    }

    const onclick = () => {
        previousNote = note;
        playPitch(pitch);
        updateRankedNotes();
    };

    $note.addEventListener('click', onclick);

    // Register keyboard shortcut if within first 12
    if (keyHint) {
        const noteListener = (event) => {
            if (event.key === keyHint) {
                onclick();
            }
        };
        document.addEventListener("keydown", noteListener);
        noteListeners.push(noteListener);
    }

    return $note;
}
/**
 * 
 * @param {string} pitch 
 */
function playPitch(pitch) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";           // waveform type: sine, square, sawtooth, triangle  
    oscillator.frequency.value = frequencies[pitch];   // frequency in Hz (A4)

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    gainNode.gain.setValueAtTime(1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1); // fade out
    oscillator.stop(context.currentTime + 1); // stop after 1 second
}

// Event Listeners
window.addEventListener('DOMContentLoaded', main);
$submitButton.addEventListener('click', (event) => {
    event.preventDefault();
    if ($pitchSelect.value && $modeSelect.value) {
        updateRankedNotes();
    }
});
