// --- Element References ---
const screens = document.querySelectorAll('.screen');
const card = document.getElementById('card');
const imposterRevealResult = document.getElementById('imposter-reveal-result');
const revealButton = document.querySelector('.reveal-btn');
const errorMessage = document.getElementById('error-message');


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
// MODIFIED to include partner names for imposters
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
            
            // NEW LOGIC: If there is more than one imposter, add the partners' names.
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
// MODIFIED to correctly render the partner list
function displayCurrentCard() {
    card.classList.remove('is-flipped'); 
    
    setTimeout(() => {
        const currentPlayer = assignedRoles[currentPlayerIndex];
        document.getElementById('player-name-on-card').textContent = currentPlayer.name;
        document.getElementById('role-text').textContent = currentPlayer.role;
        // IMPORTANT: Use .innerHTML to render the <br> tags for the partner list.
        document.getElementById('role-info').innerHTML = currentPlayer.info;
    }, 200);

    card.onpointerdown = () => card.classList.add('is-flipped');
    card.onpointerup = () => card.classList.remove('is-flipped');
    card.onpointerleave = () => card.classList.remove('is-flipped');
}


function nextPlayer() {
    currentPlayerIndex++;
    if (currentPlayerIndex < assignedRoles.length) {
        displayCurrentCard();
    } else {
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