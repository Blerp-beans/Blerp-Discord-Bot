const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType, ActivityType } = require('discord.js');
const dotenv = require('dotenv');
const { getServerData, saveServerData } = require('./database');
const BettingGameFactory = require('./bettingGame');
const BlackjackGameFactory = require('./blackjackGame');

dotenv.config();

// Initialize Discord client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Set bot status (presence) once ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: 'with your beans', type: ActivityType.Playing }],
        status: 'idle'
    });
});

// Slash commands array
const commands = [
    { name: 'ping', description: 'Replies with Pong!' },
    { 
        name: 'boop', 
        description: 'Boops the specified user!', 
        options: [{ 
            name: 'user', 
            description: 'The user to boop', 
            type: ApplicationCommandOptionType.User, 
            required: true 
        }] 
    },
    { name: 'avatar', description: 'Shows your avatar' },
    { name: 'serverinfo', description: 'Displays server information' },
    { name: 'balance', description: 'Check your balance.' },
    { name: 'earn', description: 'Earn some Blerpcoins.' },
    { 
        name: 'bet', 
        description: 'Place a bet on 50/50 odds.', 
        options: [{ 
            name: 'amount', 
            description: 'Amount of Blerpcoins to bet', 
            type: ApplicationCommandOptionType.Integer, 
            required: true 
        }] 
    },
    { name: 'blackjack', description: 'Play a game of Blackjack.' },
    { 
        name: 'custommessage', 
        description: 'Send a custom message as the bot (restricted to owner)', 
        options: [{ 
            name: 'message', 
            description: 'The message to send', 
            type: ApplicationCommandOptionType.String, 
            required: true 
        }]
    }
];

// Registering slash commands globally
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Handling interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const serverId = interaction.guild.id;
    const serverData = getServerData(serverId);

    if (!serverData.users) serverData.users = {};
    if (!serverData.users[interaction.user.id]) {
        serverData.users[interaction.user.id] = { balance: 1000, lastEarnTime: 0 }; // Starting balance
    }

    try {
        if (commandName === 'ping') {
            await interaction.reply({ content: 'Pong!', ephemeral: false });
        } else if (commandName === 'boop') {
            const userToBoop = interaction.options.getUser('user');
            await interaction.reply({ content: `${userToBoop} has been booped! <a:Tumblr_l_242782846477173:1302434497987481692>`, ephemeral: false });
        } else if (commandName === 'balance') {
            const balance = serverData.users[interaction.user.id].balance;
            await interaction.reply({ content: `${interaction.user.username}, you have ${balance} Blerpcoins.`, ephemeral: false });
        } 
        // Handle custom message command
        else if (commandName === 'custommessage') {
            // Check if the user is the owner by comparing IDs from the .env file
            if (interaction.user.id !== process.env.OWNER_ID) {
                return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
        
            const message = interaction.options.getString('message');
            // Send the custom message directly in the channel (hidden from other users)
            await interaction.channel.send({
                content: message,
                ephemeral: true,  // This makes it visible only to the user who invoked it
            });
        }
        // Handle betting game
        else if (commandName === 'bet') {
            await interaction.deferReply({ ephemeral: false }); // Defer reply for longer processes

            const amount = interaction.options.getInteger('amount');
            const userBalance = serverData.users[interaction.user.id].balance;

            const bettingGame = BettingGameFactory.create(userBalance);
            const result = bettingGame.bet(amount);

            if (!result.success) {
                return interaction.editReply({ content: result.message, ephemeral: true });
            }

            serverData.users[interaction.user.id].balance = result.newBalance;
            saveServerData(serverId, serverData);

            await interaction.editReply({ content: result.message, ephemeral: false });
        } 
        // Handle blackjack game
        else if (commandName === 'blackjack') {
            await interaction.deferReply({ ephemeral: false }); // Defer reply for longer game

            const blackjackGame = BlackjackGameFactory.create(serverData.users[interaction.user.id].balance);

            const initialGameState = blackjackGame.startGame();
            let message = `Your cards: ${initialGameState.userHand.map(c => `${c.value}${c.suit}`).join(', ')} (Total: ${initialGameState.userTotal})\n`;
            message += `Bot's visible card: ${initialGameState.botHand.map(c => `${c.value}${c.suit}`).join(', ')}\n`;
            message += 'Type `hit` to draw another card, or `stand` to hold your hand.';

            await interaction.editReply({ content: message, ephemeral: false });

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
                        return interaction.followUp({ content: finalResult.message, ephemeral: false });
                    }

                    await interaction.followUp({ content: `Your new cards: ${blackjackGame.userHand.map(c => `${c.value}${c.suit}`).join(', ')} (Total: ${userTotal})\nType \`hit\` or \`stand\`.`, ephemeral: true });
                } else if (message.content.toLowerCase() === 'stand') {
                    collector.stop();
                    const finalResult = blackjackGame.checkWinner();
                    await interaction.followUp({ content: finalResult.message, ephemeral: false });
                }
            });

            collector.on('end', async collected => {
                if (!collected.size) {
                    await interaction.followUp({ content: 'You did not respond in time! The Blackjack game has ended.', ephemeral: true });
                }
            });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

// Login the bot
client.login(process.env.TOKEN);
