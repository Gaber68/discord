// ------------------------
// IMPORTS
// ------------------------
const fs = require("fs");
const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Partials
} = require("discord.js");

const ms = require("ms");
const path = require("path");

//-------------------------
// LOAD/SAVE FUNCTION
//-------------------------
// Paths for JSON files
const logChannelsPath = path.resolve(__dirname, "logChannels.json");
const warningsPath = path.resolve(__dirname, "warnings.json");

// Safe load function
function safeLoadJSON(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`Error loading JSON from ${filePath}:`, err);
    return defaultValue;
  }
}

// Safe save function
function safeSaveJSON(filePath, data) {
  try {
    const tempFile = filePath + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`Error saving JSON to ${filePath}:`, err);
  }
}


// ------------------------
// GLOBAL VARIABLES
// ------------------------
const ROLE_WHITELIST = ["1187464674321633320", "1445466397319630981"];
let guildLogChannels = {};
let warnings = {};
let totalCommandsExecuted = 0;

// ------------------------
// LOAD DATA
// ------------------------
guildLogChannels = safeLoadJSON(logChannelsPath);
warnings = safeLoadJSON(warningsPath);

console.log("Log channels loaded:", guildLogChannels);


// ------------------------
// EXPRESS SETUP
// ------------------------
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ------------------------
// DISCORD CLIENT SETUP
// ------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages // ⬅️ NUJNO ZA DM
  ],
  partials: [
    Partials.Channel // ⬅️ NE string, ampak Partials.Channel
  ]
});


client.login(process.env.DISCORD_TOKEN);

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ------------------------
// HELPER FUNCTIONS
// ------------------------
function sendEmbed(channel, title, description, color = "#5865F2") {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  channel.send({ embeds: [embed] });
}

async function logAction(guild, title, description, color = "#5865F2") {
  try {
    const logChannelId = guildLogChannels[guild.id];
    if (!logChannelId) return;
    const channel = await guild.channels.fetch(logChannelId);
    if (!channel) return;
    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
    channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Napaka pri logiranju:", err);
  }
}

