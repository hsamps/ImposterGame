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
    // Define the list of JSON deck files to load
    const deckFiles = ['everyday_life.json', 'pop_culture.json', 'foodie_deck.json', 'words.json'];
    
    // Create a promise for each file fetch
    const fetchPromises = deckFiles.map(file =>
        fetch(file).then(res => {
            if (!res.ok) throw new Error(`Failed to load ${file}`);
            return res.json();
        })
    );

    // Wait for all files to load before starting the app
    Promise.all(fetchPromises)
        .then(decks => {
            decks.forEach((deck, index) => {
                const deckName = deckFiles[index];
                wordDecks[deckName] = deck;
            });
            console.log("All word decks loaded successfully.");
            // Once loaded, show the main setup screen
            showScreen('setup-screen');
        })
        .catch(error => {
            console.error("Critical Error: Could not load game files.", error);
            showErrorMessage('ERROR: Could not load game files. Please refresh the page.');
        });
    
    // Add change listeners to all topic checkboxes to update the dropdown button text immediately
    document.querySelectorAll('#topic-dropdown-content input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateDropdownText);
    });
}


// --- Screen Navigation & Error Handling ---
function showScreen(screenId) {
    // Hide all screens first
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
    // Show the target screen
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

// Updates the text on the dropdown button based on what is selected
function updateDropdownText() {
    const selectedCheckboxes = document.querySelectorAll('.topic-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        dropdownBtn.textContent = "Select Topics";
    } else if (selectedCheckboxes.length === 1) {
        // If only one is selected, show its name
        const label = document.querySelector(`label[for=${selectedCheckboxes[0].id}]`);
        dropdownBtn.textContent = label.textContent;
    } else {
        // Otherwise show the count
        dropdownBtn.textContent = `${selectedCheckboxes.length} Topics Selected`;
    }
}

// Close the dropdown if the user taps anywhere outside of it
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

// "Select All" functionality
function toggleAllTopics(source) {
    const checkboxes = document.querySelectorAll('.topic-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = source.checked;
    });
    updateDropdownText();
}


// --- Player Setup ---
function addPlayer() {
    const playerNameInput = document.getElementById('player-name-input');
    const playerList = document.getElementById('player-list');
    
    const playerName = playerNameInput.value.trim();
    // Only add if name isn't empty and isn't already in the list
    if (playerName && !players.includes(playerName)) {
        players.push(playerName);
        const li = document.createElement('li');
        li.textContent = playerName;
        playerList.appendChild(li);
        playerNameInput.value = '';
    }
    // Keep focus on input for quick adding
    playerNameInput.focus();
}

// Allow pressing 'Enter' to add a player
document.getElementById('player-name-input').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        addPlayer();
    }
});


// --- Game Start Logic (Validation) ---
function startGame() {
    hideErrorMessage();
    activeWordList = []; // Clear any previous game's word list

    // 1. Validate Topic Selection
    const selectedCheckboxes = document.querySelectorAll('.topic-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showErrorMessage("Please select at least one topic to play.");
        return;
    }
    // Build the combined word list from selected decks
    selectedCheckboxes.forEach(checkbox => {
        const deckName = checkbox.value;
        if (wordDecks[deckName]) {
            activeWordList.push(...wordDecks[deckName]);
        }
    });

    // 2. Validate Player Count
    if (players.length < 3) {
        showErrorMessage('A minimum of 3 players is required.');
        return;
    }

    // 3. Validate Imposter Count
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    if (players.length < imposterCount + 1) {
        showErrorMessage(`You need at least ${imposterCount + 1} players for ${imposterCount} imposter(s).`);
        return;
    }

    // If all checks pass, proceed to role assignment
    console.log(`Game starting with ${activeWordList.length} words available.`);
    assignRolesAndStart();
    showScreen('reveal-screen');
}


