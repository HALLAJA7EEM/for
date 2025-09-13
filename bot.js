require('dotenv').config(); // قراءة المتغيرات من .env

const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    SlashCommandBuilder, 
    REST, 
    Routes 
} = require("discord.js");
const fs = require("fs");
const express = require("express");

// ======================= المتغيرات =======================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ADMIN_ROLE = process.env.ADMIN_ROLE;
const PORT = process.env.PORT || 3000;

// ======================= قاعدة بيانات الرخص =======================
let licenses = {};
if (fs.existsSync("licenses.json")) {
    licenses = JSON.parse(fs.readFileSync("licenses.json"));
}
function saveLicenses() {
    fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
}

// ======================= الأدوات =======================
let tools = {};
if (fs.existsSync("tools.json")) {
    tools = JSON.parse(fs.readFileSync("tools.json"));
} else {
    tools = { "NitroGen": { download: "https://example.com/aura" } };
    fs.writeFileSync("tools.json", JSON.stringify(tools, null, 2));
}
function saveTools() {
    fs.writeFileSync("tools.json", JSON.stringify(tools, null, 2));
}

// ======================= إعدادات البوت =======================
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ======================= أوامر السلاش =======================
const commands = [
    new SlashCommandBuilder()
        .setName("panel")
        .setDescription("Send main panel"),
    new SlashCommandBuilder()
        .setName("createlicense")
        .setDescription("Create a license for a user (Admin only)")
        .addUserOption(option =>
            option.setName("user").setDescription("Discord user").setRequired(true))
        .addStringOption(option =>
            option.setName("tool").setDescription("Tool name").setRequired(true)),
    new SlashCommandBuilder()
        .setName("revokelicense")
        .setDescription("Revoke license from a user (Admin only)")
        .addUserOption(option =>
            option.setName("user").setDescription("Discord user").setRequired(true))
        .addStringOption(option =>
            option.setName("tool").setDescription("Tool name").setRequired(true)),
    new SlashCommandBuilder()
        .setName("addtool")
        .setDescription("Add a new tool (Admin only)")
        .addStringOption(option =>
            option.setName("name").setDescription("Tool name").setRequired(true))
        .addStringOption(option =>
            option.setName("download").setDescription("Download link").setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
    try {
        console.log("⏳ Registering commands...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ Commands registered");
    } catch (error) {
        console.error(error);
    }
})();

// ======================= البانل التفاعلي =======================
function getMainMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("main_menu")
            .setPlaceholder("Select an option...")
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel("Redeem")
                    .setDescription("Redeem your key")
                    .setEmoji("🔑")
                    .setValue("redeem"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Check")
                    .setDescription("Check your key status")
                    .setEmoji("✅")
                    .setValue("check"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Download")
                    .setDescription("Download the resource")
                    .setEmoji("⬇️")
                    .setValue("download"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Reset Panel")
                    .setDescription("Refresh the menu")
                    .setEmoji("🔄")
                    .setValue("reset")
            )
    );
}

// ======================= تعامل مع أوامر السلاش =======================
client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === "panel") {
            const embed = new EmbedBuilder()
                .setTitle("🔑 Redeem Your Key")
                .setDescription("Select an option from the menu below to redeem, check, or download your tool.")
                .setColor("Red")
                .setImage("https://cdn.discordapp.com/attachments/1336424425179971690/1416214583953326160/2394538cb416ae8e.jpg");
            await interaction.reply({ embeds: [embed], components: [getMainMenu()] });
        }

        if (interaction.commandName === "createlicense") {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE)) 
                return interaction.reply({ content: "❌ You don't have permission.", ephemeral: true });

            const user = interaction.options.getUser("user");
            const tool = interaction.options.getString("tool");
            const licenseKey = Math.random().toString(36).substring(2, 10).toUpperCase();

            if (!licenses[user.id]) licenses[user.id] = {};
            licenses[user.id][tool] = licenseKey;
            saveLicenses();

            await interaction.reply(`✅ License created for <@${user.id}> | Tool: **${tool}**\nKey: \`${licenseKey}\``);
        }

        if (interaction.commandName === "revokelicense") {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE)) 
                return interaction.reply({ content: "❌ You don't have permission.", ephemeral: true });

            const user = interaction.options.getUser("user");
            const tool = interaction.options.getString("tool");

            if (licenses[user.id] && licenses[user.id][tool]) {
                delete licenses[user.id][tool];
                saveLicenses();
                await interaction.reply(`❌ License revoked from <@${user.id}> for tool: **${tool}**`);
            } else {
                await interaction.reply(`⚠️ No license found for this user on **${tool}**`);
            }
        }

        if (interaction.commandName === "addtool") {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE)) 
                return interaction.reply({ content: "❌ You don't have permission.", ephemeral: true });

            const name = interaction.options.getString("name");
            const download = interaction.options.getString("download");

            tools[name] = { download };
            saveTools();

            await interaction.reply(`✅ Tool **${name}** added successfully with download link: ${download}`);
        }
    }

    // ======================= تعامل مع القائمة =======================
    if (interaction.isStringSelectMenu()) {
        const choice = interaction.values[0];
        if (interaction.customId !== "main_menu") return;

        if (choice === "redeem") {
            const modal = new ModalBuilder()
                .setCustomId("redeem_modal")
                .setTitle("Redeem Your Key");

            const toolInput = new TextInputBuilder()
                .setCustomId("tool_name")
                .setLabel("Tool Name")
                .setPlaceholder("e.g. NitroGen")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const keyInput = new TextInputBuilder()
                .setCustomId("license_key")
                .setLabel("License Key")
                .setPlaceholder("Enter your license key")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(toolInput),
                new ActionRowBuilder().addComponents(keyInput)
            );

            await interaction.showModal(modal);
        }

        if (choice === "check") {
            const toolsOwned = licenses[interaction.user.id];
            if (!toolsOwned) return interaction.reply({ content: "❌ You don't have an active key currently.", ephemeral: true });

            let msg = "✅ Your active licenses:\n";
            for (const [tool, key] of Object.entries(toolsOwned)) msg += `• **${tool}** → \`${key}\`\n`;
            await interaction.reply({ content: msg, ephemeral: true });
        }

        if (choice === "download") {
            const toolsOwned = licenses[interaction.user.id];
            if (!toolsOwned) return interaction.reply({ content: "❌ You don't have an active key currently.", ephemeral: true });

            let msg = "⬇️ Your downloads:\n";
            for (const [tool, key] of Object.entries(toolsOwned)) {
                if (tools[tool]) msg += `• **${tool}** → ${tools[tool].download}\n`;
            }
            await interaction.reply({ content: msg, ephemeral: true });
        }

        if (choice === "reset") {
            const embed = new EmbedBuilder()
                .setTitle("🔑 Redeem Your Key")
                .setDescription("Select an option from the menu below to redeem, check, or download your tool.")
                .setColor("Yellow")
                .setImage("https://cdn.discordapp.com/attachments/1336424425179971690/1416214583953326160/2394538cb416ae8e.jpg");

            await interaction.update({ embeds: [embed], components: [getMainMenu()] });
        }
    }

    // ======================= تعامل مع Redeem Modal =======================
    if (interaction.isModalSubmit() && interaction.customId === "redeem_modal") {
        const toolName = interaction.fields.getTextInputValue("tool_name");
        const licenseKey = interaction.fields.getTextInputValue("license_key");

        if (!tools[toolName]) return interaction.reply({ content: "❌ Tool not found.", ephemeral: true });

        if (!licenses[interaction.user.id
