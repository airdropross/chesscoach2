# model_server.py
from flask import Flask, request, jsonify
from maia2 import model, inference

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    return response

# Load model on startup (Use 'gpu' if you have CUDA, otherwise 'cpu')
print("Loading Maia2 model... this may take a minute.")
maia_model = model.from_pretrained(type="rapid", device="cpu")
prepared_data = inference.prepare()

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204

    data = request.json
    fen = data.get('fen')
    # Default to 1500 Elo if not provided
    elo_self = int(data.get('elo_self', 1500))
    elo_oppo = int(data.get('elo_oppo', 1500))

    try:
        # Run inference
        move_probs, win_prob = inference.inference_each(
            maia_model, prepared_data, fen, elo_self, elo_oppo
        )
        # Get the best move (highest probability)
        best_move = max(move_probs, key=move_probs.get)
        return jsonify({
            'best_move': best_move,
            'win_probability': float(win_prob),
            'moves': {k: float(v) for k, v in move_probs.items()}
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001)