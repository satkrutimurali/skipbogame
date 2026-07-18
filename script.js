const baseCards = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;
  let colorClass = "blue";
  if (value >= 5 && value <= 8) colorClass = "green";
  else if (value >= 9) colorClass = "red";
  return { value, colorClass, label: value.toString(), isWild: false };
});

function createDeck() {
  const deck = [];
  for (let repeat = 0; repeat < 12; repeat += 1) {
    baseCards.forEach((card) => {
      deck.push({ ...card, id: `${card.value}-${repeat}-${Math.random().toString(36).slice(2, 8)}` });
    });
  }
  for (let i = 0; i < 18; i += 1) {
    deck.push({ value: 0, colorClass: "wild", label: "SB", isWild: true, id: `wild-${i}-${Math.random().toString(36).slice(2, 8)}` });
  }
  return deck;
}

const state = {
  drawPile: [],
  buildingPiles: [],
  players: [],
  selectedCard: null,
  selectedSource: null,
  turn: 1,
  currentPlayerIndex: 0,
  gameActive: false,
};

const drawPileVisual = document.getElementById("drawPileVisual");
const handArea = document.getElementById("handArea");
const buildingPilesContainer = document.getElementById("buildingPiles");
const playerTopEl = document.getElementById("playerTop");
const playerLeftEl = document.getElementById("playerLeft");
const playerBottomEl = document.getElementById("playerBottom");
const turnCountEl = document.getElementById("turnCount");
const drawPileCountEl = document.getElementById("drawPileCount");
const currentPlayerEl = document.getElementById("currentPlayer");
const messageBox = document.getElementById("messageBox");
const endTurnBtn = document.getElementById("endTurnBtn");
const newGameBtn = document.getElementById("newGameBtn");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createPlayer(name, isHuman = false) {
  return {
    name,
    isHuman,
    stockPile: [],
    hand: [],
    discardPiles: [[], [], [], []],
    revealedCard: null,
    lastPlays: [],
  };
}

function drawCards(player, amount) {
  for (let i = 0; i < amount; i += 1) {
    if (state.drawPile.length === 0) {
      state.drawPile = shuffle(createDeck());
    }
    if (state.drawPile.length > 0) {
      player.hand.push(state.drawPile.pop());
    }
  }
}

function revealTopCard(player) {
  player.revealedCard = player.stockPile.length > 0 ? player.stockPile[player.stockPile.length - 1] : null;
}

function startTurn(playerIndex) {
  const player = state.players[playerIndex];
  drawCards(player, 5);
  if (player.isHuman) {
    messageBox.textContent = `It's your turn, ${player.name}. Draw to 5 cards.`;
  } else {
    messageBox.textContent = `${player.name} is taking their turn.`;
  }
}

function setupPlayers() {
  state.players = [createPlayer("You", true), createPlayer("Player 2"), createPlayer("Player 3")];
  state.players.forEach((player) => {
    player.stockPile = [];
    for (let i = 0; i < 30; i += 1) {
      player.stockPile.push(state.drawPile.pop());
    }
    player.hand = [];
    player.discardPiles = [[], [], [], []];
    revealTopCard(player);
  });
}

function setupBuildingPiles() {
  state.buildingPiles = [
    { id: 1, cards: [], nextValue: 1 },
    { id: 2, cards: [], nextValue: 1 },
    { id: 3, cards: [], nextValue: 1 },
    { id: 4, cards: [], nextValue: 1 },
  ];
}

function startGame() {
  state.drawPile = shuffle(createDeck());
  setupBuildingPiles();
  setupPlayers();
  state.selectedCard = null;
  state.selectedSource = null;
  state.turn = 1;
  state.currentPlayerIndex = 0;
  state.gameActive = true;
  startTurn(0);
  render();
}

function canPlayCard(card, pile) {
  if (!card || !pile) return false;
  if (card.isWild) return true;
  return card.value === pile.nextValue;
}

function removeCard(player, card, source) {
  if (source.type === "hand") {
    const index = player.hand.findIndex((entry) => entry.id === card.id);
    if (index === -1) return false;
    player.hand.splice(index, 1);
    return true;
  }
  if (source.type === "stock") {
    const top = player.stockPile[player.stockPile.length - 1];
    if (!top || top.id !== card.id) return false;
    player.stockPile.pop();
    revealTopCard(player);
    return true;
  }
  if (source.type === "discard") {
    const stack = player.discardPiles[source.discardIndex];
    const top = stack[stack.length - 1];
    if (!top || top.id !== card.id) return false;
    stack.pop();
    return true;
  }
  return false;
}

