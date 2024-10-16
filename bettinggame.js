class BettingGame {
    constructor(userBalance) {
        this.userBalance = userBalance;
    }

    // The function to place a bet with 50/50 chance of winning or losing
    bet(amount) {
        if (amount > this.userBalance) {
            return { success: false, message: 'You do not have enough Blerpcoins to make this bet.' };
        }

        // 50/50 chance
        const win = Math.random() >= 0.5;
        const newBalance = win ? this.userBalance + amount : this.userBalance - amount;

        const message = win 
            ? `Congratulations! You won the bet and gained ${amount} Blerpcoins! Your new balance is ${newBalance}.` 
            : `Sorry, you lost the bet and lost ${amount} Blerpcoins. Your new balance is ${newBalance}.`;

        return { success: true, newBalance, message };
    }
}

// Factory function to create a new betting game
const BettingGameFactory = {
    create(userBalance) {
        return new BettingGame(userBalance);
    }
};

module.exports = BettingGameFactory;
