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

// ======================= التوكن والمتغيرات =======================
const TOKEN = "MTQwNDQ3MTM2OTU2Mjg1MzUxOQ.GaE4TA.nYIXQFviwpAryZFZKmbDNPVunPGFlbiM4BTErQ";
const CLIENT_ID = "1404471369562853519";
const GUILD_ID = "1331578573970083890";
const ADMIN_ROLE = "1404633618625859796";

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
    tools = {
        "NitroGen": { download: "https://example.com/aura" },
    };
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
                    .setEmoji("<a:redeem:1416212509316087939>")
                    .setValue("redeem"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Check")
                    .setDescription("Check your key status")
                    .setEmoji("<a:check:1416212798286987344>")
                    .setValue("check"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Download")
                    .setDescription("Download the resource")
                    .setEmoji("<a:download:1416213098313814046>")
                    .setValue("download"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Reset Panel")
                    .setDescription("Refresh the menu")
                    .setEmoji("<a:reset:1409957787730968736>")
                    .setValue("reset")
            )
    );
}

// ======================= تعامل مع أوامر السلاش =======================
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "panel") {
        const embed = new EmbedBuilder()
            .setTitle("🔑 Redeem Your Key")
            .setDescription("Select an option from the menu below to redeem, check, or download your tool.")
            .setColor("Red")
            .setImage("https://cdn.discordapp.com/attachments/1336424425179971690/1416214583953326160/2394538cb416ae8e.jpg?ex=68c6081c&is=68c4b69c&hm=50cb5b5104067dd8fedc232e7f8d98e37ef711b3d4b95e7da87573cdb4a4a330");

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
});

// ======================= تعامل مع القائمة =======================
client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    const choice = interaction.values[0];
    if (interaction.customId !== "main_menu") return;

    if (choice === "redeem") {
        const modal = new ModalBuilder()
            .setCustomId("redeem_modal")
            .setTitle("Redeem Your Key");

        const toolInput = new TextInputBuilder()
            .setCustomId("tool_name")
            .setLabel("Tool Name")
            .setPlaceholder("e.g. Ahmed")
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
            .setImage("https://cdn.discordapp.com/attachments/1336424425179971690/1416214583953326160/2394538cb416ae8e.jpg?ex=68c6081c&is=68c4b69c&hm=50cb5b5104067dd8fedc232e7f8d98e37ef711b3d4b95e7da87573cdb4a4a330");

        await interaction.update({ embeds: [embed], components: [getMainMenu()] });
    }
});

// ======================= تعامل مع Redeem Modal =======================
client.on("interactionCreate", async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "redeem_modal") return;

    const toolName = interaction.fields.getTextInputValue("tool_name");
    const licenseKey = interaction.fields.getTextInputValue("license_key");

    if (!tools[toolName]) return interaction.reply({ content: "❌ Tool not found.", ephemeral: true });

    if (!licenses[interaction.user.id]) licenses[interaction.user.id] = {};
    licenses[interaction.user.id][toolName] = licenseKey;
    saveLicenses();

    await interaction.reply({ 
        content: `✅ License redeemed for **${toolName}**!\nKey: **${licenseKey}**`, 
        ephemeral: true 
    });
});

// ======================= API للتحقق من الرخص =======================
const app = express();
app.use(express.json());

app.post("/verify", (req, res) => {
    const { discordId, tool, license } = req.body;
    if (licenses[discordId] && licenses[discordId][tool] === license) {
        return res.json({ valid: true });
    }
    return res.json({ valid: false });
});

app.listen(3000, () => console.log("🌐 License API running on port 3000"));

client.login(TOKEN);
