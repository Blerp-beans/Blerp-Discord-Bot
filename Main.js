const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
require('dotenv').config();

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Commands to register
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'boop',
        description: 'Boops the specified user!',
        options: [
            {
                name: 'user',
                description: 'The user to boop',
                type: ApplicationCommandOptionType.User, // Specify that this option is a user
                required: true, // Make this option required
            },
        ],
    },
    {
        name: 'avatar',
        description: 'Shows your avatar',
    },
    {
        name: 'serverinfo',
        description: 'Displays server information',
    }
];

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Register commands to a specific guild (server)
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'boop') {
        const userToBoop = interaction.options.getUser('user'); // Get the specified user
        if (userToBoop) { // Check if the userToBoop exists
            await interaction.reply(`${userToBoop} has been booped! 👊`);
        } else {
            await interaction.reply('You need to mention a user to boop!');
        }
    } else if (commandName === 'avatar') {
        await interaction.reply(`${interaction.user.username}'s avatar: ${interaction.user.displayAvatarURL({ dynamic: true })}`);
    } else if (commandName === 'serverinfo') {
        await interaction.reply(`Server Name: ${interaction.guild.name}\nTotal Members: ${interaction.guild.memberCount}`);
    }
});

// Log in the bot using the token
client.login(process.env.TOKEN);
