# Maia2 Model Server Documentation

A locally-served neural network chess model that predicts **human-like** moves at configurable ELO levels.

---

## Overview

The Maia2 model runs as a Flask server in the `backend/` directory. Unlike traditional engines (Stockfish), Maia2 doesn't search — it predicts what a human of a given rating would play, along with win probabilities.

**Server:** `backend/model_server.py`
**Model weights:** `backend/maia2_models/rapid_model.pt`

---

## API Endpoint

### `POST /predict`

**URL:** `http://localhost:5000/predict`

### Request Parameters

| Parameter  | Type   | Required | Default | Description                                   |
| :--------- | :----- | :------- | :------ | :-------------------------------------------- |
| `fen`      | String | Yes      | —       | The FEN string of the position to analyze.     |
| `elo_self` | Number | No       | 1500    | ELO rating of the player to move.              |
| `elo_oppo` | Number | No       | 1500    | ELO rating of the opponent.                    |

### Response Schema

| Field             | Type                    | Description                                                     |
| :---------------- | :---------------------- | :-------------------------------------------------------------- |
| `best_move`       | String                  | Best move in UCI notation (e.g., `e2e4`, `g1f3`).               |
| `win_probability` | Number (0–1)            | Predicted win probability from the current player's perspective. |
| `moves`           | Object (string→number)  | All legal moves mapped to their predicted probabilities.         |
| `error`           | String (on failure)     | Error message (returned with HTTP 400).                          |

### Example Request

```javascript
const response = await fetch("http://localhost:5000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    elo_self: 1200,
    elo_oppo: 1200
  })
});
const data = await response.json();
// data.best_move  → "e2e4"
// data.win_probability → 0.52
// data.moves → { "e2e4": 0.18, "d2d4": 0.15, "g1f3": 0.09, ... }
```

---

## Key Differences from Traditional Engines

| Aspect            | Stockfish (chess-api.com)              | Maia2 (local)                                  |
| :---------------- | :------------------------------------- | :---------------------------------------------- |
| Move selection    | Optimal (best move by search depth)    | Human-like (predicted by neural network)         |
| Strength control  | `depth` parameter (1–20)               | `elo_self` / `elo_oppo` parameters (400–2000+)  |
| Output            | eval, bestMove, continuation, mate     | best_move, win_probability, move probabilities   |
| Win metric        | centipawn eval + win chance %          | win_probability (0–1 float)                      |
| Search            | Alpha-beta tree search                 | Single forward pass (no search)                  |
| Latency           | Variable (depends on depth)            | Fast (~100ms on CPU)                             |

---

## Running the Server

```bash
cd backend
source chesscoach/bin/activate   # activate venv
python model_server.py           # starts on port 5000
```

---

## Integration Notes

- **Move format:** Maia2 returns UCI notation (`e2e4`). Extract `from` as first 2 chars, `to` as chars 3–4. Promotion suffix (e.g., `e7e8q`) may appear as a 5th character.
- **Win probability:** Ranges 0–1 from the perspective of the player to move. Convert to percentage by multiplying by 100.
- **ELO-aware AI:** When using Maia2 as an opponent, set `elo_self` to the desired AI strength and `elo_oppo` to the player's estimated rating.
- **Move probabilities:** The `moves` dict contains all legal moves with predicted probabilities. Useful for showing move quality or implementing weighted random selection for more human-like play.
