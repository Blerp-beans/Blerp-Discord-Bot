const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const dotenv = require('dotenv');
const { getServerData, saveServerData } = require('./database');
const BettingGameFactory = require('./bettingGame');
const BlackjackGameFactory = require('./blackjackGame');

dotenv.config();

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const COOLDOWN_TIME = 3600 * 1000; // Cooldown time in milliseconds (1 hour)

const commands = [
    { name: 'ping', description: 'Replies with Pong!' },
    { name: 'boop', description: 'Boops the specified user!', options: [{ name: 'user', description: 'The user to boop', type: ApplicationCommandOptionType.User, required: true }] },
    { name: 'avatar', description: 'Shows your avatar' },
    { name: 'serverinfo', description: 'Displays server information' },
    { name: 'balance', description: 'Check your balance.' },
    { name: 'earn', description: 'Earn some Blerpcoins.' },
    { name: 'bet', description: 'Place a bet on 50/50 odds.', options: [{ name: 'amount', description: 'Amount of Blerpcoins to bet', type: ApplicationCommandOptionType.Integer, required: true }] },
    { name: 'blackjack', description: 'Play a game of Blackjack.' },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Register commands globally
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const serverId = interaction.guild.id;
    const serverData = getServerData(serverId);

    if (!serverData.users) serverData.users = {};
    if (!serverData.users[interaction.user.id]) {
        serverData.users[interaction.user.id] = { balance: 1000, lastEarnTime: 0 }; // Starting balance
    }

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'boop') {
        const userToBoop = interaction.options.getUser('user');
        await interaction.reply(`${userToBoop} has been booped! 👊`);
    } else if (commandName === 'balance') {
        const balance = serverData.users[interaction.user.id].balance;
        await interaction.reply(`${interaction.user.username}, you have ${balance} Blerpcoins.`);
    } 
    // Handle betting game
    else if (commandName === 'bet') {
        const amount = interaction.options.getInteger('amount');
        const userBalance = serverData.users[interaction.user.id].balance;

        const bettingGame = BettingGameFactory.create(userBalance);
        const result = bettingGame.bet(amount);

        if (!result.success) {
            return interaction.reply(result.message);
        }

        serverData.users[interaction.user.id].balance = result.newBalance;
        saveServerData(serverId, serverData);

        await interaction.reply(result.message);
    } 
    // Handle blackjack game
    else if (commandName === 'blackjack') {
        const blackjackGame = BlackjackGameFactory.create(serverData.users[interaction.user.id].balance);

        const initialGameState = blackjackGame.startGame();
        let message = `Your cards: ${initialGameState.userHand.map(c => `${c.value}${c.suit}`).join(', ')} (Total: ${initialGameState.userTotal})\n`;
        message += `Bot's visible card: ${initialGameState.botHand.map(c => `${c.value}${c.suit}`).join(', ')}\n`;
        message += 'Type `hit` to draw another card, or `stand` to hold your hand.';

        await interaction.reply(message);

        const filter = response => {
            return response.author.id === interaction.user.id && ['hit', 'stand'].includes(response.content.toLowerCase());
        };

        const collector = interaction.channel.createMessageCollector({ filter, time: 30000 });

        collector.on('collect', async message => {
            if (message.content.toLowerCase() === 'hit') {
                blackjackGame.userHand.push(blackjackGame.drawCard());
                const userTotal = blackjackGame.calculateHandTotal(blackjackGame.userHand);

                if (userTotal > 21) {
                    collector.stop();
                    const finalResult = blackjackGame.checkWinner();
                    return interaction.followUp(finalResult.message);
                }

                await interaction.followUp(`Your new cards: ${blackjackGame.userHand.map(c => `${c.value}${c.suit}`).join(', ')} (Total: ${userTotal})\nType \`hit\` or \`stand\`.`);
            } else if (message.content.toLowerCase() === 'stand') {
                collector.stop();
                const finalResult = blackjackGame.checkWinner();
                await interaction.followUp(finalResult.message);
            }
        });

        collector.on('end', collected => {
            if (!collected.size) {
                interaction.followUp('You did not respond in time! Game ended.');
            }
        });
    }
});

client.login(process.env.TOKEN);