// ------------------------
// MESSAGE HANDLER
// ------------------------
client.on("messageCreate", async (message) => {
  if (!message.guild || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------------- COMMAND: log set ----------------
  if (command === "log" && args[0]?.toLowerCase() === "set") {
  const isOwner = message.author.id === message.guild.ownerId;
  const isWhitelisted = ROLE_WHITELIST.includes(message.author.id);

  if (!isOwner && !isWhitelisted)
    return sendEmbed(message.channel, "Dostop zavrnjen", "Samo owner ali whitelisted user lahko nastavi log kanal.", "#FF5555");

  const channel = message.mentions.channels.first();
  if (!channel) return sendEmbed(message.channel, "Napaka", "Označi kanal!", "#FF5555");

  guildLogChannels[message.guild.id] = channel.id;
  safeSaveJSON(logChannelsPath, guildLogChannels);

  return sendEmbed(message.channel, "✅ Log kanal nastavljen", `Vsi logi bodo sedaj poslani v kanal ${channel}`, "#57F287");
}

  // ---------------- COMMAND: ping ----------------
  if (command === "ping") {
    totalCommandsExecuted++;
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400), hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60), seconds = Math.floor(uptime % 60);
    const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    const totalUsers = message.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const embed = new EmbedBuilder()
      .setTitle("Bot Status")
      .setColor("#2F3136")
      .setDescription(`
Uptime:           \`${formattedUptime}\`
Strežniki:        \`${message.client.guilds.cache.size}\`
Uporabniki:       \`${totalUsers}\`
Ping:             \`${Math.round(message.client.ws.ping)}ms\`
Izvedene komande: \`${totalCommandsExecuted}\`
`)
      .setFooter({ text: "Gabers bot 2025" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
    await logAction(message.guild, "📊 Ping ukaz", `Uporabnik **${message.author.tag}** je izvedel ukaz \`!ping\`.`, "#2F3136");
    return;
  }

  // ---------------- COMMANDS: zdravo, kocka, zasmej ----------------
  if (command === "zdravo") return sendEmbed(message.channel, "Pozdrav", `Hej ${message.author.username}, kako si? 👋`);
  if (command === "kocka") return sendEmbed(message.channel, "Kocka", `Vrednost tvojega meta je **${Math.floor(Math.random() * 6) + 1}**! 🎲`);
  if (command === "zasmej") {
    try {
      const res = await fetch("https://icanhazdadjoke.com/", { headers: { Accept: "application/json" } });
      const data = await res.json();
      const joke = data.joke;
      await message.channel.send({ embeds: [new EmbedBuilder().setTitle("Čas za šalo 😂").setDescription(joke).setColor("#00D8FF").setFooter({ text: `Requested by ${message.author.tag}` }).setTimestamp()] });
      await logAction(message.guild, "😂 Zasmej ukaz", `User **${message.author.tag}** requested a joke:\n${joke}`, "#78E8FF");
    } catch { return sendEmbed(message.channel, "Napaka", "Ni uspelo pridobiti šale.", "#FF5555"); }
    return;
  }

  // ---------------- COMMANDS: hack ----------------
  if (command === "hack") {

  // ---------- hack stop ----------
  if (args[0] === "stop") {
    if (activeHacks.size === 0) {
      return sendEmbed(
        message.channel,
        "ℹ️ Hack stop",
        "Trenutno ni aktivnih hack spamov.",
        "#FAA61A"
      );
    }

    for (const [userId, data] of activeHacks.entries()) {
      clearInterval(data.interval);
      data.collector.stop();
    }

    activeHacks.clear();

    return sendEmbed(
      message.channel,
      "🛑 Hack ustavljen",
      "Vsi aktivni hack spam-i so bili ustavljeni.",
      "#57F287"
    );
  }

  // ---------- običajen hack ----------
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  let target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) || message.author;
  const isSelf = target.id === message.author.id;

  // Če je že aktiven → ustavi star hack
  if (activeHacks.has(target.id)) {
    const old = activeHacks.get(target.id);
    clearInterval(old.interval);
    old.collector.stop();
    activeHacks.delete(target.id);
  }

  const hackMessage = await message.channel.send({ embeds: [new EmbedBuilder().setTitle("💻 Hack").setDescription(`Inicializiram hack na **${target.tag}**...\n\nNapredek: **0%**`).setColor("#FFAA00")] });
  for (const [perc, desc] of [[10, "Inicializiram hack..."], [50, "Heckam sistem..."], [100, "Zaključujem operacijo..."]]) {
    await wait(1500);
    await hackMessage.edit({ embeds: [new EmbedBuilder().setTitle("💻 Hack").setDescription(`Inicializiram hack na **${target.tag}**...\n\nNapredek: **${perc}%**`).setColor("#FFAA00")] });
  }
  await wait(1000);
  await hackMessage.edit({ embeds: [new EmbedBuilder().setTitle("✅ Hack končan").setDescription(`Hack na **${target.tag}** je bil uspešen.\nPreveri DM.`).setColor("#57F287")] });

  await logAction(message.guild, "💻 Hack ukaz", isSelf ? `Uporabnik **${message.author.tag}** je hackal **samega sebe**.` : `Uporabnik **${message.author.tag}** je hackal **${target.tag}**.`, "#FFAA00");

  try {
    const dm = await target.createDM();

    const filter = m => m.author.id === target.id;
    const collector = dm.createMessageCollector({
      filter,
      time: 60000 // ⏱ 1 minuta max
    });

    const interval = setInterval(async () => {
      await dm.send({
        content: `💥 Bumbar si ${target}`,
        files: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Middle_finger_BNC.jpg/500px-Middle_finger_BNC.jpg"
        ]
      });
    }, 1000); // pošilja vsako sekundo

    // Shrani v globalni map
    activeHacks.set(target.id, { interval, collector });

    collector.on("collect", async (msg) => {
      clearInterval(interval);
      collector.stop();
      activeHacks.delete(target.id);

      if (msg.content.toLowerCase().includes("gaber je kul")) {
        await dm.send("😎 Sprejeto. Gaber je kul.");
      } else {
        await dm.send("😅 OK, ustavljam.");
      }
    });

    collector.on("end", () => {
      clearInterval(interval);
      activeHacks.delete(target.id);
    });

  } catch {
    message.channel.send(
      `❌ Ne morem poslati DM-ja uporabniku **${target.tag}** (zaprti DM-ji).`
    );
  }
}
    
  // ---------------- COMMAND: komande ----------------
  if (command === "komande") {
  const embed = new EmbedBuilder()
    .setTitle("🧭 Command Center")
    .setDescription(
      "Hiter pregled vseh razpoložljivih ukazov.\n" +
      "Uporabi navedene ukaze za podrobnejšo pomoč."
    )
    .addFields(
      {
        name: "🔹 Osnovno",
        value:
          "• `!ping` — preveri stanje bota\n" +
          "• `!zdravo` — pozdravi bota\n" +
          "• `!kocka` — met kocke (1–6)\n" +
          "• `!zasmej` — zabavni roast\n" +
          "• `!hack` — lažni hack (šala)",
      },
      {
        name: "🔹 Moderacija",
        value:
          "• `!warn help` — opozorila uporabnikom\n" +
          "• `!rename help` — upravljanje nickname-ov",
      },
      {
        name: "🔹 Role & Dovoljenja",
        value: "• `!role help` — upravljanje rol",
      },
      {
        name: "🔹 Kanali & Voice",
        value:
          "• `!channel help` — upravljanje kanalov\n" +
          "• `!voice help` — voice komande",
      },
      {
        name: "🔹 Administracija",
        value:
          "• `!admin` — admin ukazi\n" +
          "• `!log set` — nastavi log kanal",
      }
    )
    .setColor("#5865F2")
    .setTimestamp()

  return message.channel.send({ embeds: [embed] });
}

  if (command === "hack" && args[0] === "stop") {
  if (activeHacks.size === 0) {
    return sendEmbed(
      message.channel,
      "ℹ️ Hack stop",
      "Trenutno ni aktivnih hack spamov.",
      "#FAA61A"
    );
  }

  for (const [userId, data] of activeHacks.entries()) {
    clearInterval(data.interval);
    data.collector.stop();
  }

  activeHacks.clear();

  return sendEmbed(
    message.channel,
    "🛑 Hack ustavljen",
    "Vsi aktivni hack spam-i so bili ustavljeni.",
    "#57F287"
  );
}

  // --- zbriši koamnda --- LOGI DODANI
  else if (command === "zbrisi") {
    if (!message.guild) {
      return sendEmbed(
        message.channel,
        "Napaka",
        "To komando lahko uporabiš samo v strežniku.",
        "#FF5555",
      );
    }

    if (
      message.author.id !== message.guild.ownerId &&
      !ROLE_WHITELIST.includes(message.author.id)
    ) {
      return sendEmbed(
        message.channel,
        "Dostop zavrnjen",
        "To komando lahko uporabi samo **lastnik strežnika ali whitelisted user**.",
        "#FF5555",
      );
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ Potrditev brisanja vseh sporočil")
      .setDescription(
        "Ali si prepričan, da želiš **izbrisati vsa sporočila** v tem kanalu? To dejanje ne bo razveljavljeno!",
      )
      .setColor("#FF5555")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("delete_all_yes")
        .setLabel("Da")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("delete_all_no")
        .setLabel("Ne")
        .setStyle(ButtonStyle.Secondary),
    );

    // Pošlji potrditev
    const confirmMessage = await message.channel.send({
      embeds: [confirmEmbed],
      components: [row],
    });

    try {
      const interaction = await confirmMessage.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id,
        time: 20000, // 20 sekund
      });

      if (interaction.customId === "delete_all_yes") {
        await interaction.update({
          content: "Brisanje sporočil se začne...",
          embeds: [],
          components: [],
        });

        let deleted = 0;

        try {
          while (true) {
            const fetched = await message.channel.messages.fetch({
              limit: 100,
            });
            if (fetched.size === 0) break;

            const deletable = fetched.filter(
              (msg) =>
                Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000,
            );

            if (deletable.size === 0) break;

            await message.channel.bulkDelete(deletable, true);
            deleted += deletable.size;
          }

          await sendEmbed(
            message.channel,
            "✅ Opravljeno",
            `Izbrisanih **${deleted}** sporočil.`,
            "#57F287",
          );

          // Log v log kanal
          await logAction(
            message.guild,
            "🗑️ Zbrisana sporočila",
            `Uporabnik **${message.author.tag}** je izbrisal **${deleted}** sporočil v kanalu **#${message.channel.name}**.`,
            "#FF5555",
          );
        } catch (err) {
          console.error(err);
          await sendEmbed(
            message.channel,
            "❌ Napaka",
            "Prišlo je do napake pri brisanju sporočil.",
            "#FF5555",
          );
          await logAction(
            message.guild,
            "❌ Napaka pri brisanju sporočil",
            `Uporabnik **${message.author.tag}** je poskušal izbrisati sporočila v kanalu **#${message.channel.name}**, vendar je prišlo do napake: ${err.message}`,
            "#FF5555",
          );
        }
      } else {
        await interaction.update({
          content: "Brisanje preklicano.",
          embeds: [],
          components: [],
        });

        await logAction(
          message.guild,
          "⚠️ Brisanje preklicano",
          `Uporabnik **${message.author.tag}** je preklical brisanje sporočil v kanalu **#${message.channel.name}**.`,
          "#FF5555",
        );
      }
    } catch {
      // Timeout
      await confirmMessage.edit({
        content: "Brisanje preklicano (čas potečen).",
        embeds: [],
        components: [],
      });

      await logAction(
        message.guild,
        "⌛ Brisanje preklicano",
        `Uporabnik **${message.author.tag}** ni potrdil brisanja sporočil v kanalu **#${message.channel.name}** v roku 20 sekund.`,
        "#FF5555",
      );
    }
  }

  // --- kick/ban komanda --- LOGI DODANI
  else if (command === "kick" || command === "ban") {
    if (!message.guild) return;

    const isKick = command === "kick";
    const actionName = isKick ? "kick" : "ban";
    const actionPast = isKick ? "odstranjen" : "banned";

    if (
      message.author.id !== message.guild.ownerId &&
      !ROLE_WHITELIST.includes(message.author.id)
    )
      return sendEmbed(
        message.channel,
        "Dostop zavrnjen",
        "To komando lahko uporabi samo owner ali whitelisted user.",
        "#FF5555",
      );

    // Poseben primer "all"
    if (args[0]?.toLowerCase() === "all") {
      // Pošljemo embed z gumbi
      const confirmEmbed = {
        title: `Potrditev ${actionName.toUpperCase()} ALL`,
        description: `Si prepričan/a, da želiš ${actionName} vse uporabnike na strežniku (razen ownerja in bota)?`,
        color: 0xffaa00,
        timestamp: new Date(),
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_all")
          .setLabel("✅ Potrdi")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancel_all")
          .setLabel("❌ Prekliči")
          .setStyle(ButtonStyle.Danger),
      );

      const sentMsg = await message.channel.send({
        embeds: [confirmEmbed],
        components: [row],
      });

      const filter = (i) => i.user.id === message.author.id;
      const collector = sentMsg.createMessageComponentCollector({
        filter,
        time: 15000,
      });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === "confirm_all") {
          // Seznam uporabnikov za kick/ban
          const members = message.guild.members.cache.filter(
            (m) => !m.user.bot && m.id !== message.guild.ownerId,
          );
          let count = 0;

          for (const [, member] of members) {
            try {
              if (isKick)
                await member.kick(`Kick all by ${message.author.tag}`);
              else
                await member.ban({
                  reason: `Ban all by ${message.author.tag}`,
                });
              count++;
            } catch {
              continue;
            }
          }

          await sendEmbed(
            message.channel,
            `✅ ${actionName.toUpperCase()} ALL`,
            `Uspešno ${actionPast} **${count}** uporabnikov.`,
            "#57F287",
          );
          await logAction(
            message.guild,
            `${actionName.toUpperCase()} ALL`,
            `Ukaz : ${message.author.tag}\nŠtevilo ${actionPast}: ${count}`,
            "#57F287",
          );
        } else if (interaction.customId === "cancel_all") {
          await sendEmbed(
            message.channel,
            "❌ Preklicano",
            "Ukaz je bil preklican.",
            "#FF5555",
          );
          await logAction(
            message.guild,
            `${actionName.toUpperCase()} ALL PREKLIC`,
            `Ukaz : ${message.author.tag} je preklical ${actionName} ALL`,
            "#FF5555",
          );
        }

        collector.stop();
        sentMsg.edit({ components: [] }); // odstrani gumbe
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          await sendEmbed(
            message.channel,
            "⌛ Preklicano",
            "Ni bilo potrditve v 15 sekundah.",
            "#FF5555",
          );
        }
        sentMsg.edit({ components: [] });
      });

      return;
    }

    // --- običajen kick/ban za posameznika ---
    let memberId = message.mentions.members.first()?.id || args[0];
    if (!memberId)
      return sendEmbed(
        message.channel,
        "Napaka",
        "Moraš označiti uporabnika.",
        "#FF5555",
      );

    let member = await message.guild.members.fetch(memberId).catch(() => null);
    if (!member)
      return sendEmbed(
        message.channel,
        "Napaka",
        "Uporabnika ni mogoče najti.",
        "#FF5555",
      );

    if (member.id === message.guild.ownerId || member.user.bot)
      return sendEmbed(
        message.channel,
        "Napaka",
        "Ne moreš tega uporabnika kick/ban.",
        "#FF5555",
      );

    if (
      message.guild.members.me.roles.highest.position <=
      member.roles.highest.position
    )
      return sendEmbed(
        message.channel,
        "Napaka",
        "Ne moreš kick/ban uporabnika z višjo ali enako vlogo kot ima bot.",
        "#FF5555",
      );

    try {
      if (isKick) await member.kick(`Kick by ${message.author.tag}`);
      else await member.ban({ reason: `Ban by ${message.author.tag}` });

      const successMessage = `${member.user.tag} je bil ${actionPast}.`;
      await sendEmbed(
        message.channel,
        `✅ ${actionName} uspešen`,
        successMessage,
        "#57F287",
      );
      await logAction(
        message.guild,
        `${actionName.toUpperCase()} uspešen`,
        `${member.user.tag} je bil ${actionPast}.\nNaredil: ${message.author.tag}`,
        "#57F287",
      );
    } catch (err) {
      console.error(err);
      await sendEmbed(
        message.channel,
        "Napaka",
        `Prišlo je do napake pri ${actionName} uporabnika.`,
        "#FF5555",
      );
    }
  }

  // ---------------- Role ukazi z logiranjem ---------------- LOGI DODANI
  else if (command === "role") {
  if (!message.guild) return;

  const sub = args[0]?.toLowerCase();
  const botMember = message.guild.members.me;
  const ROLE_WHITELIST = []; // dodaj svoje ID-je

  const hasPermission =
    message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
    ROLE_WHITELIST.includes(message.author.id) ||
    message.author.id === message.guild.ownerId;

  const sendResult = async (success = true, text) => {
    const description = text && text.length > 0 ? text : " ";
    if (success) await sendEmbed(message.channel, "✅ Opravljeno", description, "#57F287");
    else await sendEmbed(message.channel, "❌ Napaka", description, "#FF5555");
  };

  const handleRoleAction = async (title, description, color = "#02B025") => {
    await logAction(message.guild, title, description, color);
    await sendResult();
  };

  const PERM_MAP = {
    KICK_MEMBERS: "KickMembers",
    BAN_MEMBERS: "BanMembers",
    TIMEOUT_MEMBERS: "TimeoutMembers",
    MANAGE_MESSAGES: "ManageMessages",
    MUTE_MEMBERS: "MuteMembers",
    DEAFEN_MEMBERS: "DeafenMembers",
    MANAGE_NICKNAMES: "ManageNicknames",
    MANAGE_ROLES: "ManageRoles",
    MANAGE_CHANNELS: "ManageChannels",
    MANAGE_GUILD: "ManageGuild",
    VIEW_AUDIT_LOG: "ViewAuditLog",
    SEND_MESSAGES: "SendMessages",
    READ_MESSAGE_HISTORY: "ReadMessageHistory",
    CONNECT: "Connect",
    SPEAK: "Speak",
    USE_VAD: "UseVad",
    PRIORITY_SPEAKER: "PrioritySpeaker",
    STREAM: "Stream",
    ATTACH_FILES: "AttachFiles",
    ADD_REACTIONS: "AddReactions",
    EMBED_LINKS: "EmbedLinks",
    MENTION_EVERYONE: "MentionEveryone",
    MANAGE_THREADS: "ManageThreads",
    CREATE_PUBLIC_THREADS: "CreatePublicThreads",
    CREATE_PRIVATE_THREADS: "CreatePrivateThreads",
    USE_EXTERNAL_EMOJIS: "UseExternalEmojis",
    USE_EXTERNAL_STICKERS: "UseExternalStickers",
    MANAGE_EVENTS: "ManageEvents",
    MODERATE_MEMBERS: "ModerateMembers",
  };

  try {
    switch (sub) {

      case "help": {
        const helpEmbed = new EmbedBuilder()
          .setTitle("📖 Role Komande")
          .setDescription("Seznam vseh podukazov za `!role`:")
          .addFields(
            { name: "!role add @uporabnik @role", value: "Doda role uporabniku.\n**Primer:** `!role add @Janez @Moderator`" },
            { name: "!role remove @uporabnik @role", value: "Odstrani role uporabniku.\n**Primer:** `!role remove @Janez @Moderator`" },
            { name: "!role create <ime> [#barva]", value: "Ustvari novo role.\n**Primer:** `!role create VIP #FFD700`" },
            { name: "!role delete @role / all", value: "Izbriše role ali vse role.\n**Primer:** `!role delete @VIP`\n**Primer:** `!role delete all`" },
            { name: "!role perms", value: "Pokaže seznam vseh permissions in navodila za dodajanje." },
            { name: "!role setperm @role \"PERMISSION\"", value: "Doda permission role.\n**Primer:** `!role setperm @Moderator DEAFEN_MEMBERS`" },
            { name: "!role rperm @role \"PERMISSION\" / all", value: "Odstrani permission role.\n**Primer:** `!role rperm @Moderator DEAFEN_MEMBERS`\n**Primer:** `!role rperm @Moderator all`" }
          )
          .setColor("#02B025")
          .setTimestamp()
          .setFooter({ text: `Requested by ${message.author.tag}` });

        return message.channel.send({ embeds: [helpEmbed] });
      }

      case "add": {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return sendResult(false, "Označi uporabnika in role!");
        await member.roles.add(role);
        await handleRoleAction("➕ Role dodana", `Role **${role.name}** dodana uporabniku **${member.user.tag}**\nDodajal: ${message.author.tag}`);
        break;
      }

      case "remove": {
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return sendResult(false, "Označi uporabnika in role!");
        await member.roles.remove(role);
        await handleRoleAction("➖ Role odstranjena", `Role **${role.name}** odstranjena uporabniku **${member.user.tag}**\nOdstranil: ${message.author.tag}`);
        break;
      }

      case "create": {
        const name = args[1];
        if (!name) return sendResult(false, "Vpiši ime role!");
        let colorArg = args.slice(2).find(v => /^#([0-9A-F]{6})$/i.test(v));
        const roleOptions = { name, reason: `Ustvaril ${message.author.tag}` };
        if (colorArg) roleOptions.color = parseInt(colorArg.replace("#", ""), 16);
        const role = await message.guild.roles.create(roleOptions);
        await role.setPosition(botMember.roles.highest.position - 1);
        await handleRoleAction("🆕 Role ustvarjena", `**${role.name}**\nUstvaril: ${message.author.tag}`);
        break;
      }

      case "delete": {
        const roleArg = args[1]?.toLowerCase();

        // DELETE ALL
        if (roleArg === "all") {
          const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("confirmDeleteAll").setLabel("✅ Da").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("cancelDeleteAll").setLabel("❌ Ne").setStyle(ButtonStyle.Danger)
          );

          const confirmEmbed = new EmbedBuilder()
            .setTitle("⚠️ Potrditev")
            .setDescription("Ali si prepričan, da želiš izbrisati **vse role**?\nBot bo preskočil role, ki jih ne more izbrisati.")
            .setColor("#FF5555");

          const confirmMessage = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

          const collector = confirmMessage.createMessageComponentCollector({ time: 30000 });

          collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id)
              return i.reply({ content: "To ni tvoja potrditev!", ephemeral: true });

            if (i.customId === "cancelDeleteAll") {
              await i.update({ content: "✅ Opravljeno (preklicano)", embeds: [], components: [] });
              await logAction(message.guild, "❌ Delete All Cancelled", `Uporabnik ${i.user.tag} je preklical brisanje vseh rol`, "#FF5555");
              collector.stop();
              return;
            }

            if (i.customId === "confirmDeleteAll") {
              await i.update({ components: [] });

              let deletedCount = 0;
              let skippedRoles = [];
              const roles = message.guild.roles.cache
                .filter(r => r.position < botMember.roles.highest.position && !r.managed && r.id !== message.guild.id)
                .sort((a, b) => b.position - a.position);

              for (const r of roles.values()) {
                try {
                  await r.delete(`Deleted by ${message.author.tag} via !role delete all`);
                  deletedCount++;
                } catch {
                  skippedRoles.push(r.name);
                }
              }

              await logAction(
                message.guild,
                "🗑️ Delete All Roles",
                `Izbrisal: ${deletedCount} role\nPreskočeno: ${skippedRoles.length}\nPreskočene: ${skippedRoles.join(", ")}`,
                "#FF5555"
              );

              await sendResult(true, `Izbrisano: **${deletedCount}** role\nPreskočeno: **${skippedRoles.length}** role${skippedRoles.length > 0 ? `\nPreskočene: ${skippedRoles.join(", ")}` : ""}`);
              collector.stop();
            }
          });

          collector.on("end", async () => {
            if (!confirmMessage.deleted && confirmMessage.editable)
              await confirmMessage.edit({ components: [] });
          });

          break;
        }

        // DELETE SINGLE
        const role = message.mentions.roles.first();
        if (!role) return sendResult(false, "Označi role za brisanje!");
        if (role.position >= botMember.roles.highest.position)
          return sendResult(false, `Bot ne more izbrisati role **${role.name}**`);
        await role.delete(`Deleted by ${message.author.tag} via !role delete`);
        await handleRoleAction("🗑️ Role izbrisana", `Role **${role.name}** izbrisal: ${message.author.tag}`, "#FF5555");
        break;
      }

      case "perms": {
        const permsEmbed = new EmbedBuilder()
          .setTitle("🔐 Role Permissions")
          .setDescription("Seznam Discord dovoljenj. Za dodajanje: `!role setperm @role \"PERMISSION\"`\nZa odstranjevanje: `!role rperm @role \"PERMISSION\"` ali `all`")
          .addFields(
            { name: "🛠️ Moderacija", value: "`KICK_MEMBERS`\n`BAN_MEMBERS`\n`TIMEOUT_MEMBERS`\n`MANAGE_MESSAGES`\n`MUTE_MEMBERS`\n`DEAFEN_MEMBERS`\n`MANAGE_NICKNAMES`", inline: true },
            { name: "📂 Strežnik", value: "`MANAGE_ROLES`\n`MANAGE_CHANNELS`\n`MANAGE_GUILD`\n`VIEW_AUDIT_LOG`\n`MANAGE_EVENTS`\n`MODERATE_MEMBERS`", inline: true },
            { name: "💬 Besedilo & Voice", value: "`SEND_MESSAGES`\n`READ_MESSAGE_HISTORY`\n`CONNECT`\n`SPEAK`\n`USE_VAD`\n`PRIORITY_SPEAKER`\n`STREAM`", inline: true },
            { name: "📎 Dodatno", value: "`ATTACH_FILES`\n`ADD_REACTIONS`\n`EMBED_LINKS`\n`MENTION_EVERYONE`\n`MANAGE_THREADS`\n`CREATE_PUBLIC_THREADS`\n`CREATE_PRIVATE_THREADS`\n`USE_EXTERNAL_EMOJIS`\n`USE_EXTERNAL_STICKERS`" }
          )
          .setColor("#F1C40F")
          .setTimestamp()
          .setFooter({ text: "Role Permissions • Informativni pregled" });

        return message.channel.send({ embeds: [permsEmbed] });
      }

      case "setperm": {
        const role = message.mentions.roles.first();
        if (!role) return sendResult(false, "Označi role!");
        const permRaw = args.slice(2).join(" ").replace(/"/g, "").toUpperCase();
        const perm = PERM_MAP[permRaw];
        if (!perm) return sendResult(false, `Neveljaven permission: **${permRaw}**`);
        if (role.position >= botMember.roles.highest.position)
          return sendResult(false, `Bot ne more urejati role **${role.name}**`);
        await role.setPermissions([...role.permissions.toArray(), perm]);
        await handleRoleAction("🔐 Permission dodan", `Role **${role.name}** je bil dodan permission:\n**${perm}**\nDodajal: ${message.author.tag}`);
        break;
      }

      case "rperm": {
        const role = message.mentions.roles.first();
        if (!role) return sendResult(false, "Označi role!");
        const permRaw = args.slice(2).join(" ").replace(/"/g, "").toUpperCase();
        if (permRaw === "ALL") {
          await role.setPermissions([]);
          await handleRoleAction("🗑️ Vsi permissioni odstranjeni", `Vsi permissioni role **${role.name}** so bili odstranjeni.\nOdstranil: ${message.author.tag}`, "#FF5555");
          break;
        }
        const perm = PERM_MAP[permRaw];
        if (!perm) return sendResult(false, `Neveljaven permission: **${permRaw}**`);
        const updatedPerms = role.permissions.toArray().filter((p) => p !== perm);
        await role.setPermissions(updatedPerms);
        await handleRoleAction("❌ Permission odstranjen", `Permission **${perm}** odstranjen iz role **${role.name}**\nOdstranil: ${message.author.tag}`, "#FF5555");
        break;
      }

      default:
        return sendResult(false, "Neznan podukaz za role!");
    }
  } catch (err) {
    console.error(err);
    await sendResult(false, `Prišlo je do napake: ${err.message}`);
  }
}

  // ---------------- Channel ukazi z logiranjem ---------------- LOGI DODANI
  else if (command === "channel") {
    if (!message.guild) return;

    const sub = args[0]?.toLowerCase();
    const botMember = message.guild.members.me;

    const hasPermission =
      message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels,
      ) ||
      message.author.id === message.guild.ownerId ||
      ROLE_WHITELIST.includes(message.author.id);

    if (!hasPermission) {
      return sendEmbed(
        message.channel,
        "Dostop zavrnjen",
        "Nimaš dovoljenja za upravljanje kanalov.",
        "#FF5555",
      );
    }

    const sendResult = async (success = true, text) => {
      const description = text && text.length > 0 ? text : " ";
      if (success) {
        await sendEmbed(
          message.channel,
          "✅ Opravljeno",
          description,
          "#57F287",
        );
      } else {
        await sendEmbed(message.channel, "Napaka", description, "#FF5555");
      }
    };

    // ------------------ HELP ------------------
    if (sub === "help") {
  const helpEmbed = new EmbedBuilder()
    .setTitle("📖 Channel Komande")
    .setDescription("Seznam vseh podukazov za `!channel`:")
    .addFields(
      {
        name: "!channel create <text|voice> <ime>",
        value:
          "Ustvari nov kanal (tekstovni ali glasovni).\n" +
          "**Primer:** `!channel create text splošno`",
      },
      {
        name: "!channel create category <ime>",
        value:
          "Ustvari novo kategorijo.\n" +
          "**Primer:** `!channel create category Projekti`",
      },
      {
        name: "!channel delete <#kanal | id>",
        value:
          "Izbriše izbran kanal.\n" +
          "**Primer:** `!channel delete #splošno`",
      },
      {
        name: "!channel move <#kanal | ime> <#kategorija | ime>",
        value:
          "Premakne kanal v določeno kategorijo.\n" +
          "**Primer:** `!channel move #splošno Projekti`",
      },
      {
        name: "!channel help",
        value: "Prikaže to pomoč.",
      }
    )
    .setColor("#02B025")
    .setTimestamp()
    .setFooter({ text: `Requested by ${message.author.tag}` });

  return message.channel.send({ embeds: [helpEmbed] });
}

    // ------------------ MAIN LOGIC ------------------
    switch (sub) {
      case "create": {
        const type = args[1]?.toLowerCase();

        // CREATE CATEGORY
        if (type === "category") {
          const name = args.slice(2).join(" ").replace(/"/g, "").trim();
          if (!name) return sendResult(false, "Vpiši ime kategorije!");

          try {
            const category = await message.guild.channels.create({
              name,
              type: 4, // Discord category type
              reason: `Ustvaril: ${message.author.tag}`,
            });

            await logAction(
              message.guild,
              "🗂️ Kategorija ustvarjena",
              `Ustvarjena kategorija **${category.name}**\nUstvaril: ${message.author.tag}`,
              "#00FF99",
            );

            await sendResult();
          } catch (err) {
            console.error(err);
            await sendResult(false, `Prišlo je do napake: ${err.message}`);
          }
          break;
        }

        // CREATE TEXT / VOICE CHANNEL
        if (!["text", "voice"].includes(type))
          return sendResult(
            false,
            "Določi tip kanala: `text`, `voice` ali `category`.",
          );

        const name = args.slice(2).join(" ").replace(/"/g, "").trim();
        if (!name) return sendResult(false, "Vpiši ime kanala!");

        try {
          const channel = await message.guild.channels.create({
            name,
            type: type === "text" ? 0 : 2,
            reason: `Ustvaril: ${message.author.tag}`,
          });

          await logAction(
            message.guild,
            "✅ Kanal ustvarjen",
            `Ustvarjen kanal **${channel.name}**\nUstvaril: ${message.author.tag}`,
            "#00FF99",
          );

          await sendResult();
        } catch (err) {
          console.error(err);
          await sendResult(false, `Prišlo je do napake: ${err.message}`);
        }
        break;
      }

      case "delete": {
        const channel =
          message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[1]);
        if (!channel) return sendResult(false, "Označi kanal!");

        try {
          await channel.delete(`Izbrisal: ${message.author.tag}`);

          await logAction(
            message.guild,
            "✅ Kanal izbrisan",
            `Kanal **${channel.name}** je bil izbrisan.\nIzbrisal: ${message.author.tag}`,
            "#FF5555",
          );

          await sendResult();
        } catch (err) {
          console.error(err);
          await sendResult(false, `Prišlo je do napake: ${err.message}`);
        }
        break;
      }

      case "move": {
        const channelArg = args[1];
        const categoryArg = args.slice(2).join(" ").replace(/"/g, "").trim();

        if (!channelArg || !categoryArg)
          return sendResult(
            false,
            "Uporabi: `!channel move <#kanal|ime> <#kategorija|ime>`",
          );

        // Fetch channel
        let channel =
          message.mentions.channels.first() ||
          message.guild.channels.cache.find((c) => c.name === channelArg);
        if (!channel) return sendResult(false, "Kanal ni bil najden!");

        // Fetch category
        let category =
          message.mentions.channels.last() ||
          message.guild.channels.cache.find(
            (c) => c.name === categoryArg && c.type === 4,
          );
        if (!category) return sendResult(false, "Kategorija ni bila najdena!");

        try {
          await channel.setParent(category.id, { lockPermissions: false });

          await logAction(
            message.guild,
            "📂 Kanal premaknjen",
            `Kanal **${channel.name}** je bil premaknjen pod kategorijo **${category.name}**\nPremaknil: ${message.author.tag}`,
            "#00FFFF",
          );

          await sendResult();
        } catch (err) {
          console.error(err);
          await sendResult(false, `Prišlo je do napake: ${err.message}`);
        }
        break;
      }

      default:
        await sendResult(
          false,
          "Neznan podukaz za `channel`. Za pomoč uporabi `!channel help`.",
        );
    }
  }

  // ---------------- Voice ukazi z logiranjem ---------------- LOGI DODANI
  else if (command === "voice") {
  const sub = args[0]?.toLowerCase();

  if (!ROLE_WHITELIST.includes(message.author.id))
    return sendEmbed(
      message.channel,
      "❌ Napaka",
      "Nimaš dovoljenja!",
      "#FF5555",
    );

  const sendResult = async (success = true, text) => {
    const description = text && text.length > 0 ? text : " ";
    if (success) {
      await sendEmbed(
        message.channel,
        "✅ Opravljeno",
        description,
        "#57F287",
      );
    } else {
      await sendEmbed(
        message.channel,
        "❌ Napaka",
        description,
        "#FF5555",
      );
    }
  };

  const handleVoiceAction = async (title, description, color = "#02B025") => {
    const fullDescription = `${description}\nIzvedel: ${message.author.tag}`;
    await logAction(message.guild, title, fullDescription, color);
    await sendResult(true);
  };

  try {
    switch (sub) {
      /* ================= HELP ================= */
      case "help": {
        const helpEmbed = new EmbedBuilder()
          .setTitle("📖 Voice Komande")
          .setDescription("Seznam vseh podukazov za `!voice`:")
          .addFields(
            {
              name: "!voice kick @uporabnik",
              value:
                "Odstrani uporabnika iz voice kanala.\n" +
                "**Primer:** `!voice kick @Janez`",
            },
            {
              name: "!voice move @uporabnik #kanal",
              value:
                "Premakne uporabnika v drug voice kanal.\n" +
                "**Primer:** `!voice move @Janez #Gaming`",
            },
            {
              name: "!voice mute @uporabnik",
              value:
                "Utiša uporabnika v voice kanalu.\n" +
                "**Primer:** `!voice mute @Janez`",
            },
            {
              name: "!voice unmute @uporabnik",
              value:
                "Odstrani utišanje uporabniku.\n" +
                "**Primer:** `!voice unmute @Janez`",
            },
            {
              name: "!voice deafen @uporabnik",
              value:
                "Onemogoči zvok uporabniku (deafen).\n" +
                "**Primer:** `!voice deafen @Janez`",
            },
            {
              name: "!voice undeafen @uporabnik",
              value:
                "Ponovno omogoči zvok uporabniku.\n" +
                "**Primer:** `!voice undeafen @Janez`",
            },
            {
              name: "!voice help",
              value: "Prikaže to pomoč.",
            }
          )
          .setColor("#02B025")
          .setTimestamp()
          .setFooter({ text: `Requested by ${message.author.tag}` });

        return message.channel.send({ embeds: [helpEmbed] });
      }

      /* ================= ACTIONS ================= */
      case "kick":
      case "move":
      case "mute":
      case "unmute":
      case "deafen":
      case "undeafen": {
        const member =
          message.mentions.members.first() ||
          message.guild.members.cache.get(args[1]);

        if (!member || !member.voice.channel)
          return sendResult(false, "Uporabnik ni v voice kanalu.");

        switch (sub) {
          case "kick":
            await member.voice.disconnect();
            await handleVoiceAction(
              "Voice Kick",
              `${member.user.tag} je bil odstranjen iz voice kanala.`,
            );
            break;

          case "move": {
            const channel =
              message.mentions.channels.first() ||
              message.guild.channels.cache.get(args[2]);

            if (!channel || channel.type !== 2)
              return sendResult(false, "Označiti moraš veljaven voice kanal.");

            await member.voice.setChannel(channel);
            await handleVoiceAction(
              "Voice Move",
              `${member.user.tag} je bil premaknjen v **${channel.name}**.`,
            );
            break;
          }

          case "mute":
            await member.voice.setMute(true);
            await handleVoiceAction(
              "Voice Mute",
              `${member.user.tag} je bil utišan.`,
            );
            break;

          case "unmute":
            await member.voice.setMute(false);
            await handleVoiceAction(
              "Voice Unmute",
              `${member.user.tag} ni več utišan.`,
            );
            break;

          case "deafen":
            await member.voice.setDeaf(true);
            await handleVoiceAction(
              "Voice Deafen",
              `${member.user.tag} je bil deafenan.`,
            );
            break;

          case "undeafen":
            await member.voice.setDeaf(false);
            await handleVoiceAction(
              "Voice Undeafen",
              `${member.user.tag} ni več deafenan.`,
            );
            break;
        }
        break;
      }

      default:
        await sendResult(false, "Neznan podukaz za voice!");
    }
  } catch (err) {
    console.error(err);
    await sendResult(
      false,
      `Prišlo je do napake pri voice ukazu: ${err.message}`,
    );
  }
}

  // --- timeout komanda --- LOGI DODANI
  else if (command === "timeout") {
    if (!message.guild) return;

    // Preverba whitelist/owner
    if (
      message.author.id !== message.guild.ownerId &&
      !ROLE_WHITELIST.includes(message.author.id)
    )
      return sendEmbed(
        message.channel,
        "Dostop zavrnjen",
        "Nimaš dovoljenja za uporabo tega ukaza.",
        "#FF5555",
      );

    const member = message.mentions.members.first();
    const duration = args[1]; // drugi argument je čas

    const sendResult = async (success = true, text) => {
      const description = text && text.length > 0 ? text : " ";
      if (success) {
        await sendEmbed(
          message.channel,
          "✅ Opravljeno",
          description,
          "#57F287",
        );
      } else {
        await sendEmbed(message.channel, "❌ Napaka", description, "#FF5555");
      }
    };

    if (!member) return sendResult(false, "Označi uporabnika!");
    if (!duration) return sendResult(false, "Določi čas timeouta!");

    const ms = require("ms");

    let timeMs;
    if (duration.endsWith("M")) {
      const months = parseInt(duration.slice(0, -1));
      if (isNaN(months) || months <= 0)
        return sendResult(false, "Neveljaven čas!");
      timeMs = months * 30 * 24 * 60 * 60 * 1000;
    } else {
      timeMs = ms(duration);
      if (!timeMs) return sendResult(false, "Neveljaven čas!");
    }

    try {
      await member.timeout(
        timeMs,
        `Timeout: ${duration} (nastavil ${message.author.tag})`,
      );

      const msg = `${member.user.tag} je bil postavljen v timeout za **${duration}**.`;

      // Pošlji samo opravljeno v kanal komande
      await sendResult();

      // Logiraj v log kanal z informacijami kdo je izvedel
      await logAction(
        message.guild,
        "Timeout",
        `${msg}\nNastavil: ${message.author.tag}`,
        "#57F287",
      );
    } catch (err) {
      console.error(err);
      await sendResult(
        false,
        `Prišlo je do napake pri timeoutu: ${err.message}`,
      );
    }
  }

  // --- untimeout komanda --- LOGI DODANI
  else if (command === "untimeout") {
    if (!message.guild) return;

    // Preverba whitelist/owner
    if (
      message.author.id !== message.guild.ownerId &&
      !ROLE_WHITELIST.includes(message.author.id)
    )
      return sendEmbed(
        message.channel,
        "Dostop zavrnjen",
        "Nimaš dovoljenja za uporabo tega ukaza.",
        "#FF5555",
      );

    const member = message.mentions.members.first();

    const sendResult = async (success = true, text) => {
      const description = text && text.length > 0 ? text : " ";
      if (success) {
        await sendEmbed(
          message.channel,
          "✅ Opravljeno",
          description,
          "#57F287",
        );
      } else {
        await sendEmbed(message.channel, "❌ Napaka", description, "#FF5555");
      }
    };

    if (!member) return sendResult(false, "Označi uporabnika!");

    try {
      await member.timeout(
        null,
        `Timeout odstranjen (nastavil ${message.author.tag})`,
      );

      const msg = `${member.user.tag} ni več v timeoutu.`;

      // Kanal komande: samo opravljeno
      await sendResult();

      // Log kanal: podrobnosti
      await logAction(
        message.guild,
        "Timeout odstranjen",
        `${msg}\nOdstranil: ${message.author.tag}`,
        "#57F287",
      );
    } catch (err) {
      console.error(err);
      await sendResult(
        false,
        `Prišlo je do napake pri odstranitvi timeouta: ${err.message}`,
      );
    }
  }

  else if (command === "admin") {
  if (!message.guild) return;

  // Dovoljenje: owner ali whitelist
  if (
    message.author.id !== message.guild.ownerId &&
    !ROLE_WHITELIST.includes(message.author.id)
  ) {
    return sendEmbed(
      message.channel,
      "Dostop zavrnjen",
      "Ta ukaz je na voljo samo adminom.",
      "#FF5555",
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("🛡️ Admin Komande")
    .setDescription("Seznam vseh admin/moderation ukazov:")
    .addFields(
      {
        name: "👢 Kick",
        value: "`!kick @user`\nOdstrani uporabnika iz strežnika.",
      },
      {
        name: "⛔ Ban",
        value: "`!ban @user`\nTrajno bana uporabnika.",
      },
      {
        name: "⏳ Timeout",
        value: "`!timeout @user <čas>`\nPrimeri: `10m`, `1h`, `1d`, `1M`",
      },
      {
        name: "⏱️ Untimeout",
        value: "`!untimeout @user`\nOdstrani timeout uporabniku.",
      },
      {
        name: "⚠️ Kick All",
        value: "`!kick all`\nKicka vse uporabnike (zahteva potrditev).",
      },
      {
        name: "🚫 Ban All",
        value: "`!ban all`\nBana vse uporabnike (zahteva potrditev).",
      },
    )
    .setColor("#ED4245")
    .setFooter({ text: `Opened by ${message.author.tag}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });

  // 🔹 LOG
  await logAction(
    message.guild,
    "🛡️ Admin help odprt",
    `Uporabnik **${message.author.tag}** je odprl \`!admin\` pomoč.`,
    "#ED4245",
  );

  return;
}
  else if (command === "revealchannels") {
  if (!message.guild) return;

  // 🔐 OWNER / WHITELIST ONLY
  if (
    message.author.id !== message.guild.ownerId &&
    !ROLE_WHITELIST.includes(message.author.id)
  ) {
    return sendEmbed(
      message.channel,
      "Dostop zavrnjen",
      "Ta ukaz je dovoljen samo ownerju.",
      "#FF5555"
    );
  }

  const me = message.member;
  let changed = 0;

  await sendEmbed(
    message.channel,
    "🔍 Razkrivam kanale...",
    "Dodeljujem ti dostop do vseh skritih kanalov.",
    "#FAA61A"
  );

  for (const channel of message.guild.channels.cache.values()) {
    try {
      const perms = channel.permissionOverwrites.cache.get(me.id);

      if (perms?.allow.has(PermissionsBitField.Flags.ViewChannel)) continue;

      await channel.permissionOverwrites.edit(
        me.id,
        {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: true,
          Connect: true,
          Speak: true,
        },
        { reason: `Reveal channels command by ${message.author.tag}` }
      );

      changed++;
    } catch (err) {
      console.error(`Napaka pri ${channel.name}:`, err.message);
    }
  }

  await sendEmbed(
    message.channel,
    "✅ Končano",
    `Razkritih kanalov: **${changed}**`,
    "#57F287"
  );

  // 🔹 LOG
  await logAction(
    message.guild,
    "👁️ Reveal Channels",
    `Uporabnik **${message.author.tag}** je razkril **${changed}** kanalov samo sebi.`,
    "#FAA61A"
  );

  return;
}
// ---------------- COMMAND: !warn, !warnings, !unwarn ----------------
if (command === "warn") {
  // ---------------- COMMAND: !warn help ----------------
  if (args[0]?.toLowerCase() === "help") {
    const helpEmbed = new EmbedBuilder()
      .setTitle("📖 Warn Komande")
      .setDescription("Seznam vseh podukazov za `!warn`:")
      .addFields(
        {
          name: "!warn @user <razlog>",
          value: "Doda warn določenemu uporabniku.\n**Primer:** `!warn @Janez Spam v kanalu`",
        },
        {
          name: "!warnings @user",
          value: "Prikaže vse warde uporabnika.\n**Primer:** `!warnings @Janez`",
        },
        {
          name: "!unwarn @user <št>",
          value: "Odstrani določen warn uporabniku po številki.\n**Primer:** `!unwarn @Janez 1`",
        },
        {
          name: "!warn help",
          value: "Prikaže to pomoč.",
        }
      )
      .setColor("#02B025")
      .setTimestamp()
      .setFooter({ text: `Requested by ${message.author.tag}` });

    return message.channel.send({ embeds: [helpEmbed] });
  }

  // ---------------- COMMAND: !warn ----------------
  if (
    message.author.id !== message.guild.ownerId &&
    !ROLE_WHITELIST.includes(message.author.id) &&
    !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
  )
    return sendEmbed(
      message.channel,
      "Dostop zavrnjen",
      "Nimaš dovoljenja za warnanje uporabnikov.",
      "#FF5555"
    );

  const member = message.mentions.members.first();
  if (!member)
    return sendEmbed(
      message.channel,
      "Napaka",
      "Označi uporabnika za warn!",
      "#FF5555"
    );

  const reason = args.slice(1).join(" ") || "Ni razloga";
  if (!warnings[message.guild.id]) warnings[message.guild.id] = {};
  if (!warnings[message.guild.id][member.id])
    warnings[message.guild.id][member.id] = [];

  const warnData = {
    moderator: message.author.tag,
    reason,
    timestamp: new Date().toISOString(),
  };

  warnings[message.guild.id][member.id].push(warnData);

  fs.writeFileSync("./warnings.json", JSON.stringify(warnings, null, 2));

  sendEmbed(
    message.channel,
    "⚠️ Uporabnik warnan",
    `Uporabnik **${member.user.tag}** je bil warnan.\nRazlog: ${reason}`,
    "#FFAA00"
  );

  await logAction(
    message.guild,
    "⚠️ Warn",
    `Moderator **${message.author.tag}** je warnal **${member.user.tag}**.\nRazlog: ${reason}`,
    "#FFAA00"
  );

  return;
}

// ---------------- COMMAND: !warnings ----------------
if (command === "warnings") {
  const member = message.mentions.members.first() || message.member;
  const memberWarnings = warnings[message.guild.id]?.[member.id] || [];

  if (memberWarnings.length === 0)
    return sendEmbed(
      message.channel,
      "⚠️ Warnings",
      `Uporabnik **${member.user.tag}** nima nobenih warnov.`,
      "#57F287"
    );

  const description = memberWarnings
    .map(
      (w, i) =>
        `**${i + 1}.** Moderator: ${w.moderator}\nRazlog: ${w.reason}\nDatum: ${new Date(
          w.timestamp
        ).toLocaleString()}`
    )
    .join("\n\n");

  sendEmbed(
    message.channel,
    `⚠️ Warnings za ${member.user.tag}`,
    description,
    "#FFAA00"
  );

  await logAction(
    message.guild,
    "⚠️ Pregled warningov",
    `Uporabnik **${message.author.tag}** je pregledal warne uporabnika **${member.user.tag}**.`,
    "#FFAA00"
  );

  return;
}

// ---------------- COMMAND: !unwarn ----------------
if (command === "unwarn") {
  if (
    message.author.id !== message.guild.ownerId &&
    !ROLE_WHITELIST.includes(message.author.id) &&
    !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
  )
    return sendEmbed(
      message.channel,
      "Dostop zavrnjen",
      "Nimaš dovoljenja za odstranjevanje warnov.",
      "#FF5555"
    );

  const member = message.mentions.members.first();
  if (!member)
    return sendEmbed(
      message.channel,
      "Napaka",
      "Označi uporabnika za odstranitev warna!",
      "#FF5555"
    );

  const index = parseInt(args[1]) - 1; // številka warna
  const memberWarnings = warnings[message.guild.id]?.[member.id] || [];

  if (!memberWarnings[index])
    return sendEmbed(
      message.channel,
      "Napaka",
      `Warna številka ${index + 1} ne obstaja.`,
      "#FF5555"
    );

  const removed = memberWarnings.splice(index, 1);
  fs.writeFileSync("./warnings.json", JSON.stringify(warnings, null, 2));

  sendEmbed(
    message.channel,
    "⚠️ Warn odstranjen",
    `Odstranjen warn za uporabnika **${member.user.tag}**\nRazlog: ${removed[0].reason}`,
    "#57F287"
  );

  await logAction(
    message.guild,
    "⚠️ Warn odstranjen",
    `Moderator **${message.author.tag}** je odstranil warn uporabniku **${member.user.tag}**.\nRazlog: ${removed[0].reason}`,
    "#57F287"
  );

  return;
}
  if (command === "rename") {
  const member = message.mentions.members.first();

  // Če uporabnik napiše samo !rename help
  if (args[0]?.toLowerCase() === "help") {
  const helpEmbed = new EmbedBuilder()
    .setTitle("📖 Rename Komande")
    .setDescription("Seznam vseh podukazov za `!rename`:")
    .addFields(
      {
        name: "!rename @uporabnik \"novo_ime\"",
        value:
          "Spremeni nickname uporabnika.\n" +
          "**Primer:** `!rename @Janez \"Admin Janez\"`",
      },
      {
        name: "!rename @uporabnik reset",
        value:
          "Ponastavi (resetira) nickname uporabnika.\n" +
          "**Primer:** `!rename @Janez reset`",
      },
      {
        name: "!rename help",
        value: "Prikaže to pomoč.",
      }
    )
    .setColor("#02B025")
    .setTimestamp()
    .setFooter({ text: `Requested by ${message.author.tag}` });

  return message.channel.send({ embeds: [helpEmbed] });
}

  if (!member) return sendEmbed(message.channel, "Napaka", "Označi uporabnika!", "#FF5555");

  const newName = args.slice(1).join(" ");
  if (!newName) return sendEmbed(message.channel, "Napaka", "Daj novo ime ali 'reset'!", "#FF5555");

  if (!message.guild.members.me.permissions.has("ManageNicknames"))
    return sendEmbed(message.channel, "Napaka", "Botu manjka pravica za spreminjanje imen!", "#FF5555");

  try {
    if (newName.toLowerCase() === "reset") {
      await member.setNickname(null);
      sendEmbed(message.channel, "✅ Ime resetirano", `${member.user.tag} je sedaj brez nicknamea.`, "#57F287");
    } else {
      await member.setNickname(newName);
      sendEmbed(message.channel, "✅ Ime spremenjeno", `${member.user.tag} je sedaj "${newName}".`, "#57F287");
    }

    // Pošlji log v log channel
    await logAction(message.guild, "Rename", `${message.author.tag} je spremenil nickname ${member.user.tag} na "${newName}".`);
  } catch (err) {
    console.error(err);
    sendEmbed(message.channel, "Napaka", "Nisem mogel spremeniti imena. Preveri role in pravice.", "#FF5555");
  }
}

if (command === "server") {

  // če ni noben argument ali je help
  if (!args[0] || args[0].toLowerCase() === "help") {
    return sendEmbed(
      message.channel,
      "📘 Server komande",
      "**!server help** – pokaže to pomoč\n" +
      "**!server rename \"novo_ime\"** – spremeni ime strežnika",
      "#5865F2"
    );
  }

  if (
    message.author.id !== message.guild.ownerId &&
    !ROLE_WHITELIST.includes(message.author.id) &&
    !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
  )
    return sendEmbed(
      message.channel,
      "Dostop zavrnjen",
      "Nimaš dovoljenja za odstranjevanje warnov.",
      "#FF5555"
    );

  // =====================
  // !server rename
  // =====================
  if (args[0].toLowerCase() === "rename") {

    const newName = args.slice(1).join(" ").replace(/"/g, "");
    if (!newName) {
      return sendEmbed(
        message.channel,
        "Napaka",
        "Vpiši novo ime strežnika!",
        "#FF5555"
      );
    }

    if (!message.guild.members.me.permissions.has("ManageGuild")) {
      return sendEmbed(
        message.channel,
        "Napaka",
        "Bot nima pravice Manage Server!",
        "#FF5555"
      );
    }

    try {
      const oldName = message.guild.name;
      await message.guild.setName(newName);

      sendEmbed(
        message.channel,
        "✅ Ime spremenjeno",
        `**${oldName}** ➜ **${newName}**`,
        "#57F287"
      );

      await logAction(
        message.guild,
        "Server Rename",
        `${message.author.tag} je spremenil ime strežnika iz "${oldName}" v "${newName}"`
      );

    } catch (err) {
      console.error(err);
      sendEmbed(
        message.channel,
        "Napaka",
        "Nisem mogel spremeniti imena strežnika.",
        "#FF5555"
      );
    }
  }
}
});
