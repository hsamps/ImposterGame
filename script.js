// --- Element References ---
const screens = document.querySelectorAll('.screen');
const card = document.getElementById('card');
const imposterRevealResult = document.getElementById('imposter-reveal-result');
const revealButton = document.querySelector('.reveal-btn');
const errorMessage = document.getElementById('error-message');
// NEW: Get a direct reference to the "Next Player" button
const nextPlayerBtn = document.getElementById('next-player-btn');


// --- Game State Variables ---
let players = [];
let assignedRoles = [];
let currentPlayerIndex = 0;
let wordData = [];


// --- Initialization ---
function initializeApp() {
    fetch('words.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            wordData = data;
            console.log(`${wordData.length} words loaded successfully.`);
            showScreen('setup-screen');
        })
        .catch(error => {
            console.error('Failed to load words.json:', error);
            showErrorMessage('CRITICAL ERROR: Could not load game words.');
        });
}


// --- Screen Navigation & Error Handling ---
function showScreen(screenId) {
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}
function hideErrorMessage() {
    errorMessage.classList.add('hidden');
}


// --- Setup Phase ---
function addPlayer() {
    const playerNameInput = document.getElementById('player-name-input');
    const playerList = document.getElementById('player-list');
    
    const playerName = playerNameInput.value.trim();
    if (playerName && !players.includes(playerName)) {
        players.push(playerName);
        const li = document.createElement('li');
        li.textContent = playerName;
        playerList.appendChild(li);
        playerNameInput.value = '';
    }
    playerNameInput.focus();
}
document.getElementById('player-name-input').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') addPlayer();
});


function startGame() {
    hideErrorMessage();
    if (players.length < 3) {
        showErrorMessage('A minimum of 3 players is required.');
        return; 
    }
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    if (players.length < imposterCount + 1) {
        showErrorMessage(`You need at least ${imposterCount + 1} players for ${imposterCount} imposter(s).`);
        return;
    }
    assignRolesAndStart();
    showScreen('reveal-screen');
}

// --- Role Assignment ---
function assignRolesAndStart() {
    const randomIndex = Math.floor(Math.random() * wordData.length);
    const { word, hint } = wordData[randomIndex];
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    const hintsEnabled = document.getElementById('hints-toggle').checked;
    
    const imposters = [...players].sort(() => Math.random() - 0.5).slice(0, imposterCount);

    assignedRoles = players.map(player => {
        if (imposters.includes(player)) {
            let imposterInfo = hintsEnabled 
                ? `Hint: ${hint}` 
                : 'Figure out the secret word!';
            
            if (imposters.length > 1) {
                const otherImposters = imposters.filter(name => name !== player);
                imposterInfo += `<br><br>Your partners: ${otherImposters.join(', ')}`;
            }
            
            return { name: player, role: 'Imposter', info: imposterInfo };
        } else {
            return { name: player, role: word, info: 'You are NOT the imposter' };
        }
    });

    currentPlayerIndex = 0;
    displayCurrentCard();
}


// --- Card Reveal Phase ---
// MODIFIED: This function contains the new "tap to toggle" logic.
function displayCurrentCard() {
    // Ensure the card is always face-down to start.
    card.classList.remove('is-flipped'); 
    
    // HIDE the "Next Player" button for every new player.
    nextPlayerBtn.style.display = 'none';

    // This variable tracks if the current player has actually looked at their role.
    let playerHasViewedCard = false;

    // Set the card content after a short delay to allow the flip-back animation to finish smoothly.
    setTimeout(() => {
        const currentPlayer = assignedRoles[currentPlayerIndex];
        document.getElementById('player-name-on-card').textContent = currentPlayer.name;
        document.getElementById('role-text').textContent = currentPlayer.role;
        document.getElementById('role-info').innerHTML = currentPlayer.info;
    }, 200);

    // REMOVED the old onpointerdown/onpointerup handlers.
    // ADDED a new, single onclick handler for the toggle logic.
    card.onclick = function() {
        // Toggle the flip animation.
        card.classList.toggle('is-flipped');

        // Check if the card is now face-up (meaning the player is viewing their role).
        if (card.classList.contains('is-flipped')) {
            playerHasViewedCard = true; // Mark that they have seen it.
        }

        // Check if the card is now face-down AND if the player has previously viewed it.
        if (!card.classList.contains('is-flipped') && playerHasViewedCard) {
            // If both are true, they have completed the cycle. Show the button.
            nextPlayerBtn.style.display = 'block';
        }
    };
}


function nextPlayer() {
    currentPlayerIndex++;
    if (currentPlayerIndex < assignedRoles.length) {
        displayCurrentCard();
    } else {
        // Since the card's onclick is specific to the reveal screen, we clear it here to prevent any potential issues.
        card.onclick = null;
        showScreen('end-screen');
    }
}


// --- End Game Phase & Reveal Logic ---
function revealImposter() {
    const imposters = assignedRoles.filter(player => player.role === 'Imposter');
    const imposterNames = imposters.map(imposter => imposter.name);

    let revealText = (imposterNames.length === 1) 
        ? `The imposter was: ${imposterNames[0]}` 
        : `The imposters were: ${imposterNames.join(', ')}`;

    imposterRevealResult.textContent = revealText;
    imposterRevealResult.classList.remove('hidden');
    revealButton.style.display = 'none';
}

function resetRevealUI() {
    imposterRevealResult.classList.add('hidden');
    revealButton.style.display = 'block';
}

function playAgain() {
    resetRevealUI();
    hideErrorMessage();
    assignRolesAndStart();
    showScreen('reveal-screen');
}

function editPlayers() {
    resetRevealUI();
    hideErrorMessage();
    showScreen('setup-screen');
}

function newGame() {
    resetRevealUI();
    hideErrorMessage();
    players = [];
    document.getElementById('player-list').innerHTML = '';
    showScreen('setup-screen');
}


// --- Initialize on first load ---
initializeApp();