// --- Role Assignment ---
function assignRolesAndStart() {
    // Pick a random word from the combined active list
    const randomIndex = Math.floor(Math.random() * activeWordList.length);
    const { word, hint } = activeWordList[randomIndex];
    
    const imposterCount = parseInt(document.getElementById('imposter-count-input').value, 10);
    const hintsEnabled = document.getElementById('hints-toggle').checked;
    
    // Randomly select who the imposters are
    const imposters = [...players].sort(() => Math.random() - 0.5).slice(0, imposterCount);

    // Map original player order to their new roles
    assignedRoles = players.map(player => {
        if (imposters.includes(player)) {
            // Build the imposter's info string
            let imposterInfo = hintsEnabled 
                ? `Hint: ${hint}` 
                : 'Figure out the secret word!';
            
            // If there are multiple imposters, tell them who their partners are
            if (imposters.length > 1) {
                const otherImposters = imposters.filter(name => name !== player);
                imposterInfo += `<br><br>Your partners: ${otherImposters.join(', ')}`;
            }
            
            return { name: player, role: 'Imposter', info: imposterInfo };
        } else {
            // Crewmates just get the word
            return { name: player, role: word, info: 'You are NOT the imposter' };
        }
    });

    currentPlayerIndex = 0;
    displayCurrentCard();
}


// --- Card Reveal Phase ---
function displayCurrentCard() {
    // Reset card state for the new player
    card.classList.remove('is-flipped'); 
    nextPlayerBtn.style.display = 'none';
    let playerHasViewedCard = false;

    // Delay text update slightly so it doesn't change while flipping back
    setTimeout(() => {
        const currentPlayer = assignedRoles[currentPlayerIndex];
        document.getElementById('player-name-on-card').textContent = currentPlayer.name;
        document.getElementById('role-text').textContent = currentPlayer.role;
        document.getElementById('role-info').innerHTML = currentPlayer.info;
    }, 200);

    // Tap-to-flip logic
    card.onclick = function() {
        card.classList.toggle('is-flipped');

        // Mark if they have successfully viewed the back of the card
        if (card.classList.contains('is-flipped')) {
            playerHasViewedCard = true;
        }

        // Only show the "Next" button if it's face-down AND they've already seen it
        if (!card.classList.contains('is-flipped') && playerHasViewedCard) {
            nextPlayerBtn.style.display = 'block';
        }
    };
}


function nextPlayer() {
    currentPlayerIndex++;
    // If there are more players, show the next card
    if (currentPlayerIndex < assignedRoles.length) {
        displayCurrentCard();
    } else {
        // Otherwise, the round is ready to start
        card.onclick = null; // Remove event listener just in case
        showScreen('end-screen');
    }
}


// --- End Game Phase ---
function revealImposter() {
    // Find all imposters and format their names into a string
    const imposters = assignedRoles.filter(player => player.role === 'Imposter');
    const imposterNames = imposters.map(imposter => imposter.name);

    let revealText = (imposterNames.length === 1) 
        ? `The imposter was: ${imposterNames[0]}` 
        : `The imposters were: ${imposterNames.join(', ')}`;

    // Show the result
    imposterRevealResult.textContent = revealText;
    imposterRevealResult.classList.remove('hidden');
    revealButton.style.display = 'none';
}

// Helper to reset the reveal screen for the next game
function resetRevealUI() {
    imposterRevealResult.classList.add('hidden');
    revealButton.style.display = 'block';
}

// Option 1: Play again with same settings/players
function playAgain() {
    resetRevealUI();
    hideErrorMessage();
    assignRolesAndStart();
    showScreen('reveal-screen');
}

// Option 2: Keep players but change settings/topics
function editPlayers() {
    resetRevealUI();
    hideErrorMessage();
    showScreen('setup-screen');
}

// Option 3: Full hard reset
function newGame() {
    resetRevealUI();
    hideErrorMessage();
    // Clear all player data
    players = [];
    document.getElementById('player-list').innerHTML = '';
    // Uncheck all topic boxes
    document.querySelectorAll('#topic-dropdown-content input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    // Reset dropdown text
    updateDropdownText();
    
    showScreen('setup-screen');
}


// --- Start App ---
initializeApp();