function playCard(playerIndex, card, source, pileIndex) {
  const player = state.players[playerIndex];
  const pile = state.buildingPiles[pileIndex];
  if (!player || !pile || !state.gameActive || !canPlayCard(card, pile)) return false;
  if (!removeCard(player, card, source)) return false;

  pile.cards.push(card);
  player.lastPlays.unshift(`${card.label} → Pile ${pileIndex + 1}`);
  if (player.lastPlays.length > 3) player.lastPlays.pop();

  pile.nextValue += 1;
  if (pile.nextValue > 12) {
    pile.cards = [];
    pile.nextValue = 1;
  }

  if (card.isWild && pile.cards.length === 1) {
    pile.nextValue = 2;
  }

  state.selectedCard = null;
  state.selectedSource = null;
  messageBox.textContent = `${player.name} played ${card.label}.`;

  checkForWin(player);
  render();
  return true;
}

function discardCard(playerIndex, discardIndex) {
  const player = state.players[playerIndex];
  if (!player || !state.gameActive || player.hand.length === 0) return false;
  const card = player.hand.shift();
  player.discardPiles[discardIndex].push(card);
  state.selectedCard = null;
  state.selectedSource = null;
  messageBox.textContent = `${player.name} discarded ${card.label}.`;
  render();
  return true;
}

function checkForWin(player) {
  if (player.stockPile.length === 0) {
    state.gameActive = false;
    messageBox.textContent = `${player.name} wins by clearing their stock pile!`;
  }
}

function selectCard(card, source) {
  if (!state.gameActive) return;
  const isSame = state.selectedCard?.id === card.id && JSON.stringify(state.selectedSource) === JSON.stringify(source);
  state.selectedCard = isSame ? null : card;
  state.selectedSource = isSame ? null : source;
  render();
}

function autoPlayAi(playerIndex) {
  const player = state.players[playerIndex];
  let playedThisTurn = true;
  while (playedThisTurn && state.gameActive) {
    playedThisTurn = false;
    const candidateSources = [];
    if (player.stockPile.length > 0) candidateSources.push({ type: "stock", card: player.stockPile[player.stockPile.length - 1] });
    player.discardPiles.forEach((stack, stackIndex) => {
      const top = stack[stack.length - 1];
      if (top) candidateSources.push({ type: "discard", discardIndex: stackIndex, card: top });
    });
    player.hand.forEach((card) => candidateSources.push({ type: "hand", card }));

    for (const source of candidateSources) {
      for (let i = 0; i < state.buildingPiles.length; i += 1) {
        if (canPlayCard(source.card, state.buildingPiles[i])) {
          playCard(playerIndex, source.card, source, i);
          playedThisTurn = true;
          break;
        }
      }
      if (playedThisTurn) break;
    }
  }

  if (!state.gameActive) return;
  if (player.hand.length === 0) drawCards(player, 5);
  if (player.hand.length > 0) {
    let discardIndex = 0;
    for (let i = 1; i < 4; i += 1) {
      if (player.discardPiles[i].length < player.discardPiles[discardIndex].length) discardIndex = i;
    }
    discardCard(playerIndex, discardIndex);
  }
}

function nextTurn() {
  if (!state.gameActive) return;

  do {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.turn += 1;
    startTurn(state.currentPlayerIndex);

    if (!state.players[state.currentPlayerIndex].isHuman) {
      autoPlayAi(state.currentPlayerIndex);
    }
  } while (state.gameActive && !state.players[state.currentPlayerIndex].isHuman);

  render();
}

