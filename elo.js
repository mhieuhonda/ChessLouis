// ChessLouis — Tính điểm Elo sau mỗi ván
const K_FACTOR = 32;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// result tính theo player1: 1 = thắng, 0.5 = hòa, 0 = thua
// Trả về { player1New, player2New, player1Delta, player2Delta }
export function calculateElo(player1Elo, player2Elo, result) {
  const exp1 = expectedScore(player1Elo, player2Elo);
  const exp2 = 1 - exp1;

  const score1 = result;
  const score2 = 1 - result;

  const delta1 = Math.round(K_FACTOR * (score1 - exp1));
  const delta2 = Math.round(K_FACTOR * (score2 - exp2));

  return {
    player1New: Math.max(0, player1Elo + delta1),
    player2New: Math.max(0, player2Elo + delta2),
    player1Delta: delta1,
    player2Delta: delta2
  };
}
