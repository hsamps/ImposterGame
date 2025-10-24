// --- Element References ---
const screens = document.querySelectorAll('.screen');
const card = document.getElementById('card');
const imposterRevealResult = document.getElementById('imposter-reveal-result');
const revealButton = document.querySelector('.reveal-btn');
const errorMessage = document.getElementById('error-message');
const nextPlayerBtn = document.getElementById('next-player-btn');
const dropdownBtn = document.getElementById('dropdown-btn-text');

// --- Game State Variables ---
let players = [];
let assignedRoles = [];
let currentPlayerIndex = 0;
const wordDecks = {};
let activeWordList = [];


// --- Initialization ---
function initializeApp() {
    const deckFiles = ['everyday_life.json', 'pop_culture.json', 'foodie_deck.json', 'words.json'];
    const fetchPromises = deckFiles.map(file =>
        fetch(file).then(res => {
            if (!res.ok) throw new Error(`Failed to load ${file}`);
            return res.json();
        })
    );
    Promise.all(fetchPromises)
        .then(decks => {
            decks.forEach((deck, index) => {
                const deckName = deckFiles[index];
                wordDecks[deckName] = deck;
            });
            console.log("All word decks loaded successfully.");
            showScreen('setup-screen');
        })
        .catch(error => {
            console.error("Critical Error: Could not load game files.", error);
            showErrorMessage('ERROR: Could not load game files. Please refresh the page.');
        });
    document.querySelectorAll('#topic-dropdown-content input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateDropdownText);
    });
}


// --- Screen Navigation & Error Handling ---
function showScreen(screenId) {
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}
function hideErrorMessage() {
    errorMessage.classList.add('hidden');
}


// --- Dropdown Menu Logic ---
function toggleDropdown() {
    document.getElementById("topic-dropdown-content").classList.toggle("show");
}
function updateDropdownText() {
    const selectedCheckboxes = document.querySelectorAll('.topic-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        dropdownBtn.textContent = "Select Topics";
    } else if (selectedCheckboxes.length === 1) {
        const label = document.querySelector(`label[for=${selectedCheckboxes[0].id}]`);
        dropdownBtn.textContent = label.textContent;
    } else {
        dropdownBtn.textContent = `${selectedCheckboxes.length} Topics Selected`;
    }
}
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
function toggleAllTopics(source) {
    const checkboxes = document.querySelectorAll('.topic-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = source.checked);
    updateDropdownText();
}


// --- Player Setup ---
// MODIFIED: This function now adds a list item that includes a remove button.
function addPlayer() {
    const playerNameInput = document.getElementById('player-name-input');
    const playerList = document.getElementById('player-list');
    const playerName = playerNameInput.value.trim();

    if (playerName && !players.includes(playerName)) {
        // 1. Add player to the internal data array
        players.push(playerName);

        // 2. Create the visual list item element
        const li = document.createElement('li');
        
        // Create a container for the name text
        const nameSpan = document.createElement('span');
        nameSpan.textContent = playerName;

        // Create the remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '−'; // A proper minus sign
        removeBtn.className = 'remove-player-btn';
        // Set the button's action. It calls removePlayer with its own name and list item.
        removeBtn.onclick = function() {
            removePlayer(playerName, li);
        };
        
        // Add the name and the button to the list item
        li.appendChild(nameSpan);
        li.appendChild(removeBtn);
        
        // Add the fully constructed list item to the on-screen list
        playerList.appendChild(li);
        
        // Reset the input field
        playerNameInput.value = '';
    }
    playerNameInput.focus();
}

// NEW: This function handles the logic for removing a player.
function removePlayer(nameToRemove, listItemElement) {
    // 1. Remove the player from the source of truth: the `players` array
    players = players.filter(player => player !== nameToRemove);

    // 2. Remove the visual element from the screen
    listItemElement.remove();

    console.log(`Removed ${nameToRemove}. Current players:`, players);
}

// Allow pressing 'Enter' to add a player (Unchanged)
document.getElementById('player-name-input').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        addPlayer();
    }
});


// --- Game Start Logic (Validation) ---
function startGame() {
    hideErrorMessage();
    activeWordList = [];
    const selectedCheckboxes = document.querySelectorAll('.topic-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showErrorMessage("Please select at least one topic to play.");
        return;
    }
    selectedCheckboxes.forEach(checkbox => {
        const deckName = checkbox.value;
        if (wordDecks[deckName]) {
            activeWordList.push(...wordDecks[deckName]);
        }
    });
    if (players.length < 3) {
        showErrorMessage('A minimum of 3 players is required.');
        return;
    }
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    if (players.length < imposterCount + 1) {
        showErrorMessage(`You need at least ${imposterCount + 1} players for ${imposterCount} imposter(s).`);
        return;
    }
    console.log(`Game starting with ${activeWordList.length} words available.`);
    assignRolesAndStart();
    showScreen('reveal-screen');
}


// --- Role Assignment ---
function assignRolesAndStart() {
    const randomIndex = Math.floor(Math.random() * activeWordList.length);
    const { word, hint } = activeWordList[randomIndex];
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    const hintsEnabled = document.getElementById('hints-toggle').checked;
    const imposters = [...players].sort(() => Math.random() - 0.5).slice(0, imposterCount);
    assignedRoles = players.map(player => {
        if (imposters.includes(player)) {
            let imposterInfo = hintsEnabled ? `Hint: ${hint}` : 'Figure out the secret word!';
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
function displayCurrentCard() {
    card.classList.remove('is-flipped');
    nextPlayerBtn.style.display = 'none';
    let playerHasViewedCard = false;
    setTimeout(() => {
        const currentPlayer = assignedRoles[currentPlayerIndex];
        document.getElementById('player-name-on-card').textContent = currentPlayer.name;
        document.getElementById('role-text').textContent = currentPlayer.role;
        document.getElementById('role-info').innerHTML = currentPlayer.info;
    }, 200);
    card.onclick = function() {
        card.classList.toggle('is-flipped');
        if (card.classList.contains('is-flipped')) {
            playerHasViewedCard = true;
        }
        if (!card.classList.contains('is-flipped') && playerHasViewedCard) {
            nextPlayerBtn.style.display = 'block';
        }
    };
}

function nextPlayer() {
    currentPlayerIndex++;
    if (currentPlayerIndex < assignedRoles.length) {
        displayCurrentCard();
    } else {
        card.onclick = null;
        showScreen('end-screen');
    }
}


// --- End Game Phase ---
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
    document.querySelectorAll('#topic-dropdown-content input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateDropdownText();
    showScreen('setup-screen');
}


// --- Start App ---
initializeApp();