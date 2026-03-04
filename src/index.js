require('dotenv').config();

const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
const { handleCommand } = require('./commands/handler');
const { chat } = require('./services/gemini');

// ─── Discord Client ───────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const CHAT_CHANNEL_ID = process.env.CHAT_CHANNEL_ID;

// ─── Bot Ready ────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
    console.log(`✅ AnyBot is online as ${c.user.tag}`);
    console.log(`📌 Listening in channel: ${CHAT_CHANNEL_ID}`);
    console.log(`🏠 Serving ${c.guilds.cache.size} server(s)`);

    // Set bot status
    client.user.setActivity('/play | /help ', { type: 0 });
});

// ─── Message Handler ──────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only respond in the designated channel
    if (message.channel.id !== CHAT_CHANNEL_ID) return;

    // Try to handle as a command first
    const wasCommand = await handleCommand(message);
    if (wasCommand) return;

    // Otherwise, treat as AI chat
    try {
        await message.channel.sendTyping();
        const response = await chat(message.author.id, message.content);
        await message.reply(response);
    } catch (error) {
        console.error('Chat error:', error);
        await message.reply('❌ เกิดข้อผิดพลาด ลองใหม่อีกทีนะครับ');
    }
});

// ─── Express Health Check (for Railway) ───────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.json({
        status: 'alive',
        bot: client.user?.tag || 'starting...',
        uptime: Math.floor(process.uptime()),
        guilds: client.guilds?.cache.size || 0,
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
});

// ─── Login ────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
