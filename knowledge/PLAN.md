# Engineering Plan: "Checkmate Coach"

**Tech Stack:**

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + `shadcn/ui`
* **Chess Logic:** `chess.js` (Rules/Validation)
* **Chess UI:** `react-chessboard`
* **Engine API:** Local Maia2 model server (`backend/model_server.py`, port 5000)
* **Coach AI:** OpenAI API (via Next.js Server Actions/Route Handlers)

---

## Phase 1: The Foundation (Human vs. Human)

**Goal:** A clean, responsive "Pass and Play" chess interface with a working clock.

### 1.1 Project Setup

* Initialize Next.js project.
* Install dependencies

### 1.2 The Board Component

* Implement `<ChessBoard />` using `react-chessboard`.
* **Move Logic:**
* User drags a piece -> `chess.js` validates move.
* If valid, update board state.
* *No engine opponents yet.* Just White vs. Black on the same screen.



### 1.3 The Game Clock

* Create a `<PlayerInfo />` component that houses the timer.
* **Timer Logic:**
* State: `whiteTime` (600s), `blackTime` (600s).
* Effect: `setInterval` runs only for the `turn()` player.
* Switch turns automatically on move completion.


* **Deliverable:** A polished 2-player local board where friends can play a 10-minute game.

---

## Phase 2: The Data Layer (Maia2 Model Integration)

**Goal:** Connect to the local Maia2 model server to get human-like move predictions and win probabilities. Allow the user to play against Maia2 at a given ELO level, configurable from the start screen when coach mode is selected. In coach mode, we'll fetch the next move from the model, and subtract a random number between 0 and 30 seconds from the AI's clock.

### 2.1 API Service Layer

* Create a utility `lib/chess-api.ts`.
* Function: `fetchAnalysis(fen: string, options?: { eloSelf?, eloOppo? })`.
* **Integration:**
* Send the current FEN to the local Maia2 server (`POST http://localhost:5000/predict`).
* **Response Handling:** Parse the returned JSON to extract:
* `best_move` (Best move in UCI notation).
* `win_probability` (0–1 float).
* `moves` (All legal moves with predicted probabilities).





### 2.2 The Evaluation Bar

* Create an `<EvalBar />` component (visual bar on the left/right of the board).
* **Logic Flow:**
* `onMove` -> Trigger async call to `fetchAnalysis`.
* **Loading State:** While waiting for the model, show a subtle pulse or "calculating" spinner on the bar.
* **Update:** Animate the bar height based on the returned `win_probability` (0–1, converted to 0–100%).



### 2.3 Visual Hints (Debug Mode)

* *Optional:* Add a toggle to show the "Best Move" arrow based on the API response, just to verify the data is piping in correctly.

---

## Phase 3: The Watchdog (Intervention Logic)

**Goal:** Monitor the game and pause it when the user makes a mistake.

### 3.1 The Comparative Logic

* **The Challenge:** You need *two* data points to calculate a blunder:
1. The win probability of the position *before* you moved (The potential).
2. The win probability of the position *after* you moved (The reality).


* **The Flow:**
* User drags piece -> **Do not commit move to board yet** (or commit tentatively).
* Send *new* FEN (after move) to Maia2 model.
* Compare `Previous Win Probability` vs `New Win Probability`.
* **Math:** If win probability drop exceeds threshold -> **TRIGGER INTERVENTION**.



### 3.2 The Intervention UI

* Create a `<CoachModal />`.
* **State:** `isInterventionActive` (boolean).
* **Behavior:**
* If bad move detected:
* Freeze the timer.
* Darken the board.
* Show Modal: "Hold on, that's a mistake."
* Options: "Let me retry" (Undo move) or "Explain why" (Proceed to Phase 4).





---

## Phase 4: The Coach (LLM Integration)

**Goal:** Generate the text explanation for the mistake.

### 4.1 Server Action / API Route

* Create `app/api/explain/route.ts`.
* **Inputs:**
* `fen` (Board state).
* `userMove` (The bad move).
* `bestMove` (From Maia2 model).
* `moveProbs` (From Maia2 model - probabilities for all moves).


* **LLM Call:** Send prompt to OpenAI/Anthropic.

### 4.2 The "Chat" Interface

* Inside the `<CoachModal />`, add a text area.
* **UX:**
* User clicks "Explain why".
* Show skeleton loader.
* Stream the LLM response: *"Moving your knight there hangs your bishop. You should have pushed the pawn instead..."*



---

## Phase 5: The "What If" (Simulation UX)

**Goal:** Visualizing the alternative reality (The "Ghost Line").

### 5.1 Analysis State

* Create a new mode in your state store: `ANALYSIS_MODE`.
* When active, the board disconnects from the "Live Game" logic and becomes a playground.

### 5.2 The "Ghost" Replay

* Take the `best_move` from Maia2 and simulate from that position.
* **Implementation:**
* Use `chess.js` to execute the best move on a *temporary* instance, then query Maia2 for subsequent moves to build a continuation.
* **Auto-Play:** Automatically animate these moves on the board with a distinct color (e.g., Green arrows or slightly transparent pieces) to show the user what *should* have happened.


* **Exit:** User clicks "Got it", board reverts to the position *before* the blunder, and the timer resumes.