function render() {
  const humanPlayer = state.players[0];
  turnCountEl.textContent = state.turn;
  drawPileCountEl.textContent = state.drawPile.length;
  currentPlayerEl.textContent = state.players[state.currentPlayerIndex].name;
  drawPileVisual.textContent = state.drawPile.length > 0 ? "Draw" : "Empty";

  handArea.innerHTML = "";
  humanPlayer.hand.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = `card hand-card ${card.colorClass}`;
    btn.textContent = card.label;
    btn.addEventListener("click", () => selectCard(card, { type: "hand" }));
    if (state.selectedCard?.id === card.id && state.selectedSource?.type === "hand") btn.classList.add("selected");
    handArea.appendChild(btn);
  });

  buildingPilesContainer.innerHTML = "";
  state.buildingPiles.forEach((pile, index) => {
    const pileEl = document.createElement("div");
    pileEl.className = "building-pile";
    const title = document.createElement("div");
    title.className = "pile-label";
    title.textContent = `Pile ${index + 1} · next ${pile.nextValue}`;
    pileEl.appendChild(title);

    const stackEl = document.createElement("div");
    stackEl.className = "discard-stack";
    pile.cards.slice(-3).forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = `card stack-card ${card.colorClass}`;
      cardEl.textContent = card.label;
      stackEl.appendChild(cardEl);
    });
    pileEl.appendChild(stackEl);

    if (state.selectedCard && state.currentPlayerIndex === 0 && canPlayCard(state.selectedCard, pile)) {
      pileEl.classList.add("active");
      pileEl.addEventListener("click", () => {
        playCard(0, state.selectedCard, state.selectedSource, index);
      });
    }
    buildingPilesContainer.appendChild(pileEl);
  });

  const seatElements = [playerTopEl, playerLeftEl, playerBottomEl];
  seatElements.forEach((seat) => {
    seat.innerHTML = "";
  });

  state.players.forEach((player, index) => {
    const seatIndex = index;
    const seat = seatElements[seatIndex];
    const playerEl = document.createElement("div");
    playerEl.className = `player-card${index === state.currentPlayerIndex ? " highlight" : ""}`;
    const title = document.createElement("div");
    title.className = "player-name";
    title.textContent = `${player.name}${index === state.currentPlayerIndex ? " (turn)" : ""}`;
    playerEl.appendChild(title);

    const stock = document.createElement("div");
    stock.className = "player-stock";
    const preview = document.createElement("div");
    preview.className = `stock-preview${index === 0 && player.revealedCard ? " playable" : ""}`;
    preview.textContent = player.revealedCard ? player.revealedCard.label : "✓";
    if (index === 0 && player.revealedCard) {
      preview.addEventListener("click", () => selectCard(player.revealedCard, { type: "stock" }));
      if (state.selectedCard?.id === player.revealedCard.id && state.selectedSource?.type === "stock") preview.classList.add("selected");
    }
    stock.appendChild(preview);
    const details = document.createElement("div");
    details.textContent = `${player.stockPile.length} stock • ${player.hand.length} hand`;
    stock.appendChild(details);
    playerEl.appendChild(stock);

    const discardRow = document.createElement("div");
    discardRow.className = "discard-row";
    player.discardPiles.forEach((stack, discardIndex) => {
      const pill = document.createElement("div");
      pill.className = "discard-pill";
      const topCard = stack[stack.length - 1];
      pill.textContent = topCard ? topCard.label : "—";
      if (index === 0 && topCard) {
        pill.classList.add("playable");
        pill.addEventListener("click", () => selectCard(topCard, { type: "discard", discardIndex }));
        if (state.selectedCard?.id === topCard.id && state.selectedSource?.type === "discard" && state.selectedSource.discardIndex === discardIndex) {
          pill.classList.add("selected");
        }
      }
      if (index === 0 && state.selectedSource?.type === "hand") {
        pill.classList.add("playable");
        pill.addEventListener("click", () => {
          if (discardCard(0, discardIndex)) {
            nextTurn();
          }
        });
      }
      discardRow.appendChild(pill);
    });
    playerEl.appendChild(discardRow);

    const playHistory = document.createElement("div");
    playHistory.className = "play-history";
    playHistory.innerHTML = `<strong>Last plays:</strong><br>${player.lastPlays.length ? player.lastPlays.join("<br>") : "No plays yet."}`;
    playerEl.appendChild(playHistory);

    seat.appendChild(playerEl);
  });
}

newGameBtn.addEventListener("click", startGame);
endTurnBtn.addEventListener("click", () => {
  if (!state.gameActive) return;
  if (state.players[0].hand.length > 0) {
    discardCard(0, 0);
    nextTurn();
  }
});

startGame();
