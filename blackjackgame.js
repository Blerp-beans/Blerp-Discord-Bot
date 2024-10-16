class BlackjackGame {
    constructor(userBalance) {
        this.userBalance = userBalance;
        this.deck = this.createDeck();
        this.userHand = [];
        this.botHand = [];
    }

    // Initialize a deck of cards
    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ value, suit });
            }
        }
        return deck;
    }

    // Draw a card from the deck
    drawCard() {
        const randomIndex = Math.floor(Math.random() * this.deck.length);
        return this.deck.splice(randomIndex, 1)[0];
    }

    // Calculate the total score of a hand
    calculateHandTotal(hand) {
        let total = 0;
        let aces = 0;

        for (const card of hand) {
            if (card.value === 'A') {
                total += 11;
                aces++;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                total += 10;
            } else {
                total += parseInt(card.value);
            }
        }

        // Adjust for aces if the total is over 21
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    // Start the blackjack game
    startGame() {
        this.userHand = [this.drawCard(), this.drawCard()];
        this.botHand = [this.drawCard(), this.drawCard()];

        return {
            userHand: this.userHand,
            botHand: [this.botHand[0]], // Only show one of the bot's cards
            userTotal: this.calculateHandTotal(this.userHand)
        };
    }

    // Determine the winner
    checkWinner() {
        const userTotal = this.calculateHandTotal(this.userHand);
        const botTotal = this.calculateHandTotal(this.botHand);

        if (userTotal > 21) {
            return { winner: 'bot', message: `You busted with a total of ${userTotal}. You lose!` };
        }

        // Bot logic to keep drawing cards until at least 17
        while (botTotal < 17) {
            this.botHand.push(this.drawCard());
        }

        const finalBotTotal = this.calculateHandTotal(this.botHand);
        if (finalBotTotal > 21 || userTotal > finalBotTotal) {
            return { winner: 'user', message: `You won! Bot's total: ${finalBotTotal}, your total: ${userTotal}.` };
        } else if (userTotal < finalBotTotal) {
            return { winner: 'bot', message: `You lose. Bot's total: ${finalBotTotal}, your total: ${userTotal}.` };
        } else {
            return { winner: 'tie', message: `It's a tie! Both you and the bot had a total of ${userTotal}.` };
        }
    }
}

// Factory function to create a new blackjack game
const BlackjackGameFactory = {
    create(userBalance) {
        return new BlackjackGame(userBalance);
    }
};

module.exports = BlackjackGameFactory;
